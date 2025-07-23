package com.phonesilencer;

import android.app.Service;
import android.content.Intent;
import android.os.IBinder;
import android.util.Log;

public class PhoneSilencerService extends Service {

    private static final String TAG = "PhoneSilencerService";

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "PhoneSilencerService created");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "PhoneSilencerService started");
        
        // For now, this service is mainly for future extensibility
        // The main logic is handled by AlarmReceiver
        
        return START_STICKY; // Restart service if killed
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.d(TAG, "PhoneSilencerService destroyed");
    }

    @Override
    public IBinder onBind(Intent intent) {
        // This service doesn't need to be bound
        return null;
    }
}