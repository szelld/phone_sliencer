package com.phonesilencer;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioManager;
import android.util.Log;

import java.util.Calendar;
import java.util.TimeZone;

public class AlarmReceiver extends BroadcastReceiver {

    private static final String TAG = "AlarmReceiver";
    public static final String ACTION_SET_VIBRATE = "com.phonesilencer.SET_VIBRATE";
    public static final String ACTION_SET_LOUD = "com.phonesilencer.SET_LOUD";
    
    private static final String PREFS_NAME = "PhoneSilencerPrefs";
    private static final String KEY_ENABLED = "silencer_enabled";

    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d(TAG, "AlarmReceiver triggered with action: " + intent.getAction());
        
        // Check if silencer is enabled
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean isEnabled = prefs.getBoolean(KEY_ENABLED, false);
        
        if (!isEnabled) {
            Log.d(TAG, "Silencer is disabled, ignoring alarm");
            return;
        }

        // Check if it's a workday (Monday to Thursday)
        if (!isWorkday()) {
            Log.d(TAG, "Not a workday, ignoring alarm");
            return;
        }

        String action = intent.getAction();
        if (action == null) {
            Log.w(TAG, "Received null action");
            return;
        }

        AudioManager audioManager = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
        
        try {
            switch (action) {
                case ACTION_SET_VIBRATE:
                    Log.d(TAG, "Setting phone to vibrate mode");
                    audioManager.setRingerMode(AudioManager.RINGER_MODE_VIBRATE);
                    break;
                    
                case ACTION_SET_LOUD:
                    Log.d(TAG, "Setting phone to loud mode");
                    audioManager.setRingerMode(AudioManager.RINGER_MODE_NORMAL);
                    break;
                    
                default:
                    Log.w(TAG, "Unknown action: " + action);
                    break;
            }
        } catch (SecurityException e) {
            Log.e(TAG, "Security exception when trying to change ringer mode", e);
        }
    }

    private boolean isWorkday() {
        Calendar calendar = Calendar.getInstance(TimeZone.getTimeZone("Europe/Budapest"));
        int dayOfWeek = calendar.get(Calendar.DAY_OF_WEEK);
        
        // Calendar.MONDAY = 2, Calendar.TUESDAY = 3, Calendar.WEDNESDAY = 4, Calendar.THURSDAY = 5
        // Calendar.SUNDAY = 1, Calendar.FRIDAY = 6, Calendar.SATURDAY = 7
        boolean isWorkday = (dayOfWeek >= Calendar.MONDAY && dayOfWeek <= Calendar.THURSDAY);
        
        Log.d(TAG, "Current day of week: " + dayOfWeek + ", is workday: " + isWorkday);
        return isWorkday;
    }
}