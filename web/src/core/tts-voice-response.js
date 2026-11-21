/**
 * tts-voice-response.js - Native Speech Synthesis for Antigravity AI Responses.
 * Adds a floating speaker button and auto-reads assistant turns in Spanish.
 */
(function() {
  if (typeof window === 'undefined') return;

  var ttsEnabled = true;
  try {
    var stored = localStorage.getItem('ag_voice_tts_enabled');
    if (stored !== null) ttsEnabled = (stored === 'true');
  } catch(e) {}

  var lastSpoken = '';

  window.__agTts = {
    enabled: ttsEnabled,
    speak: function(text) {
      if (!text) return;
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

        // Native Android TTS
        if (window.Android && typeof window.Android.speak === 'function') {
          console.log('[TTS] Speaking via native AndroidBridge.speak (' + cleanText.length + ' chars)');
          window.Android.speak(cleanText);
          return;
        }

        // Web Speech API fallback
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
        }
      } catch (err) {
        console.warn('[TTS] Speech error:', err);
      }
    },
    speakLastResponse: function() {
      // Find the last visible paragraph or message block in the chat
      var nodes = document.querySelectorAll('p, .markdown, .prose');
      for (var i = nodes.length - 1; i >= 0; i--) {
        var node = nodes[i];
        if (node.closest('textarea, [contenteditable="true"], form, nav')) continue;
        var txt = (node.innerText || node.textContent || '').trim();
        if (txt && txt.length > 5) {
          console.log('[TTS] Manual speak triggered for:', txt.slice(0, 40));
          window.__agTts.speak(txt);
          return;
        }
      }
      if (lastSpoken) {
        window.__agTts.speak(lastSpoken);
      }
    }
  };

  // Add a discreet floating Speaker button in the UI
  function injectFloatingSpeaker() {
    if (document.getElementById('ag-speaker-btn')) return;

    var btn = document.createElement('button');
    btn.id = 'ag-speaker-btn';
    btn.innerHTML = '🔊';
    btn.title = 'Escuchar respuesta en voz alta';
    btn.style.cssText = [
      'position: fixed',
      'top: 14px',
      'right: 60px',
      'z-index: 9999',
      'width: 34px',
      'height: 34px',
      'border-radius: 50%',
      'border: 1px solid rgba(255,255,255,0.2)',
      'background: rgba(30, 41, 59, 0.85)',
      'color: #fff',
      'font-size: 16px',
      'display: flex',
      'align-items: center',
      'justify-content: center',
      'cursor: pointer',
      'box-shadow: 0 2px 8px rgba(0,0,0,0.4)',
      'backdrop-filter: blur(8px)',
      'transition: all 0.2s ease'
    ].join(';');

    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      btn.style.transform = 'scale(0.9)';
      setTimeout(function() { btn.style.transform = 'scale(1)'; }, 150);
      window.__agTts.speakLastResponse();
    });

    document.body.appendChild(btn);
    console.log('[TTS] Floating speaker button injected');
  }

  // Auto-observer
  var debounceTimer = null;
  function onDomMutated() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function() {
      injectFloatingSpeaker();
      var nodes = document.querySelectorAll('p, .markdown, .prose');
      for (var i = nodes.length - 1; i >= 0; i--) {
        var node = nodes[i];
        if (node.closest('textarea, [contenteditable="true"], form, nav')) continue;
        var txt = (node.innerText || node.textContent || '').trim();
        if (txt && txt.length > 15 && txt !== lastSpoken) {
          var typing = document.querySelectorAll('.animate-pulse, [data-testid="send-button-pending"]');
          if (typing.length === 0) {
            lastSpoken = txt;
            if (ttsEnabled) {
              window.__agTts.speak(txt);
            }
          }
          break;
        }
      }
    }, 900);
  }

  function start() {
    injectFloatingSpeaker();
    var target = document.getElementById('root') || document.body;
    if (target) {
      var observer = new MutationObserver(onDomMutated);
      observer.observe(target, { childList: true, subtree: true, characterData: true });
    }
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(start, 1200);
  } else {
    window.addEventListener('DOMContentLoaded', function() {
      setTimeout(start, 1200);
    });
  }
})();
