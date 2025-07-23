# Phone Silencer Android App

This Android application automatically manages your phone's ringer mode based on your work schedule:

- **Sets phone to VIBRATE at 9:00 AM** Budapest time on workdays
- **Sets phone to LOUD at 5:00 PM** Budapest time on workdays  
- **Works only on Monday through Thursday** (workdays)
- **Runs in the background** with minimal battery usage
- **Simple UI** with manual override controls

## Features

### 🕘 Automated Scheduling
- Precise timing using Budapest timezone (Europe/Budapest)
- AlarmManager ensures reliable triggering even when app is closed
- Only activates on workdays (Monday-Thursday)

### 🔄 Manual Controls  
- Toggle silencer on/off
- Manual "Set to Vibrate" button
- Manual "Set to Loud" button
- Real-time status display

### 🔋 Background Operation
- Minimal battery usage
- Survives device reboots (auto-restarts)
- No need to keep app open

### 🛡️ Permissions
The app requires these permissions to function:
- **Modify Audio Settings**: Change ringer mode
- **Schedule Exact Alarm**: Precise timing
- **Receive Boot Completed**: Restart after reboot

## Installation

### Option 1: Android Studio
1. Clone this repository
2. Open in Android Studio
3. Build APK: `Build > Build Bundle(s) / APK(s) > Build APK(s)`
4. Install APK on your Android device

### Option 2: Command Line
```bash
git clone https://github.com/szelld/phone_sliencer.git
cd phone_sliencer
./gradlew assembleDebug
# APK will be in app/build/outputs/apk/debug/
```

## Setup Instructions

1. **Install the APK** on your Android device
2. **Grant permissions** when prompted:
   - Allow modification of audio settings
   - Allow exact alarm scheduling
3. **Open the app** and tap "Enable Silencer"
4. **That's it!** The app will now automatically:
   - Set your phone to vibrate at 9:00 AM on workdays
   - Set your phone back to loud at 5:00 PM on workdays

## Manual Override

Use the manual control buttons anytime to:
- Immediately set phone to vibrate mode
- Immediately set phone to loud mode
- These override the automatic schedule temporarily

## Technical Details

- **Target SDK**: Android 14 (API 34)
- **Minimum SDK**: Android 5.0 (API 21)  
- **Framework**: Native Android with Material Design
- **Timezone**: Europe/Budapest (handles daylight saving automatically)
- **Architecture**: Uses AlarmManager for precise scheduling

## Troubleshooting

### App not triggering at scheduled times?
- Ensure "Exact Alarm" permission is granted
- Check that the silencer is enabled in the app
- Verify your device isn't in battery optimization for this app

### Ringer mode not changing?
- Grant "Modify Audio Settings" permission
- Some devices may require additional "Do Not Disturb" access

### Stops working after reboot?
- Ensure "Autostart" permission if your device has it
- The app includes automatic restart capability

## Contributing

Feel free to submit issues and enhancement requests!
