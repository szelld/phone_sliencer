# Phone Silencer - Installation Guide

## Quick Start 🚀

### Step 1: Build the APK
```bash
# Option A: Using Android Studio
1. Open project in Android Studio
2. Build > Build Bundle(s) / APK(s) > Build APK(s)

# Option B: Command Line (requires Android SDK)
./gradlew assembleDebug
```

### Step 2: Install on Device
```bash
# Transfer APK to device and install
# Or use ADB if connected:
adb install app/build/outputs/apk/debug/app-debug.apk
```

### Step 3: Setup
1. **Grant Permissions**: Allow audio modification and exact alarms
2. **Enable Silencer**: Open app and tap "Enable Silencer"
3. **Done!** App will now work automatically

## How It Works 📱

### Automatic Schedule
- **9:00 AM Budapest time**: Phone → VIBRATE mode
- **5:00 PM Budapest time**: Phone → LOUD mode
- **Active days**: Monday through Thursday only
- **Timezone**: Europe/Budapest (handles daylight saving)

### Manual Controls
- **Enable/Disable**: Toggle automatic scheduling
- **Set to Vibrate**: Immediate vibrate mode
- **Set to Loud**: Immediate loud mode
- **Status Display**: Shows current mode and schedule status

### Background Operation
- ✅ Survives device reboots
- ✅ Works when app is closed
- ✅ Minimal battery usage
- ✅ No persistent notifications required

## Permissions Required 🔐

The app requests these permissions:
- **Modify Audio Settings**: To change ringer mode
- **Schedule Exact Alarm**: For precise 9AM/5PM timing
- **Receive Boot Completed**: To restart after device reboot

## Troubleshooting 🔧

### App not switching modes automatically?
- Ensure "Enable Silencer" is turned ON
- Check that exact alarm permission is granted
- Verify current day is Monday-Thursday

### Manual buttons not working?
- Grant "Modify Audio Settings" permission
- Some devices need "Do Not Disturb" access

### Stops working after reboot?
- Check app has autostart permission (device-specific)
- App includes automatic restart functionality

## File Structure 📁

```
phone_sliencer/
├── app/
│   ├── src/main/
│   │   ├── java/com/phonesilencer/
│   │   │   ├── MainActivity.java       # Main UI & controls
│   │   │   ├── AlarmReceiver.java      # Scheduled actions
│   │   │   ├── BootReceiver.java       # Reboot handling
│   │   │   └── PhoneSilencerService.java
│   │   ├── res/
│   │   │   ├── layout/activity_main.xml # UI layout
│   │   │   ├── values/strings.xml       # Text strings
│   │   │   └── ...
│   │   └── AndroidManifest.xml          # Permissions & components
│   └── build.gradle                     # App dependencies
├── build.gradle                         # Project config
└── README.md                           # This file
```

---

**Ready to build! 🎯**

The complete Android application is implemented and ready for compilation into an APK.