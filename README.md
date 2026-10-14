# Kingshot Assistant

[在线使用 / Open app](https://link6.github.io/kingshot-assistant/)

中文 / English 界面的集结同步与王城补兵计时工具。所有计算和输入都保存在设备本地，无需账号。

- **集结同步**：填写每位车头的准备时长与行军时间，自动倒推出各自发起时间，让多队同时到达。
- **王城补兵**：在游戏倒计时与输入一致时点“记录现在”，自动计算相邻敌方攻击之间的出征窗口，扣除自己的行军时间和边界余量。
- **语言切换**：切换中文与英文不重置当前计时。刷新只恢复输入，需要重新记录战况。
- **补兵实时校准**：记录后显示每队集结与行军倒计时，集结结束自动转为行军。用 `−1 / −0.1 / +0.1 / +1 秒` 分别微调两阶段，立即更新攻击到达和补兵窗口，不重置已走过的时间。集结结束后只调整行军；上方输入保留用于下次重新记录。
- **桌面版**：Electron 共用网页代码，增加窗口置顶、精简小窗、窗口位置记忆和后台系统提醒。睡眠恢复后清除实战计时，避免过期提示。

## 本地运行

网页没有第三方运行依赖。安装 Node.js 24 后：

```sh
npm start
npm test
```

打开 http://localhost:4173 。也可直接打开 `dist/index.html`；离线缓存功能需要 HTTP/HTTPS。

## 桌面开发与打包

```sh
npm ci
npm run desktop
npm run dist:win
# 在相应平台运行：npm run dist:mac / npm run dist:linux
```

Electron 首次启动/打包需要下载官方运行时。成品输出至 `desktop-release/`。Windows 提供安装版和便携版；macOS 提供 DMG；Linux 提供 AppImage。当前构建未配置代码签名、macOS 公证和自动更新。

GitHub Actions 的 **Build desktop apps** 可手动运行，在三个平台分别打包并上传构建产物。下载该次运行的 `desktop-*` artifacts。

## GitHub Pages

仓库 Settings → Pages → Source 选择 GitHub Actions。推送到 `main` 会先运行计算测试，再部署 `dist/`。资源路径、缓存和本地存储兼容 `/kingshot-assistant/` 项目路径。首次在线加载完成后支持离线网页。

## 使用边界

本工具依据手动录入读数计算，不读取或操作游戏。设备时钟、网络、游戏与手动操作延迟会影响实际结果；边界余量不构成到达保证。网页实战时请保持前台，后台或锁屏可能延迟提醒；提示声音只针对当前显示的工具。桌面提醒还受系统通知设置影响。不同设备、域名和桌面应用的数据不自动同步。

补兵规则当前按“援军在两次敌方攻击之间到达王城”实现，参考原工具说明，尚需真实游戏验证。

## English

A local-first timing assistant with Chinese and English UI. Coordinate rally leaders to arrive together, or calculate when to send reinforcements between consecutive enemy attacks. Enter the game countdown and click **Record now** when it matches. Language changes preserve active timestamps; reloading keeps drafts but clears live battle records.

Use Node.js 24: `npm start` for the dependency-free website, `npm test` for calculation tests, and `npm ci` then `npm run desktop` for Electron. Build with `dist:win`, `dist:mac`, or `dist:linux` on the corresponding OS. GitHub Actions builds all three platforms. Packages are currently unsigned and have no automatic update channel. Keep the browser in front during battle; timing depends on accurate input and game latency.
