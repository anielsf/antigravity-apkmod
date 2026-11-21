/**
 * core/online-and-notifications.js - Fix false "No internet" banner in Android
 * WebView and polyfill Web Notifications API.
 */
try {
  if (typeof Navigator !== 'undefined' && Navigator.prototype) {
    Object.defineProperty(Navigator.prototype, 'onLine', {
      get: function () { return true; },
      configurable: true
    });
  }
  var origAddEventListener = global.addEventListener ? global.addEventListener.bind(global) : null;
  if (origAddEventListener) {
    global.addEventListener = function (type, listener, options) {
      if (type === 'offline') {
        return;
      }
      return origAddEventListener(type, listener, options);
    };
  }
} catch (e) { warn('online-shim', e); }

try {
  var FakeNotification = function (title, options) {
    this.title = String(title || 'Antigravity');
    this.body = (options && options.body) ? String(options.body) : '';
    this.tag = (options && options.tag) ? String(options.tag) : ('agy_' + Date.now());
    this.silent = !!(options && options.silent);
    this.onclick = null;
    this.onclose = null;
  };
  FakeNotification.permission = 'granted';
  FakeNotification.requestPermission = function (cb) {
    if (typeof cb === 'function') {
      try { cb('granted'); } catch (e) {}
    }
    return Promise.resolve('granted');
  };
  FakeNotification.prototype.close = function () {
    if (typeof this.onclose === 'function') {
      try { this.onclose(); } catch (e) {}
    }
  };
  global.Notification = FakeNotification;
} catch (e) { warn('notification-polyfill', e); }

// Robust getUserMedia shim: handles device constraint mismatches and NotReadableError on Android WebView
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
  var nativeGUM = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = function(constraints) {
    console.log('[MIC] Requesting audio with constraints:', JSON.stringify(constraints));
    
    // First try with provided constraints
    return nativeGUM(constraints).catch(function(err) {
      console.warn('[MIC] Primary getUserMedia failed (' + (err && err.name) + '), attempting fallback constraints...', err);
      // Fallback 1: minimal audio constraint (fixes NotReadableError when sampleRate 48kHz or echoCancellation is rejected by Android hardware)
      var fallbackConstraints = { audio: true };
      return nativeGUM(fallbackConstraints).catch(function(err2) {
        console.warn('[MIC] Fallback 1 failed (' + (err2 && err2.name) + '), trying device-specific search...', err2);
        // Fallback 2: find specific audioinput device
        if (navigator.mediaDevices.enumerateDevices) {
          return navigator.mediaDevices.enumerateDevices().then(function(devices) {
            var audioDev = devices.find(function(d) { return d.kind === 'audioinput'; });
            if (audioDev && audioDev.deviceId) {
              return nativeGUM({ audio: { deviceId: { exact: audioDev.deviceId } } });
            }
            throw err2;
          });
        }
        throw err2;
      });
    }).then(function(stream) {
      console.log('[MIC] Audio stream successfully acquired. Tracks:', stream.getAudioTracks().length);
      return stream;
    });
  };
}
