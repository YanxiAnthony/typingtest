# 听写与跟打

这是一个纯本地个人学习工具，课程详情页包含两个练习区：

- `音频 + 文字`：点击句子播放对应片段，也可以通过底部播放器播放整课音频。
- `文字 + 打字`：完整课文加载到固定高度的原文框，在一个输入框中保留原文换行连续跟打，并显示 WPM、准确率、用时和进度。
- 每课会记录全文完成次数、WPM、用时、最终准确率、过程准确率和正确/错误击键数；未完成全文或在同一次练习中反复修改，不会增加记录。

课程页顶栏的循环设置分为两个互相独立的控件：

- `单句播完`：控制点击某个句子（含跟打区的“播放当前句”）播完后的行为——`暂停`、`单句循环` 或 `自动下一句`。
- `整课播完`：控制底部播放器整课播放到结尾后的行为——`停止` 或 `整课循环`。

播放过程中，底部播放器左上角会显示当前实际生效的循环徽标：`单句循环`、`自动连播` 或 `整课循环`，暂停或播完即隐藏。

## 本地启动

可以直接双击 `C:\Project\typing\start.bat`。启动器会运行 `server.py`，同时提供静态页面和 SQLite 同步接口。

或者在命令行中运行：

在 `C:\Project\typing` 目录运行：

```powershell
python server.py --port 8000
```

浏览器访问：

```text
http://localhost:8000/
```

`C:\Project\typing\NCE` 中的 NCE1–NCE4 会作为默认课程自动显示，无需导入，也不会把 619 MB 音频重复复制到浏览器。点击“导入其他资源”可以添加其他同名 `.mp3 + .lrc` 材料，额外材料保存在当前浏览器的 IndexedDB 中。

练习历史首先写入浏览器 IndexedDB，并自动同步到 `data/typing.db`。SQLite 服务暂时不可用时，记录会留在 IndexedDB，之后启动项目时自动补同步。旧版 `localStorage` 中的完成次数会作为历史基数自动迁移。

备份下载接口：

- `http://localhost:8000/api/practice/export.json`：完整 JSON 备份。
- `http://localhost:8000/api/practice/export.csv`：可直接使用 Excel 打开的练习明细。

进入任意课程后，可通过课文标题下方的两个标签切换练习区。跟打练习会完整加载英文课文、保留 LRC 原文换行，并使用一个输入框从头到尾连续输入；原文框会跟随当前字符滚动，点击句子可播放对应 LRC 片段。

## 验证

```powershell
node tests/default-library.test.js
node tests/lesson-core.test.js
node tests/typing-core.test.js
python tests/practice-server.test.py
```

浏览器冒烟测试页：

```text
http://localhost:8000/tests/typing-browser-smoke.html
```
