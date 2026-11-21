/**
 * tts-voice-response.js - Native Speech Synthesis for Antigravity AI Responses.
 * Automatically speaks out assistant responses in Spanish and adds a quick speaker button.
 */
(function() {
  if (typeof window === 'undefined') return;

  var ttsEnabled = true;
  try {
    var stored = localStorage.getItem('ag_voice_tts_enabled');
    if (stored !== null) ttsEnabled = (stored === 'true');
  } catch(e) {}

  window.__agTts = {
    enabled: ttsEnabled,
    toggle: function(val) {
      if (typeof val === 'boolean') {
        ttsEnabled = val;
      } else {
        ttsEnabled = !ttsEnabled;
      }
      try { localStorage.setItem('ag_voice_tts_enabled', String(ttsEnabled)); } catch(e) {}
      if (!ttsEnabled) {
        if (window.Android && typeof window.Android.stopSpeaking === 'function') {
          window.Android.stopSpeaking();
        }
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      }
      console.log('[TTS] Voice responses enabled:', ttsEnabled);
      return ttsEnabled;
    },
    speak: function(text) {
      if (!ttsEnabled || !text) return;
      try {
        var cleanText = text
          .replace(/```[\s\S]*?```/g, ' [código omitido] ')
          .replace(/`([^`]+)`/g, '$1')
          .replace(/!\[.*?\]\(.*?\)/g, '')
          .replace(/\[(.*?)\]\(.*?\)/g, '$1')
          .replace(/[*_~#>]/g, '')
          .replace(/https?:\/\/\S+/g, '')
          .trim();

        if (!cleanText) return;

        // 1. AndroidBridge native TextToSpeech engine
        if (window.Android && typeof window.Android.speak === 'function') {
          console.log('[TTS] Speaking via AndroidBridge.speak (' + cleanText.length + ' chars)');
          window.Android.speak(cleanText);
          return;
        }

        // 2. WebView speech synthesis fallback
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
          var utterance = new SpeechSynthesisUtterance(cleanText);
          utterance.lang = 'es-ES';
          utterance.rate = 1.05;
          utterance.pitch = 1.0;
          var voices = window.speechSynthesis.getVoices();
          var esVoice = voices.find(function(v) { return v.lang && v.lang.startsWith('es'); });
          if (esVoice) utterance.voice = esVoice;
          window.speechSynthesis.speak(utterance);
          console.log('[TTS] Speaking via window.speechSynthesis (' + cleanText.length + ' chars)');
        }
      } catch (err) {
        console.warn('[TTS] Speech error:', err);
      }
    }
  };

  // Robust observer: detects any completed bubble in the chat view
  var lastSpoken = '';
  var debounceTimer = null;

  function checkForNewResponses() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function() {
      // Find all message containers
      var candidateElements = document.querySelectorAll(
        '.markdown, .prose, [data-message-author="assistant"], [role="presentation"] p'
      );
      if (candidateElements.length === 0) {
        candidateElements = document.querySelectorAll('p');
      }

      if (candidateElements.length > 0) {
        var lastElem = candidateElements[candidateElements.length - 1];
        var text = (lastElem.innerText || lastElem.textContent || '').trim();

        // Check that text is long enough and not from user input box
        if (text && text.length > 10 && text !== lastSpoken && !lastElem.closest('textarea, [contenteditable="true"]')) {
          // Verify user is not currently typing / streaming
          var typingIndicators = document.querySelectorAll('.animate-pulse, [data-testid="send-button-pending"]');
          if (typingIndicators.length === 0) {
            lastSpoken = text;
            console.log('[TTS] Auto-triggering speech for latest response');
            window.__agTts.speak(text);
          }
        }
      }
    }, 800); // 800ms debounce after last DOM mutation
  }

  function startObserver() {
    var target = document.getElementById('root') || document.body;
    if (!target) return;
    var observer = new MutationObserver(checkForNewResponses);
    observer.observe(target, { childList: true, subtree: true, characterData: true });
    console.log('[TTS] Active mutation observer watching conversation');
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(startObserver, 1000);
  } else {
    window.addEventListener('DOMContentLoaded', function() {
      setTimeout(startObserver, 1000);
    });
  }
})();
