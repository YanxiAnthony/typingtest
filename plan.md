# 打字数据存储改造计划

针对当前练习数据的存储链路的审查结论与改造方案。审查日期 2026-08-28，基于 `server.py`、`assets/practice-store.js`、`assets/typing-core.js`、`assets/typing-practice.js` 与 `data/typing.db` 实际内容。

## 一、现状

三层存储，职责重叠且持久性递减：

| 层 | 内容 | 持久性 |
|---|---|---|
| `localStorage` | 逐句 best WPM/准确率（`echoflow_typing_progress_v1`）、练习模式、音频进度、旧版完成次数 | 最弱，从不同步、不导出 |
| IndexedDB `echoflow-practice` | `attempts` / `baselines` / `meta`，带 `syncStatus` | 浏览器可回收 |
| SQLite `data/typing.db` | `practice_attempts` + `practice_baselines` | 唯一真正持久的 |

写入时机：`typing-practice.js:383` 检测到 `session.status === 'completed'`（输入完全等于全文）时调用 `recordPracticeCompletion()`，先写 IndexedDB 标记 `pending`，随后 `POST /api/practice/sync`；失败则保留待下次补传。同一次练习靠 `completionRecorded` 只记一次，`resetLesson` 才清零。

当前库内实际状态：`practice_attempts` 0 行，`practice_baselines` 1 行（`us/NCE1/001&002.Excuse Me`，`completed_runs=1`，来自旧版 localStorage 迁移）。`PRAGMA user_version = 0`。

架构方向（本地优先 + 幂等同步 + 关系型持久层）是合理的，UUID 主键配 `INSERT OR IGNORE` 让同步天然幂等，索引也匹配查询模式。问题集中在**记录的字段口径**和**可恢复性**上。

---

## 二、问题清单

### P0-1 逐句 `bestWpm` 用了全篇耗时，数值无意义

- **位置**：`assets/typing-practice.js:313`（`elapsedMs = metrics.elapsedMs`）→ `:328`（传给 `saveSentenceProgress`）→ `:60-61`
- **现象**：第 N 句的 WPM = 该句字符数 ÷ **整篇已用时间**，句子越靠后数字越小，与打字速度无关。同一函数里的 `bestAccuracy` 在句子判定为 complete 时恒为 100。
- **根因**：`updateSentenceStates` 只拿得到 session 级别的 `elapsedMs`，没有逐句计时。
- **影响**：`echoflow_typing_progress_v1` 里两个字段目前都是噪声，且正在持续写入。

### P0-2 完成次数口径会累积性重复计数

- **位置**：`assets/practice-store.js:212`（`baseline.completedRuns + attempts.length`）、`assets/typing-practice.js:99-107`（`saveLegacyFallbackCount`）、`assets/practice-store.js:60-84`（`migrateLegacyCounts`）
- **现象**：回退路径写回 localStorage 的是 `currentPracticeCount`，而该值**已经包含 baseline + attempts**；下次加载 `migrateLegacyCounts` 又把它并进 baseline。走一次失败路径后真实 3 次会显示成 4 次。
- **根因**：baseline 被定位成"迁移前历史基数"，却允许被运行时数据回灌；且 `migrateLegacyCounts` 迁移后不清 legacy key，每次加载重复合并。
- **影响**：偏高且**不可逆**，无法从数据反推真实值。

### P0-3 `resultAccuracy` 恒等于 100，是一列死数据

- **位置**：`assets/typing-practice.js:130`、`assets/typing-core.js:29`（`isComplete` 要求 `actual === expected`）、`:43-45`
- **现象**：完成条件就是输入完全等于全文，而准确率正是在这一刻计算，因此每条记录都是 `100.00`。已实测验证（故意打错再改对，结果仍为 100）。
- **影响**：11 列里 1 列零信息量；真正有意义的只有 `processAccuracy`。

### P1-4 同步只能单向恢复

- **位置**：`assets/practice-store.js:111`（只推送 `syncStatus === 'pending'`）
- **现象**：记录一旦标记 synced 就永不重传。SQLite → IndexedDB 能恢复（拉取分支存在），但 IndexedDB → SQLite 恢复不了。
- **影响**：删除或用旧备份覆盖 `data/typing.db` 后，浏览器里的历史永久补不回去，且无任何提示。有 `export.json` 却没有对应的 import 路径，备份只能人工读。

### P1-5 未记录课文指纹，历史跨版本不可比

- **位置**：`assets/lesson.js:22`（`lessonId = book + '/' + filename`）
- **现象**：改一次 LRC，`target_chars` 就变，但记录里没有任何版本标识。
- **影响**：WPM 曲线跨时间不可比，且无法识别"这条记录练的是旧版课文"。

### P1-6 SQLite 侧没有 schema 版本

- **位置**：`server.py:54-84`，全部 `CREATE TABLE IF NOT EXISTS`
- **影响**：以后加列在已有库上会**静默不生效**，直到代码读新列时才崩。IndexedDB 侧有 `DB_VERSION`，SQLite 侧缺对应机制。

### P2-7 只存聚合值，缺击键时间线

- **现象**：每个字符的落键时刻、错在哪个词、哪些字母组合慢——一条都没保存。
- **影响**：做不了 error heatmap、分词速度分析、进步曲线归因。而 `trackProcessInput`（`assets/typing-practice.js:163-166`）已经在逐字符判对错，落盘成本极低；一次练习几千个元组，压缩后几十 KB。

### P3 杂项

- `server.py:138`、`:203` 的 `with self.connect()` 只提交不关闭，每请求泄漏一个连接对象。
- `data/typing.db` 可被 `http://localhost:8000/data/typing.db` 直接下载（本地工具风险低，加一行路径拦截更干净）。
- `TYPING.md` 中记载的 `tests/` 目录不存在，四条验证命令与浏览器冒烟页全部跑不了。
- `server.py:87` 归一化失败的 attempt 不进 `acceptedIds`，会永远 pending 并静默重试（当前客户端保证了必填字段，属潜在问题）。

---

## 三、改造方案

### 阶段一：止血（不改 schema）

**1. 停止写入错误的逐句指标**（P0-1）

`saveSentenceProgress` 暂停写 `bestWpm`/`bestAccuracy`，仅保留 `updatedAt` 与完成标记。逐句速度指标推迟到阶段三由击键时间线派生——不再单独维护一套算不准的计时。清理一次已有的 `echoflow_typing_progress_v1` 脏值（迁移时丢弃这两个字段）。

**2. 修正完成次数口径**（P0-2）

- `migrateLegacyCounts` 改为**一次性迁移**：成功写入 baseline 后 `localStorage.removeItem(LEGACY_COUNT_KEY)`，并在 `meta` 里记 `legacyMigratedAt` 防重入。
- 移除 `saveLegacyFallbackCount` 的回写路径。`recordAttempt` 失败意味着 IndexedDB 已不可用，此时 localStorage 同样不可信；改为在 UI 上明确提示"本次记录未保存"，而不是悄悄记一个会污染总数的补偿值。
- `getLessonSummary` 保持 `baseline + attempts` 的语义，但 baseline 此后只读不写。

**3. 重定义 `resultAccuracy` 为首次通过率**（P0-3）

保留列名，改变语义（比删列的迁移代价低，且这个指标本身有价值）：

- 在 `typing-practice.js` 维护 `firstTouch = new Uint8Array(target.length)`，取值 `0=未触碰 / 1=首次即正确 / 2=首次错误`。
- 在 `trackProcessInput` 现有的逐字符循环（`:163-166`）里，仅当 `firstTouch[index] === 0` 时写入结果。
- `resultAccuracy = 首次正确数 / target.length * 100`。
- 语义变更需靠阶段二的 `schema_version` 区分新旧记录，旧记录的该列按"无效"处理。

### 阶段二：schema 与可恢复性

**4. 引入 SQLite 迁移机制**（P1-6）

用 `PRAGMA user_version` 驱动，`server.py` 里维护有序 migration 列表：

```python
MIGRATIONS = [
    # v1: 现有 practice_attempts / practice_baselines 及索引
    # v2: ALTER TABLE practice_attempts ADD COLUMN target_hash TEXT
    # v3: ALTER TABLE practice_attempts ADD COLUMN schema_version INTEGER NOT NULL DEFAULT 1
]
```

启动时读 `user_version`，逐条补齐后回写。现有库 `user_version=0` 但表已存在，v1 需写成幂等形式。

**5. 记录课文指纹**（P1-5）

- 客户端在 `echoflow:lesson-ready` 里对拼好的 `session.target` 算 SHA-256（`crypto.subtle.digest`），取 hex 前 16 位。
- attempt 增加 `targetHash` 字段，服务端落 `target_hash` 列，纳入 sync / export.json / export.csv。
- 统计与图表按 `(lesson_id, target_hash)` 分组，课文变更后另起一条曲线而非混算。

**6. 补上反向恢复**（P1-4）

不新增接口，改成自愈式对账：

- 服务端在 sync 响应里附带 `attemptCount`（该次同步后 `practice_attempts` 的总行数）。
- 客户端比对本地 IndexedDB 的 attempts 总数；若本地多于服务端，触发一次全量推送（把所有 attempts 而非仅 pending 塞进 `attempts` 数组）。`INSERT OR IGNORE` 保证重复推送无副作用。
- 全量推送后在 `meta` 记 `lastReconcileAt`，避免每次加载都全量。

### 阶段三：击键时间线（P2-7）

**7. 落盘逐击键数据**

- 存储形式：`practice_attempts.keystrokes BLOB`（gzip 压缩的紧凑 JSON），**不建单独表**——查询模式是"取某次练习的全部击键"，不需要跨练习按击键检索，单独表只会让行数无谓膨胀。
- 记录结构：`[[相对 startedAt 的 ms 偏移, 目标位置 index, 输入字符, 是否正确], ...]`，删除操作记为 `index` 为负的特殊事件。
- 采集点：`trackProcessInput` 现有的逐字符循环里直接 push，无额外遍历成本。
- 大小控制：单次练习设上限（如 20000 事件），超限则降级为只存聚合值并标记 `keystrokes = NULL`。

**8. 逐句指标改由时间线派生**

阶段一停写的 `bestWpm`/`bestAccuracy`，此时改为从 `keystrokes` 按 `ranges` 切片计算真实的逐句耗时与首次通过率，且不再写 localStorage——统一进 SQLite，随 attempt 一起持久化。

### 阶段四：清理（P3）

- `server.py` 的两处 `with self.connect()` 用 `contextlib.closing` 包一层，确保连接释放。
- `do_GET` 中拦截 `/data/` 前缀，返回 404。
- 恢复 `TYPING.md` 中记载的 `tests/` 目录，或更新文档使其与实际一致——数据口径改动多，缺回归测试风险高，建议至少补上 `typing-core` 与 `practice-server` 两组。
- `normalize_attempt` 返回 None 时记一条日志，避免静默丢弃。

---

## 四、执行顺序与理由

1. **阶段一优先**：P0-1 和 P0-2 正在持续污染数据，越晚修需要清洗的脏数据越多；P0-3 的语义变更必须在阶段二加上版本标记之前想清楚。
2. **阶段二次之**：schema 层面的改动越晚代价越大，且 P1-4 的可恢复性缺口一旦触发就是永久数据丢失。
3. **阶段三最后**：属于价值增量而非缺陷修复，且依赖阶段二的迁移机制才能安全加列。
4. **阶段四可随时穿插**，与其他阶段无依赖。

## 五、验证方式

每阶段完成后至少覆盖：

- `typing-core` 单测：完成态下的 metrics、首次通过率计算、`trackProcessInput` 的增删改场景（含 IME composition）。
- `practice-server` 单测：迁移幂等性（`user_version` 从 0/1/2 各跑一遍）、`INSERT OR IGNORE` 重复推送、全量对账推送。
- 端到端：完整打完一课 → 检查 `data/typing.db` 中 attempt 各字段是否符合预期口径 → 删库重启 → 确认对账机制把 IndexedDB 的历史推回 SQLite。
- 回归：断开服务端完成一次练习，确认记录留在 pending 且 UI 提示正确，重启服务端后自动补传且完成次数**不多加**。
