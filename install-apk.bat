@echo off
echo Installing sales-gestor-app APK...
set ADB_PATH=%ANDROID_HOME%\platform-tools\adb.exe

if exist "%ADB_PATH%" (
    echo Using ADB from Android SDK...
    "%ADB_PATH%" devices
    echo.
    echo Installing APK...
    "%ADB_PATH%" install -r "android\app\build\outputs\apk\debug\app-debug.apk"
) else (
    echo ADB not found. Please install the APK manually:
    echo Location: android\app\build\outputs\apk\debug\app-debug.apk
)

echo.
echo Installation complete!
pause
