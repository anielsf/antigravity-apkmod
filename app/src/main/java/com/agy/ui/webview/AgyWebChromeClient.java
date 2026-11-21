package com.agy.ui.webview;

import android.net.Uri;
import android.os.Message;
import android.util.Log;
import android.webkit.ConsoleMessage;
import android.webkit.ValueCallback;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebView;

import com.agy.util.SensitiveDataRedactor;

/** Routes console output to logcat, popups to PopupWindowHandler, and file chooser to callback. */
public final class AgyWebChromeClient extends WebChromeClient {

    private static final String TAG = "WebViewHost";

    public interface FileChooserCallback {
        boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback,
                                  FileChooserParams fileChooserParams);
    }

    private final PopupWindowHandler popupHandler;
    private final FileChooserCallback fileChooserCallback;

    public AgyWebChromeClient(PopupWindowHandler popupHandler, FileChooserCallback fileChooserCallback) {
        this.popupHandler = popupHandler;
        this.fileChooserCallback = fileChooserCallback;
    }

    public AgyWebChromeClient(PopupWindowHandler popupHandler) {
        this(popupHandler, null);
    }

    @Override
    public boolean onConsoleMessage(ConsoleMessage cm) {
        if (cm != null) {
            String msg = SensitiveDataRedactor.redactLine(cm.message());
            String src = SensitiveDataRedactor.safeUrl(cm.sourceId());
            int line = cm.lineNumber();
            ConsoleMessage.MessageLevel lvl = cm.messageLevel();
            String tag = "AGY_JS";
            if (lvl == ConsoleMessage.MessageLevel.ERROR) {
                Log.e(tag, "[" + src + ":" + line + "] " + msg);
            } else if (lvl == ConsoleMessage.MessageLevel.WARNING) {
                Log.w(tag, "[" + src + ":" + line + "] " + msg);
            } else {
                Log.i(tag, "[" + src + ":" + line + "] " + msg);
            }
        }
        return true;
    }

    @Override
    public boolean onCreateWindow(WebView parent, boolean isDialog, boolean isUserGesture,
                                  Message resultMsg) {
        return popupHandler.handle(parent, isDialog, isUserGesture, resultMsg);
    }

    @Override
    public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback,
                                      FileChooserParams fileChooserParams) {
        if (fileChooserCallback != null) {
            return fileChooserCallback.onShowFileChooser(webView, filePathCallback, fileChooserParams);
        }
        return super.onShowFileChooser(webView, filePathCallback, fileChooserParams);
    }

    /**
     * Grants the WebView access to the microphone (and camera) when the page
     * calls navigator.mediaDevices.getUserMedia({audio: true}).
     * Without this override the WebView silently denies all media capture requests.
     */
    @Override
    public void onPermissionRequest(final PermissionRequest request) {
        Log.i(TAG, "onPermissionRequest origin: " + request.getOrigin());
        final String[] resources = request.getResources();
        final java.util.List<String> granted = new java.util.ArrayList<>();
        for (String res : resources) {
            Log.i(TAG, "Permission requested for resource: " + res);
            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(res) ||
                    PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(res)) {
                granted.add(res);
            }
        }
        android.os.Handler mainHandler = new android.os.Handler(android.os.Looper.getMainLooper());
        mainHandler.post(new Runnable() {
            @Override
            public void run() {
                try {
                    if (!granted.isEmpty()) {
                        Log.i(TAG, "Granting WebView permissions: " + granted);
                        request.grant(granted.toArray(new String[0]));
                    } else {
                        Log.w(TAG, "Denying WebView permission request: no matching audio/video resource");
                        request.deny();
                    }
                } catch (Throwable t) {
                    Log.e(TAG, "Error handling PermissionRequest: " + t.getMessage(), t);
                }
            }
        });
    }
}
