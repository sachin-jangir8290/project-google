package tech.openwise.rideline;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.os.Looper;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/** Keeps recording the ride's GPS track while RideLine is in the background or the screen is off. */
public class RideService extends Service implements LocationListener {
    private static final String CH = "ride";
    private static final List<Location> buffer = new ArrayList<>();
    private static Location last;
    private LocationManager lm;

    static synchronized void add(Location l) { last = l; buffer.add(l); if (buffer.size() > 20000) buffer.remove(0); }

    /** Returns all fixes recorded since the last call, as JSON, and clears them. */
    static synchronized String drain() {
        JSONArray a = new JSONArray();
        try {
            for (Location l : buffer) {
                JSONObject o = new JSONObject();
                o.put("lat", l.getLatitude()); o.put("lng", l.getLongitude()); o.put("acc", l.getAccuracy());
                o.put("spd", l.hasSpeed() ? l.getSpeed() : JSONObject.NULL);
                o.put("hdg", l.hasBearing() ? l.getBearing() : JSONObject.NULL);
                o.put("alt", l.hasAltitude() ? l.getAltitude() : JSONObject.NULL);
                o.put("t", l.getTime());
                a.put(o);
            }
        } catch (Exception ignored) { }
        buffer.clear();
        return a.toString();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26) nm.createNotificationChannel(new NotificationChannel(CH, "Ride tracking", NotificationManager.IMPORTANCE_LOW));
        Intent open = new Intent(this, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, CH) : new Notification.Builder(this);
        Notification n = b.setContentTitle("RideLine is tracking your ride")
                .setContentText("Your location keeps updating in the background. Tap to open.")
                .setSmallIcon(R.drawable.ic_ride).setContentIntent(pi).setOngoing(true).build();
        if (Build.VERSION.SDK_INT >= 29) startForeground(7, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        else startForeground(7, n);
        if (lm == null) {
            lm = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
            try { lm.requestLocationUpdates(LocationManager.GPS_PROVIDER, 1000, 0, this, Looper.getMainLooper()); } catch (SecurityException | IllegalArgumentException ignored) { }
            try { lm.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 5000, 10, this, Looper.getMainLooper()); } catch (SecurityException | IllegalArgumentException ignored) { }
        }
        return START_STICKY;
    }

    @Override public void onLocationChanged(Location l) {
        if (LocationManager.NETWORK_PROVIDER.equals(l.getProvider()) && last != null && System.currentTimeMillis() - last.getTime() < 10000) return;
        add(l);
    }
    @Override public void onStatusChanged(String p, int s, Bundle e) { }
    @Override public void onProviderEnabled(String p) { }
    @Override public void onProviderDisabled(String p) { }

    @Override public void onDestroy() { if (lm != null) lm.removeUpdates(this); lm = null; super.onDestroy(); }
    @Override public IBinder onBind(Intent i) { return null; }
}
