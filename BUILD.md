# 泡泡龙 — 从改名字、换图标到打出 APK（完整流程）

项目路径：`D:\Projects\paopaolong-elder`

本文按顺序说明：**改应用名 → 换图标 → 同步游戏代码 → 打包 APK → 装到手机**。

---

## 一、准备工具（只需做一次）

### 1. 安装 Node.js

- 打开 https://nodejs.org/ 下载 **LTS** 版本并安装  
- 安装后打开 **PowerShell**，输入下面命令，能显示版本号即成功：

```powershell
node -v
npm -v
```

### 2. 安装 Android Studio

- 打开 https://developer.android.com/studio 下载并安装  
- 第一次启动选 **Standard（标准）** 安装，会自动装好 Java 和 Android SDK  
- 首次打开项目时若提示下载组件，点 **Accept / 同意** 并等待完成  

---

## 二、改应用名称（手机桌面显示的名字）

需要改 **两处**（改一处可能不同步）：

### 方式 A：改 Capacitor 配置（推荐，以后 `cap sync` 会同步）

打开文件：`D:\Projects\paopaolong-elder\capacitor.config.json`

```json
{
  "appId": "com.paopaolong.elder",
  "appName": "泡泡龙",
  ...
}
```

把 `"appName"` 改成你想要的名字，例如 `"奶奶泡泡龙"`。

### 方式 B：改 Android 原生字符串

打开文件：`D:\Projects\paopaolong-elder\android\app\src\main\res\values\strings.xml`

```xml
<string name="app_name">泡泡龙</string>
<string name="title_activity_main">泡泡龙</string>
```

两处都改成同一个名字。

### （可选）改浏览器 / 网页标题

打开 `www\index.html`，修改：

```html
<title>泡泡龙</title>
```

以及首页大标题 `<h1 class="title">泡泡龙</h1>`。

---

## 三、更换应用图标

### 推荐：用 Android Studio 图形工具（最简单）

1. 准备一张 **正方形** 图片（建议 **1024×1024** 像素，PNG，背景尽量简洁）  
2. 打开 Android Studio，打开项目：`D:\Projects\paopaolong-elder\android`  
3. 左侧切到 **Project** 视图  
4. 展开 `app → src → main → res`，**右键 `res` 文件夹**  
5. 选择 **New → Image Asset**  
6. **Icon Type** 选 **Launcher Icons (Adaptive and Legacy)**  
7. **Foreground Layer** → **Path** 选你的图片  
8. 可调整 **Resize** 滑条，让图案大小合适  
9. **Background Layer** 可改背景色（例如紫色 `#5a2898` 与游戏风格一致）  
10. 点 **Next → Finish**  
11. Android Studio 会自动生成各尺寸图标到 `mipmap-*` 文件夹  

### 改完图标后

无需手动复制文件，直接进行后面的 **同步** 和 **打包** 即可。

---

## 四、改版本号（可选，发新版时用）

打开：`D:\Projects\paopaolong-elder\android\app\build.gradle`

找到：

```gradle
versionCode 1        // 整数，每次发新版 +1（如 2、3、4…）
versionName "1.0"    // 显示给用户的版本号（如 "1.1"）
```

---

## 五、改包名 / 应用 ID（可选，一般不用改）

当前包名：`com.paopaolong.elder`

若要修改（例如上架应用商店且不能与别家重复）：

| 文件 | 改什么 |
|------|--------|
| `capacitor.config.json` | `"appId"` |
| `android/app/build.gradle` | `applicationId` 和 `namespace` |
| `android/app/src/main/res/values/strings.xml` | `package_name`、`custom_url_scheme` |

改包名后建议在 Android Studio 里 **Build → Clean Project**，再重新打包。  
**新手建议保持默认，不要改包名。**

---

## 六、每次改完游戏代码后：同步到 Android

只要改过 `www` 文件夹里的 HTML / JS / CSS，打包前必须先同步：

```powershell
cd D:\Projects\paopaolong-elder
npx cap sync android
```

看到 `Sync finished` 即表示最新游戏已拷进 Android 工程。

> 若还没装过依赖，先执行一次：`npm install`

---

## 七、打包 APK（调试版，可直装手机）

### 步骤 1：用 Android Studio 打开工程

1. 启动 **Android Studio**  
2. **File → Open**  
3. 选择文件夹：**`D:\Projects\paopaolong-elder\android`**（注意是 `android` 子文件夹）  
4. 等待底部 **Gradle Sync** 完成（第一次可能 5～15 分钟）  

### 步骤 2：生成 APK

1. 菜单 **Build → Build Bundle(s) / APK(s) → Build APK(s)**  
2. 等待编译（首次约 3～10 分钟）  
3. 右下角弹出 **APK(s) generated successfully**，点 **locate**  

### 步骤 3：找到 APK 文件

默认路径：

```
D:\Projects\paopaolong-elder\android\app\build\outputs\apk\debug\app-debug.apk
```

这就是可以安装到手机的安装包。

---

## 八、装到 Android 手机

### 方法 A：数据线 + 拷贝

1. 手机用 USB 连电脑，选 **文件传输**  
2. 把 `app-debug.apk` 复制到手机 **Download（下载）** 文件夹  
3. 手机上用 **文件管理器** 打开该 APK，点 **安装**  
4. 若提示「未知来源」，到 **设置 → 安全** 里允许安装未知应用  

### 方法 B：Android Studio 直接运行（调试）

1. 手机开启 **开发者选项** 和 **USB 调试**  
2. Android Studio 顶部设备列表选你的手机  
3. 点绿色 **Run ▶** 按钮，会自动安装并启动  

### 方法 C：微信 / 网盘

把 `app-debug.apk` 发到微信文件传输助手或网盘，手机下载后安装（部分机型需允许「安装未知应用」）。

---

## 九、正式版 Release APK（可选，上架商店用）

调试版 `app-debug.apk` 适合给自己和家人装。若要上架应用商店，需要 **签名** 后打 **release** 包：

1. Android Studio：**Build → Generate Signed Bundle / APK**  
2. 选 **APK → Next**  
3. **Create new…** 创建密钥库（`.jks` 文件），**务必记住密码并备份密钥文件**  
4. 选 **release**，Finish  

Release APK 路径示例：

```
android\app\build\outputs\apk\release\app-release.apk
```

---

## 十、常用命令速查

在项目目录 `D:\Projects\paopaolong-elder` 下：

| 命令 | 作用 |
|------|------|
| `npm install` | 安装 Capacitor 等依赖（首次或换电脑时） |
| `npm run serve` | 浏览器试玩 http://localhost:8080 |
| `npx cap sync android` | 把 `www` 最新代码同步进 Android 工程 |
| `npm run open:android` | 用 Android Studio 打开 android 工程 |

---

## 十一、完整打包 checklist（每次发版勾一遍）

- [ ] 游戏在浏览器试玩正常（`npm run serve`）  
- [ ] 已改好应用名（`capacitor.config.json` + `strings.xml`）  
- [ ] 已换好图标（Image Asset）  
- [ ] 已改版本号（`versionCode` / `versionName`，若是新版）  
- [ ] 已执行 `npx cap sync android`  
- [ ] Android Studio **Build APK(s)** 成功  
- [ ] 在真机安装测试：能打开、能玩、音效正常  

---

## 十二、常见问题

### Q：Gradle Sync 失败 / 下载很慢？

- 检查网络；可开 VPN 或换网络  
- Android Studio：**File → Settings → Build → Gradle**，确认 JDK 为 **Embedded JDK**  

### Q：提示 JAVA_HOME 未设置？

- 用 Android Studio 打包即可，它会自带 Java  
- 命令行打包需安装 JDK 17 并配置环境变量（新手建议只用 Android Studio）  

### Q：改了游戏但 APK 里还是旧版？

- 忘记执行 `npx cap sync android`  
- Android Studio 里 **Build → Clean Project**，再 **Build APK(s)**  

### Q：安装时提示「解析包出错」？

- APK 未传完整，重新拷贝  
- 手机系统过旧，当前 `minSdk` 要求 Android 5.1+（一般无问题）  

### Q：桌面名字和图标没变化？

- 名字：确认改了 `strings.xml` 并重新打包  
- 图标：用 Image Asset 生成后需 **Clean + 重新 Build**；卸载旧版再装新版  

---

## 项目结构说明

```
paopaolong-elder/
├── www/                 ← 游戏网页（HTML/JS/CSS），改玩法改这里
├── capacitor.config.json← 应用名、包名配置
├── package.json
├── android/             ← Android 工程，用 Android Studio 打开这个
│   └── app/
│       ├── build.gradle ← 版本号、applicationId
│       └── src/main/res/← 图标、应用名字符串
└── BUILD.md             ← 本文档
```

---

如有新电脑，只需：**克隆/拷贝项目 → npm install → cap sync → Android Studio 打开 android → Build APK**。
