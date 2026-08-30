# 听写与跟打

这是一个纯本地个人学习工具，课程详情页包含两个练习区：

- `音频 + 文字`：点击句子播放对应片段，也可以通过底部播放器播放整课音频。
- `文字 + 打字`：完整课文加载到固定高度的原文框，在一个输入框中保留原文换行连续跟打，并显示 WPM、准确率、用时和进度。
- 每课会记录全文完成次数、WPM、用时、最终准确率、过程准确率和正确/错误击键数；未完成全文或在同一次练习中反复修改，不会增加记录。

课程页顶栏的循环设置分为两个互相独立的控件：

- `单句播完`：控制点击某个句子（含跟打区的“播放当前句”）播完后的行为——`暂停`、`单句循环` 或 `自动下一句`。
- `整课播完`：控制底部播放器整课播放到结尾后的行为——`停止`、`整课循环` 或 `多课循环`。
  选择 `多课循环` 后在弹出框中输入要循环的课号，支持 `1,3`、`1-3`、`3-1` 等混合写法；课号按当前分组（NCE1–NCE4、我的导入）内的排序编号，与首页课程卡片的序号一致。整课播完会自动跳到队列中的下一课从头续播，到队尾回到队首；队列只有当前一课时等价于整课循环。课号配置按分组分别保存在本机，切换分组互不影响。

播放过程中，底部播放器左上角会显示当前实际生效的循环徽标：`单句循环`、`自动连播`、`整课循环` 或 `多课循环`，暂停或播完即隐藏。

多课循环只作用于底部播放器的整课播放；跳课时页面会整页刷新，跟打练习进行中请先完成或主动放弃当次进度。

## 本地启动

可以直接双击 `C:\Project\NCE_STADY\start.bat`。启动器会运行 `server.py`，同时提供静态页面和 SQLite 同步接口。如果默认的 8000 端口被旧项目占用，启动器会自动选择 8001–8010 中的可用端口。

或者在命令行中运行：

在 `C:\Project\NCE_STADY` 目录运行：

```powershell
python server.py --port 8000
```

浏览器访问：

```text
http://localhost:8000/
```

`C:\Project\NCE_STADY\NCE` 中的 NCE1–NCE4 会作为默认课程自动显示，无需导入，也不会把 619 MB 音频重复复制到浏览器。点击“导入其他资源”可以添加其他同名 `.mp3 + .lrc` 材料，额外材料保存在当前浏览器的 IndexedDB 中。

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

## Android 离线 APK

项目带有一个不依赖 Python 服务的 Android WebView 工程。APK 会内置 `NCE` 目录中的全部音频和字幕，练习历史保存在手机 WebView 的 IndexedDB 中。

在 Windows 中双击：

```text
build-android.bat
```

构建结果：

```text
EchoFlow-debug.apk
```

构建脚本会自动把 Gradle 产物复制到项目根目录并覆盖这个交付文件，不需要进入 `android/app/build` 查找。

把 APK 复制到安卓手机后允许“安装未知应用”即可安装。首次构建会在 `android/app/build` 中复制约 619 MB 课程资源，因此需要预留至少 2 GB 磁盘空间。

### 固定应用签名

Debug 和 Release 构建均使用以下两个本地文件固定签名：

- `android/typing.keystore`
- `android/keystore.properties`

这两个文件已被 `.gitignore` 排除，必须一起单独备份，不能只保留 APK。丢失密钥后，新 APK 将无法覆盖安装旧版本，只能卸载应用；卸载会清除手机上保存在 WebView IndexedDB 中的练习历史。

`build-android.bat` 会在固定密钥缺失时停止构建，避免意外生成签名不同的升级包。发布新版时保持 `applicationId` 不变，并递增 `android/app/build.gradle` 中的 `versionCode` 和 `versionName`。
