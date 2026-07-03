@echo off
chcp 65001 >nul
echo ========================================
echo  Android Studio 中文语言包安装脚本
echo ========================================
echo.

set "PLUGIN_DIR=%APPDATA%\Google\AndroidStudio2026.1.1\plugins"
set "JAR_URL=https://github.com/sollyu/AndroidStudioChineseLanguagePack/releases/download/zh-261.22158.277/zh-261.22158.277.jar"
set "JAR_FILE=%PLUGIN_DIR%\zh-261.22158.277.jar"
set "LIB_DIR=%PLUGIN_DIR%\com.intellij.zh\lib"

echo [1/4] 关闭 Android Studio...
taskkill /IM studio64.exe /F >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/4] 下载中文语言包...
if not exist "%PLUGIN_DIR%" mkdir "%PLUGIN_DIR%"
powershell -NoProfile -Command "Invoke-WebRequest -Uri '%JAR_URL%' -OutFile '%JAR_FILE%' -UseBasicParsing"
if not exist "%JAR_FILE%" (
    echo 下载失败，请检查网络后重试。
    pause
    exit /b 1
)

echo [3/4] 安装插件...
if not exist "%LIB_DIR%" mkdir "%LIB_DIR%"
copy /Y "%JAR_FILE%" "%LIB_DIR%\zh-261.22158.277.jar" >nul

echo [4/4] 配置语言为简体中文...
powershell -NoProfile -Command ^
  "$xml='C:\Users\sharzoy\AppData\Roaming\Google\AndroidStudio2026.1.1\options\ide.general.xml';" ^
  "$content=@'\n<application>\n  <component name=\"GeneralOptions\">\n    <option name=\"locale\" value=\"zh_CN\" />\n  </component>\n  <component name=\"Registry\">\n    <entry key=\"ide.experimental.ui\" value=\"true\" source=\"SYSTEM\" />\n    <entry key=\"switched.from.classic.to.islands\" value=\"false\" source=\"SYSTEM\" />\n    <entry key=\"i18n.locale\" value=\"zh\" source=\"USER\" />\n  </component>\n</application>\n'@; Set-Content -Path $xml -Value $content -Encoding UTF8"

echo.
echo 安装完成！正在启动 Android Studio...
start "" "E:\A-android apk\android apk\bin\studio64.exe"
echo.
echo 如果界面仍是英文，请在 Android Studio 中手动设置：
echo   设置 ^> 外观与行为 ^> 系统设置 ^> Language and Region
echo   语言选择 Chinese，然后重启。
echo.
pause
