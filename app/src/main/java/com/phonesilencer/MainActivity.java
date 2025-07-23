package com.phonesilencer;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioManager;
import android.os.Bundle;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import java.util.Calendar;
import java.util.TimeZone;

public class MainActivity extends AppCompatActivity {

    private Button toggleButton;
    private Button setVibrateButton;
    private Button setLoudButton;
    private TextView statusText;
    private TextView currentModeText;
    
    private SharedPreferences sharedPreferences;
    private AudioManager audioManager;
    private AlarmManager alarmManager;
    
    private static final String PREFS_NAME = "PhoneSilencerPrefs";
    private static final String KEY_ENABLED = "silencer_enabled";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        initializeViews();
        initializeServices();
        setupClickListeners();
        updateUI();
    }

    private void initializeViews() {
        toggleButton = findViewById(R.id.toggleButton);
        setVibrateButton = findViewById(R.id.setVibrateButton);
        setLoudButton = findViewById(R.id.setLoudButton);
        statusText = findViewById(R.id.statusText);
        currentModeText = findViewById(R.id.currentModeText);
    }

    private void initializeServices() {
        sharedPreferences = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        alarmManager = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
    }

    private void setupClickListeners() {
        toggleButton.setOnClickListener(v -> toggleSilencer());
        setVibrateButton.setOnClickListener(v -> setRingerMode(AudioManager.RINGER_MODE_VIBRATE));
        setLoudButton.setOnClickListener(v -> setRingerMode(AudioManager.RINGER_MODE_NORMAL));
    }

    private void toggleSilencer() {
        boolean isEnabled = sharedPreferences.getBoolean(KEY_ENABLED, false);
        
        if (isEnabled) {
            disableSilencer();
        } else {
            enableSilencer();
        }
        
        updateUI();
    }

    private void enableSilencer() {
        sharedPreferences.edit().putBoolean(KEY_ENABLED, true).apply();
        scheduleAlarms();
        Toast.makeText(this, "Phone Silencer enabled", Toast.LENGTH_SHORT).show();
    }

    private void disableSilencer() {
        sharedPreferences.edit().putBoolean(KEY_ENABLED, false).apply();
        cancelAlarms();
        Toast.makeText(this, "Phone Silencer disabled", Toast.LENGTH_SHORT).show();
    }

    private void scheduleAlarms() {
        // Schedule 9:00 AM alarm (set to vibrate)
        scheduleAlarm(9, 0, AlarmReceiver.ACTION_SET_VIBRATE);
        
        // Schedule 5:00 PM alarm (set to loud)
        scheduleAlarm(17, 0, AlarmReceiver.ACTION_SET_LOUD);
    }

    private void scheduleAlarm(int hour, int minute, String action) {
        Calendar calendar = Calendar.getInstance(TimeZone.getTimeZone("Europe/Budapest"));
        calendar.set(Calendar.HOUR_OF_DAY, hour);
        calendar.set(Calendar.MINUTE, minute);
        calendar.set(Calendar.SECOND, 0);
        
        // If the time has already passed today, schedule for tomorrow
        if (calendar.getTimeInMillis() <= System.currentTimeMillis()) {
            calendar.add(Calendar.DAY_OF_MONTH, 1);
        }

        Intent intent = new Intent(this, AlarmReceiver.class);
        intent.setAction(action);
        
        int requestCode = action.equals(AlarmReceiver.ACTION_SET_VIBRATE) ? 1001 : 1002;
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            this, 
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
            } catch (SecurityException e) {
                Toast.makeText(this, "Permission needed for exact alarms", Toast.LENGTH_LONG).show();
            }
        }
    }

    private void cancelAlarms() {
        // Cancel vibrate alarm
        Intent vibrateIntent = new Intent(this, AlarmReceiver.class);
        vibrateIntent.setAction(AlarmReceiver.ACTION_SET_VIBRATE);
        PendingIntent vibratePendingIntent = PendingIntent.getBroadcast(
            this, 1001, vibrateIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        // Cancel loud alarm
        Intent loudIntent = new Intent(this, AlarmReceiver.class);
        loudIntent.setAction(AlarmReceiver.ACTION_SET_LOUD);
        PendingIntent loudPendingIntent = PendingIntent.getBroadcast(
            this, 1002, loudIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        if (alarmManager != null) {
            alarmManager.cancel(vibratePendingIntent);
            alarmManager.cancel(loudPendingIntent);
        }
    }

    private void setRingerMode(int mode) {
        try {
            audioManager.setRingerMode(mode);
            updateCurrentModeText();
            
            String modeText = getRingerModeText(mode);
            Toast.makeText(this, "Ringer mode set to: " + modeText, Toast.LENGTH_SHORT).show();
        } catch (SecurityException e) {
            Toast.makeText(this, "Permission required to change ringer mode", Toast.LENGTH_LONG).show();
        }
    }

    private void updateUI() {
        boolean isEnabled = sharedPreferences.getBoolean(KEY_ENABLED, false);
        
        if (isEnabled) {
            statusText.setText(R.string.status_enabled);
            toggleButton.setText(R.string.disable_silencer);
        } else {
            statusText.setText(R.string.status_disabled);
            toggleButton.setText(R.string.enable_silencer);
        }
        
        updateCurrentModeText();
    }

    private void updateCurrentModeText() {
        int currentMode = audioManager.getRingerMode();
        String modeText = getRingerModeText(currentMode);
        currentModeText.setText(getString(R.string.current_mode, modeText));
    }

    private String getRingerModeText(int mode) {
        switch (mode) {
            case AudioManager.RINGER_MODE_VIBRATE:
                return getString(R.string.mode_vibrate);
            case AudioManager.RINGER_MODE_SILENT:
                return getString(R.string.mode_silent);
            case AudioManager.RINGER_MODE_NORMAL:
            default:
                return getString(R.string.mode_normal);
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        updateUI();
    }
}