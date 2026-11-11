package tech.openwise.rideline;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.webkit.JavascriptInterface;
import android.view.WindowManager;
import android.webkit.GeolocationPermissions;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Locale;

import org.json.JSONObject;

/** RideLine: hosts the web app from the APK's assets in a secure WebView with GPS and camera access. */
public class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + HOST + "/assets/ride/index.html";
    private static final int REQ_LOCATION = 1;
    private static final int REQ_CAMERA = 2;
    private static final int REQ_MIC = 3;

    private WebView web;
    private GeolocationPermissions.Callback geoCallback;
    private String geoOrigin;
    private PermissionRequest pendingCamera;
    private TextToSpeech tts;
    private boolean ttsReady = false;
    private SpeechRecognizer recognizer;
    private String pendingListenLang;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().setStatusBarColor(Color.parseColor("#0b120c"));
        getWindow().setNavigationBarColor(Color.parseColor("#0b120c"));

        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .setDomain(HOST)
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#0b120c"));
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setGeolocationEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return loader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (HOST.equals(uri.getHost())) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (Exception ignored) { }
                return true;
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                if (has(Manifest.permission.ACCESS_FINE_LOCATION)) {
                    callback.invoke(origin, true, false);
                } else {
                    geoOrigin = origin;
                    geoCallback = callback;
                    requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, REQ_LOCATION);
                }
            }

            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    boolean wantsCamera = Arrays.asList(request.getResources()).contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE);
                    if (!wantsCamera) { request.deny(); return; }
                    if (has(Manifest.permission.CAMERA)) {
                        request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
                    } else {
                        pendingCamera = request;
                        requestPermissions(new String[]{Manifest.permission.CAMERA}, REQ_CAMERA);
                    }
                });
            }
        });

        tts = new TextToSpeech(this, status -> ttsReady = status == TextToSpeech.SUCCESS);
        web.addJavascriptInterface(new NovaBridge(), "NovaNative");

        if (savedInstanceState != null) web.restoreState(savedInstanceState);
        else web.loadUrl(START_URL);
    }

    /** Voice for navigation and Nova: Android text-to-speech and speech recognition, called from JavaScript. */
    private class NovaBridge {
        @JavascriptInterface
        public void speak(String text, String lang) {
            if (tts == null || !ttsReady || text == null) return;
            Locale locale = (lang != null && lang.startsWith("hi")) ? new Locale("hi", "IN") : new Locale("en", "IN");
            int ok = tts.setLanguage(locale);
            if (ok == TextToSpeech.LANG_MISSING_DATA || ok == TextToSpeech.LANG_NOT_SUPPORTED) tts.setLanguage(Locale.ENGLISH);
            tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "rideline");
        }

        /** POST JSON to the rider's own Nova AI from native code, so the server does not need CORS for the app. */
        @JavascriptInterface
        public void http(final String id, final String url, final String body, final String auth) {
            new Thread(() -> {
                int code = 0;
                String text;
                HttpURLConnection c = null;
                try {
                    if (url == null || !url.startsWith("https://")) throw new IllegalArgumentException("Use an https:// address");
                    c = (HttpURLConnection) new URL(url).openConnection();
                    c.setRequestMethod("POST");
                    c.setConnectTimeout(75000);
                    c.setReadTimeout(75000);
                    c.setDoOutput(true);
                    c.setRequestProperty("Content-Type", "application/json");
                    c.setRequestProperty("Accept", "application/json, text/plain");
                    if (auth != null && !auth.isEmpty()) c.setRequestProperty("Authorization", "Bearer " + auth);
                    try (OutputStream os = c.getOutputStream()) { os.write(body.getBytes(StandardCharsets.UTF_8)); }
                    code = c.getResponseCode();
                    InputStream in = code >= 400 ? c.getErrorStream() : c.getInputStream();
                    ByteArrayOutputStream bo = new ByteArrayOutputStream();
                    if (in != null) { byte[] b = new byte[8192]; int n; while ((n = in.read(b)) > 0 && bo.size() < 200000) bo.write(b, 0, n); in.close(); }
                    text = bo.toString("UTF-8");
                } catch (Exception e) {
                    text = e.getClass().getSimpleName() + ": " + e.getMessage();
                } finally {
                    if (c != null) c.disconnect();
                }
                final String call = "window.__novaNative&&window.__novaNative.onHttp(" + JSONObject.quote(id) + "," + code + "," + JSONObject.quote(text) + ")";
                runOnUiThread(() -> web.evaluateJavascript(call, null));
            }).start();
        }

        @JavascriptInterface
        public void stop() {
            if (tts != null) tts.stop();
        }

        @JavascriptInterface
        public void listen(String lang) {
            runOnUiThread(() -> {
                if (has(Manifest.permission.RECORD_AUDIO)) startListening(lang);
                else {
                    pendingListenLang = lang;
                    requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQ_MIC);
                }
            });
        }
    }

    private void js(String fn, String arg) {
        String a = arg == null ? "null" : JSONObject.quote(arg);
        runOnUiThread(() -> web.evaluateJavascript("window.__novaNative&&window.__novaNative." + fn + "(" + a + ")", null));
    }

    private void startListening(String lang) {
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            js("onError", "Speech recognition is not available on this phone");
            return;
        }
        if (recognizer == null) {
            recognizer = SpeechRecognizer.createSpeechRecognizer(this);
            recognizer.setRecognitionListener(new RecognitionListener() {
                @Override public void onReadyForSpeech(Bundle params) { js("onListening", null); }
                @Override public void onBeginningOfSpeech() { }
                @Override public void onRmsChanged(float rmsdB) { }
                @Override public void onBufferReceived(byte[] buffer) { }
                @Override public void onEndOfSpeech() { }
                @Override public void onError(int error) {
                    js("onError", error == SpeechRecognizer.ERROR_NO_MATCH || error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT ? "Didn't hear anything, try again" : "Voice input error " + error);
                }
                @Override public void onResults(Bundle results) {
                    ArrayList<String> list = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                    js("onResult", list != null && !list.isEmpty() ? list.get(0) : "");
                }
                @Override public void onPartialResults(Bundle partialResults) { }
                @Override public void onEvent(int eventType, Bundle params) { }
            });
        }
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang == null ? "hi-IN" : lang);
        intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
        if (tts != null) tts.stop();
        recognizer.startListening(intent);
    }

    private boolean has(String permission) {
        return checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        boolean granted = results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED;
        if (requestCode == REQ_LOCATION && geoCallback != null) {
            geoCallback.invoke(geoOrigin, granted, false);
            geoCallback = null;
        } else if (requestCode == REQ_CAMERA && pendingCamera != null) {
            if (granted) pendingCamera.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
            else pendingCamera.deny();
            pendingCamera = null;
        } else if (requestCode == REQ_MIC) {
            if (granted && pendingListenLang != null) startListening(pendingListenLang);
            else js("onError", "Microphone permission is needed to talk to Nova");
            pendingListenLang = null;
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (recognizer != null) recognizer.destroy();
        if (tts != null) tts.shutdown();
        if (web != null) web.destroy();
        super.onDestroy();
    }
}
