# OPUS

<p align="center">
  <img src="docs/poster.jpg" alt="OPUS — 自由轨道音游" width="100%">
</p>

**OPUS** 是一款自由轨道下落式音游。音符的横向位置由音高决定——低音在左、高音在右——没有固定的轨道框。你可以导入自己的歌，在设备上自动生成谱面，也可以边听边录、边玩边改。

现已开源，提供 Android 与 Windows 安装包。

**[⬇️ 下载最新版](https://github.com/ZHFred/opusgame/releases/latest)**

## 特性

- **自由轨道**：必须按到音符所在位置。支持点按、长按，以及金色菱形滑键。键盘可用 `A`–`;` 十个键位。
- **四首内置曲**：OPUS、Claude 标准、Claude 专家、Sonnet（AI 原创）。内置谱面在构建时有校验锁定。
- **导入歌曲**：在本地分析音频并自动生成可玩谱面（专家 / 资深玩家两档），可选手符颜色，可选长按与滑键。无需服务器。
- **实时创作**：导入音频后在空谱面上演奏录谱；短按=短键，长按=长键。最多 6 轮分层录制（例如先录旋律再补伴奏），冲突音符会自动横向错开。
- **实时改谱**（v5.7）：原谱以半透明幽灵音符显示。删除模式与生成模式分开，避免误触。支持撤销、暂停、倍速 0.5–1.0×、拖动进度条。保存为新曲，原曲不会被改掉。
- **谱面编辑器**：导入曲和自创曲可在游戏内修改——拖动音符、增减、改类型/宽度、长键尾拖、恢复原谱。
- **最高分记录**：每首歌独立记录分数、准确率、评级、最大连击和 FULL COMBO。
- **离线可玩**：Android 带触觉反馈；Windows 便携版双击即玩。

## 截图

<p align="center">
  <img src="docs/pitch-is-position.jpg" alt="音高即落点" width="48%">
  <img src="docs/claude-track.jpg" alt="内置曲 Claude" width="48%">
</p>
<p align="center">
  <img src="docs/live-rechart.jpg" alt="实时改谱" width="48%">
  <img src="docs/windows.jpg" alt="Windows 桌面版" width="48%">
</p>

## 下载与安装

请到 **[Releases](https://github.com/ZHFred/opusgame/releases/latest)** 下载安装包。

### Android

1. 下载 `OPUS-v5.7-Android.apk` 并安装。
2. 若系统拦截：打开设置，允许来自此来源（文件管理器或浏览器）安装未知应用。
3. 覆盖安装即可更新（签名相同，版本号递增）。

### Windows

1. 下载 `OPUS-v5.7-Windows-x64.zip`，解压后双击 `OPUS.exe`。这是便携版，无需安装。
2. 首次启动若被 Windows SmartScreen 拦截：点「更多信息 → 仍要运行」。
3. 存档、导入的歌曲和最高分保存在 `OPUS.exe` 旁边的 `data/` 文件夹。把整个文件夹拷到另一台 Windows 10/11 电脑即可继续玩。
4. 右下角悬浮「全屏」按钮或按 `F11` 切换全屏；`F12` 打开开发者工具（排错用）。

## 网页版（本地运行）

游戏源码在 [`web/`](web/) 目录，是单页 HTML5 canvas 应用。

```bash
cd web
python -m http.server 8080
```

然后用浏览器打开 <http://127.0.0.1:8080>。

请不要直接双击 `index.html`：以 `file://` 打开时，浏览器会因 CORS 拦截音频。也可以把 `web/` 部署到 Cloudflare Pages、Vercel、Netlify 或 GitHub Pages 等静态托管（需要 HTTPS）。更多说明见 [`web/README.txt`](web/README.txt)。

## 黄昏庭 · 细体素庭院

新增独立的实时三维微缩景观，不替换原音游。启动上面的静态服务后打开 **<http://127.0.0.1:8080/garden/>**。

![黄昏庭实机画面](docs/garden-preview.jpg)

木屋、层叠瓦顶、紫藤、纸鹤、茶桌橘猫、樱枫竹林、鸟居、拱桥锦鲤池与竹筒水钵均由小体素程序化构建；原生 WebGL2 渲染，无运行时第三方依赖。拖拽旋转、滚轮缩放、右键/双指平移，`R` 复位、空格漫游、`P` 保存画面、`H` 隐藏界面。移动端支持触控；系统开启“减少动态效果”时默认暂停场景动画。

开发验证（Node.js 22+，Python 3）：

```bash
npm ci
npm test
npm run typecheck
npm run build        # 将完整 web/ 复制为可部署的 dist/
npm run serve        # http://127.0.0.1:8080/garden/
# 另一个终端；需安装 Chrome（或用 CHROME_PATH 指定 Chromium）
npm run test:browser # 真实 WebGL2 / 交互 / 回退检查及 artifacts/ 下的桌面、移动端截图
```

架构、分阶段方案、恢复过程与审查记录见 [docs/voxel-garden.md](docs/voxel-garden.md)。庭院需通过 HTTP(S) 访问，不能直接以 `file://` 打开；Electron 离线单文件打包不包含这个独立页面。已有 OPUS PWA 的 cache-first 缓存策略未改变，更新部署后若仍见旧版，可在浏览器开发工具清理该站点缓存后重新载入。

## 仓库结构

```
web/        游戏源码（页面、内置音频、PWA 与 Service Worker）
desktop/    Windows Electron 外壳（主进程、预加载、图标）
docs/       海报与截图
LICENSE     MIT
```

Android / Windows 安装包放在 Releases，不提交进 Git。签名密钥（`.jks` / `.keystore`）也不要放进仓库。

## 许可证

本项目采用 [MIT License](LICENSE) 开源。Copyright © 2026 ZHFred。

内置曲目为项目附带的原创音乐，随本仓库一并按 MIT 许可提供。导入你自己的音频时，请确保你有权使用这些音频。

---

## English

OPUS is a **free-lane falling rhythm game**: a note's pitch maps to its horizontal position (low on the left, high on the right). There are no fixed track frames. It ships four built-in tracks (OPUS, Claude Standard, Claude Expert, Sonnet), can import any audio and generate a playable chart entirely on-device, and includes live recording, live re-charting, and an in-game chart editor.

- **Download** Android and Windows builds from [Releases](https://github.com/ZHFred/opusgame/releases/latest).
- **Android:** allow installs from unknown sources if prompted.
- **Windows:** portable zip — unzip and run `OPUS.exe`. If SmartScreen appears, choose *More info → Run anyway*. Saves live in a `data/` folder next to the exe.
- **Web:** serve the `web/` directory over HTTP (for example `python -m http.server` inside `web/`). Opening `index.html` via `file://` will block audio.

Licensed under the [MIT License](LICENSE). Copyright © 2026 ZHFred.
