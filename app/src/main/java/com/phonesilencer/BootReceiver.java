package com.phonesilencer;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;

import java.util.Calendar;
import java.util.TimeZone;

public class BootReceiver extends BroadcastReceiver {

    private static final String TAG = "BootReceiver";
    private static final String PREFS_NAME = "PhoneSilencerPrefs";
    private static final String KEY_ENABLED = "silencer_enabled";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        Log.d(TAG, "BootReceiver triggered with action: " + action);
        
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) || 
            Intent.ACTION_MY_PACKAGE_REPLACED.equals(action) ||
            Intent.ACTION_PACKAGE_REPLACED.equals(action)) {
            
            // Check if silencer was enabled before reboot
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            boolean isEnabled = prefs.getBoolean(KEY_ENABLED, false);
            
            if (isEnabled) {
                Log.d(TAG, "Silencer was enabled, rescheduling alarms");
                rescheduleAlarms(context);
            }
        }
    }

    private void rescheduleAlarms(Context context) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        
        // Schedule 9:00 AM alarm (set to vibrate)
        scheduleAlarm(context, alarmManager, 9, 0, AlarmReceiver.ACTION_SET_VIBRATE, 1001);
        
        // Schedule 5:00 PM alarm (set to loud)
        scheduleAlarm(context, alarmManager, 17, 0, AlarmReceiver.ACTION_SET_LOUD, 1002);
    }

    private void scheduleAlarm(Context context, AlarmManager alarmManager, int hour, int minute, String action, int requestCode) {
        Calendar calendar = Calendar.getInstance(TimeZone.getTimeZone("Europe/Budapest"));
        calendar.set(Calendar.HOUR_OF_DAY, hour);
        calendar.set(Calendar.MINUTE, minute);
        calendar.set(Calendar.SECOND, 0);
        
        // If the time has already passed today, schedule for tomorrow
        if (calendar.getTimeInMillis() <= System.currentTimeMillis()) {
            calendar.add(Calendar.DAY_OF_MONTH, 1);
        }

        Intent intent = new Intent(context, AlarmReceiver.class);
        intent.setAction(action);
        
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            context, 
            requestCode, 
            intent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        if (alarmManager != null) {
            try {
                alarmManager.setRepeating(
                    AlarmManager.RTC_WAKEUP,
                    calendar.getTimeInMillis(),
                    24 * 60 * 60 * 1000, // 24 hours
                    pendingIntent
                );
                Log.d(TAG, "Scheduled alarm for " + hour + ":" + minute + " with action " + action);
            } catch (SecurityException e) {
                Log.e(TAG, "Security exception when scheduling alarm", e);
            }
        }
    }
}