# Codex / ChatGPT 悟空开屏动画（Windows）

给 Windows 官方 Codex / ChatGPT 桌面应用添加 **约 12 秒的应用内开屏动画**，播放完后让动态壁纸继续显示在聊天区域。主标题为 `Chat GPT`。

这是一个非官方、实验性的界面定制项目。应用打开后才接入动画，不保证聊天界面首次显示前完成接入；不修改官方安装包。适配依赖内部页面结构，应用更新后可能需要调整。

## 效果与行为

- 黑底 → 蓝色发光轮廓扫描 → 动态角色显现 → 左侧标题 → 淡入聊天背景。
- 开屏覆盖整个应用网页内容区域，包括左侧对话栏；不包含 Windows 原生标题栏，不改变窗口大小。
- 动画结束后，侧栏恢复原色，背景限定在聊天列；输入框、代码块等保留可读底色。
- 视频元素独立于单个聊天页面；切换历史聊天时保留视频进度。
- 每个新窗口自动开屏一次；刷新页面只恢复背景。
- 没有可见的重播、跳过、恢复按钮，保留键盘和外部恢复入口。

**仓库不包含第三方悟空视频、壁纸工程、官方图标或私人聊天截图。** 需要自行准备 `assets/goku-loop.mp4`。不使用悟空素材也能复现同一套流程，只需提供自己的视频。

## 1. 环境要求

- Windows 10/11，当前用户已安装 Microsoft Store / MSIX 版官方应用，包名 `OpenAI.Codex`。
- Windows PowerShell、Windows Script Host（桌面图标入口使用 `wscript.exe`）。
- 官方包包含 `app/ChatGPT.exe` 和 `app/resources/cua_node/bin/node.exe`。
- GPU / WebGL 与 H.264 视频解码可用。
- 本地浏览器预览可使用系统 Node.js 22+；集成启动器目前要求官方包内置 Node，不使用系统 Node 回退。

本项目没有 npm 依赖，也不需要 `npm install`。只在准备或转码素材时需要 FFmpeg。

已测试包：`OpenAI.Codex_26.1007.2314.0_x64__2p2nqsd0c76g0`，内部版本 `26.1007.21434`。其他发行渠道、macOS、Linux 未适配。

## 2. 获取代码和素材

```powershell
git clone https://github.com/Cyrus-0704/codex-goku-startup-animation.git
cd codex-goku-startup-animation
```

也可以在 GitHub 点击 **Code → Download ZIP**，解压到固定目录。安装快捷方式后不要随意移动该目录。

### 复现本地悟空版本

原始素材来自 Wallpaper Engine 创意工坊项目 `3439838314`，是实时场景 `scene.pkg`，不是现成视频。准备方法：

1. 在自己的 Wallpaper Engine 中打开该壁纸，使用独立预览窗口播放。
2. 用 OBS 等工具捕获预览窗口，裁掉窗口边框，关闭鼠标捕获和音频，不录入桌面图标。
3. 以 1920×1080、60fps 录制至少 15 秒。原工程保持不变。
4. 将录制文件转换为静音 H.264 MP4，保存到本仓库的指定路径。

例如，已安装 FFmpeg 时：

```powershell
ffmpeg -i recording.mkv -t 15 -an -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black,fps=60" -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -movflags +faststart assets/goku-loop.mp4
```

录制过程中如何隐藏桌面元素取决于录制软件；上述命令只负责转码，不会自动去掉已经录进视频的图标或窗口边框。

### 使用自己的视频

将有权使用的横屏视频命名为 `assets/goku-loop.mp4`。推荐静音 H.264、yuv420p、16:9。播放器自动循环，视频本身不必精确等于开屏的 12 秒。当前构图为右侧角色、左侧标题，换素材后可能需要调整 shader 的缩放和偏移，不能保证任意视频直接获得相同构图。

不要将第三方壁纸素材的使用许可理解为再分发许可。仓库忽略视频文件；请自行获取、录制并仅在许可范围内使用。

## 3. 先预览，再接入

### 浏览器预览

双击 `Preview.cmd`。它在 `127.0.0.1` 随机端口开启本地服务器并打开浏览器，可切换模拟的新聊天、历史和项目页面。关闭服务器控制台即停止预览。

也可以手动运行：

```powershell
node preview-server.mjs
```

不要直接双击 `index.html` 作为验收方式；请使用本地 HTTP 预览。没有视频时预览会报素材加载错误。

### 检查安装环境

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Launch.ps1 -CheckOnly
```

该命令只检查包、可执行程序和运行时是否存在，不代表完整冷启动已验证，也不会检查视频是否能解码。

### 集成到官方应用

1. 保存未发送的内容，通过应用菜单完全退出官方应用；只关闭窗口可能仍有后台进程。
2. 双击 `Start-ChatGPT.cmd` 做第一次启动，控制台可以显示错误。
3. 确认动画与聊天背景正常后，运行 `Install-Desktop-Icon.cmd`。
4. 之后完全退出应用，再双击桌面的 **ChatGPT** 图标即可通过启动器启动。

安装器会备份已有的桌面 `ChatGPT.lnk`，并把该快捷方式接到隐藏启动器，同时从本机安装的应用提取图标。它不会修改开始菜单或旧任务栏固定入口，也不会修改其他名字的桌面快捷方式。安装记录及原图标备份存放在本机 `local-state/`。

若应用已经在运行但没有调试端口，启动器会提示完全退出，不会强制结束进程。桌面图标仍由 VBS/PowerShell 在后台调用启动器，用户不需要双击 VBS 文件。

## 4. 恢复和卸载

| 操作 | 作用 |
| --- | --- |
| 开屏时按 `Esc` | 提前结束开屏，保留聊天背景 |
| 按 `Ctrl+Alt+B` | 恢复外观，并通知维护进程停止本次自动接入 |
| 双击 `Restore.cmd` | 从外部恢复所有已接入窗口，移除刷新注入脚本并停止辅助进程 |
| 双击 `Restore-Desktop-Icon.cmd` | 恢复原桌面快捷方式；不会结束正在运行的动画会话 |

完整卸载顺序：`Restore.cmd` → `Restore-Desktop-Icon.cmd` → 完全退出应用 → 删除项目目录。没有活动动画会话时，Restore.cmd 提示无会话可忽略。若桌面快捷方式在安装后被其他程序改过，恢复脚本会拒绝覆盖；原备份仍位于 `local-state/ChatGPT.original.lnk`。

启动时会启用仅监听本机的调试端口；恢复外观不会关闭官方进程的调试端口，完全退出应用并通过恢复后的原图标启动才结束这种启动模式。

## 5. 实现原理

```text
桌面 ChatGPT.lnk
  → wscript.exe / Start-ChatGPT.vbs（隐藏窗口）
  → Launch.ps1
  → IApplicationActivationManager 激活官方 MSIX 应用
     附带 127.0.0.1 调试端口参数
  → controller.mjs 校验进程并通过 CDP 接入主页面
  → renderer.js 创建开屏层和聊天背景层
```

### 启动和连接

`Launch.ps1` 动态查找当前安装版本，不写死 WindowsApps 的版本目录。通过 Windows 的应用激活接口启动 MSIX 应用，保留应用身份；已经有符合条件的调试实例时复用它。

`Verify-Port.ps1` 检查监听地址为 `127.0.0.1`、端口归属 PID、可执行文件路径、命令行和当前用户。`cdp.mjs` 使用 WebSocket 实现最小 CDP 请求客户端。

`controller.mjs` 每秒发现主窗口，只接入 `app://-/index.html` 类型的受支持页面。首次接入窗口传入 `intro:true`，通过 `Page.addScriptToEvaluateOnNewDocument` 为刷新注册 `intro:false` 的恢复脚本。后台或隐藏页面等待可见后安装。

辅助进程提供带随机令牌的本机恢复端点；状态保存于 `session.json`。该文件含本机进程信息和恢复令牌，不应上传或分享。

### 两层画面与生命周期

`renderer.js` 创建一个持久 video 元素和两个 WebGL canvas：

- 开屏层挂在 `document.documentElement`，使用手动 popover 进入顶层，以视口尺寸覆盖应用内容；播放期间设置 body.inert，结束后恢复交互和焦点。
- 背景层挂在当前可见的 `[data-app-shell-main-surface]` 中，再根据 `.thread-scroll-container` 限定聊天列，避免覆盖侧栏和右侧面板。
- MutationObserver / ResizeObserver 及周期检查重新定位聊天容器。视频元素不会随聊天容器销毁，切换聊天时继续使用同一播放进度。
- 针对布局背景添加透明样式，并为输入框、代码块、菜单等保留底色。这些内部选择器是版本兼容性的主要风险点。

### 蓝色轮廓与转场

片元着色器对视频亮度做近似 Sobel 边缘检测，得到蓝色发光轮廓，再按时间进行扫描显现和原图混合。它不需要额外的角色分割模型，检测的是画面亮度边缘，因此背景杂乱的素材也会产生轮廓。

当前时间线：

- 约 0.45 秒开始轮廓扫描；
- 3.8～6.6 秒从轮廓混合到原视频；
- 6.5～8.4 秒显示左侧标题；
- 10.5～12 秒淡出开屏，露出聊天背景。

开屏按 requestAnimationFrame 绘制，背景限制到约 30fps；实际帧率受设备和应用负载影响。15 秒视频循环与 12 秒开屏时间线彼此独立。

### 失败恢复

素材加载超时、解码或渲染失败时会移除已创建的层并恢复交互。管理模式下超过约 15 秒未收到辅助进程心跳也会恢复。用户主动恢复会设置本次会话禁用标记，同时停止控制器并撤销刷新注入，避免恢复后马上又出现背景。系统开启减少动画时跳过开屏并暂停视频。

## 6. 定制位置

| 内容 | 文件 / 位置 |
| --- | --- |
| 素材 | `assets/goku-loop.mp4` |
| 标题 | `controller.mjs` 的 config.title 和 `preview.js` 的 title |
| 总时长 | `renderer.js` 中 duration；同时调整 render() 和 shader 中的时间常量 |
| 轮廓颜色、强度、扫描 | `renderer.js` 的 fragment shader |
| 角色位置、缩放 | shader 中 zoom、span、q 的计算 |
| 背景亮度 | shader 中 ambient 的颜色混合 |
| 标题位置与字号 | introShadow 中的 .brand、h1 样式 |
| 应用版本适配 | visibleMain()、chatBounds()、透明样式与 cdp.mjs 中的页面筛选 |

修改代码前先用 Preview.cmd 检查画面，然后重新启动集成。预览的模拟页面通过并不能证明当前官方版本的 DOM 适配正确。

## 7. 卡顿及常见问题

**启动时为什么会卡顿？** 应用初始化、视频解码、每帧视频纹理上传和 Sobel 轮廓运算同时发生，可能争用 CPU/GPU。60fps 素材不保证实时渲染达到 60fps。目前没有性能基准，也没有承诺无卡顿。可在自己副本中尝试 30fps 或较低分辨率素材，比较后再替换；仓库保持现有动画逻辑，未做性能优化。

**没有动画？** 检查视频路径和格式，确认通过本项目入口启动、应用此前已经完全退出、系统没有开启减少动画。查看 Start-ChatGPT.cmd 的控制台和生成的 launcher.log。

**聊天切换后背景失效？** 应用更新可能改变内部容器选择器；记录包版本，检查 visibleMain() 与 chatBounds()。不要因为浏览器预览正常就认定官方集成正常。

**恢复脚本找不到会话？** 当前可能没有运行中的辅助进程，或会话已自动清理。使用 Ctrl+Alt+B；如仍有问题，完全退出应用，并从恢复后的原图标重新启动。

**应用启动后先露出界面？** 这是当前实现的时序：先打开应用，再通过 CDP 接入。没有修改官方包或使用独立开屏窗口，也没有实现首帧之前可靠拦截。

## 8. 验证状态

详细记录见 [VERIFICATION.md](VERIFICATION.md)。已经在隔离实例验证全内容区覆盖、动画结束释放交互、历史切换、刷新不重复播放、恢复、素材失败及失联回滚。

正式 MSIX 冷启动外部录屏、最新版本完整长对话滚动/输入/项目切换和多窗口恢复尚未全部完成。本项目目前应视为可复现实验，不能视为所有版本通用的插件。

## 仓库内容与素材权属

仓库只包含启动器、渲染和预览源码、安装/恢复脚本及文档。运行日志、会话令牌、快捷方式备份、视频、截图和提取的官方图标均不提交。官方图标仅在安装脚本运行时从使用者本机提取。

这是非官方个人项目，与 OpenAI、Wallpaper Engine 或相关角色权利人无隶属关系。第三方素材不属于本项目；仓库暂未指定代码开源许可证，公开可见不等同于授予任意再许可权利。
