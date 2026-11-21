/**
 * tts-voice-response.js - Native Speech Synthesis for Antigravity AI Responses.
 *
 * Designed specifically for Dariel:
 * 1. Default is OFF so it NEVER interrupts or speaks while you type/dictate.
 * 2. Floating speaker button with 3 states:
 *    - Click: Speaks ONLY the latest assistant response (never user message).
 *    - Long-click (or double click): Toggles Auto-Speak ON (🔊) / OFF (🔇).
 * 3. User messages ([aria-label="User message"]) and user input fields are STRICTLY excluded.
 */
(function() {
  if (typeof window === 'undefined') return;

  // Auto-speak is OFF by default to prevent unwanted reading
  var autoSpeakEnabled = false;
  try {
    var stored = localStorage.getItem('ag_voice_auto_speak');
    if (stored !== null) autoSpeakEnabled = (stored === 'true');
  } catch(e) {}

  var isSpeaking = false;
  var lastSpoken = '';

  window.__agTts = {
    isAutoSpeak: function() { return autoSpeakEnabled; },
    toggleAutoSpeak: function() {
      autoSpeakEnabled = !autoSpeakEnabled;
      try { localStorage.setItem('ag_voice_auto_speak', String(autoSpeakEnabled)); } catch(e) {}
      updateButtonUi();
      if (!autoSpeakEnabled) {
        window.__agTts.stop();
      }
      return autoSpeakEnabled;
    },
    stop: function() {
      isSpeaking = false;
      if (window.Android && typeof window.Android.stopSpeaking === 'function') {
        window.Android.stopSpeaking();
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    },
    speak: function(text) {
      if (!text) return;
      try {
        window.__agTts.stop();

        var cleanText = text
          .replace(/```[\s\S]*?```/g, ' [código omitido] ')
          .replace(/`([^`]+)`/g, '$1')
          .replace(/!\[.*?\]\(.*?\)/g, '')
          .replace(/\[(.*?)\]\(.*?\)/g, '$1')
          .replace(/[*_~#>]/g, '')
          .replace(/https?:\/\/\S+/g, '')
          .trim();

        if (!cleanText || cleanText.length < 2) return;

        isSpeaking = true;

        // Native Android TTS (Samsung / Google)
        if (window.Android && typeof window.Android.speak === 'function') {
          console.log('[TTS] Speaking assistant message (' + cleanText.length + ' chars)');
          window.Android.speak(cleanText);
          return;
        }

        // Web Speech fallback
        if (window.speechSynthesis) {
          var utterance = new SpeechSynthesisUtterance(cleanText);
          utterance.lang = 'es-ES';
          utterance.rate = 1.05;
          var voices = window.speechSynthesis.getVoices();
          var esVoice = voices.find(function(v) { return v.lang && v.lang.startsWith('es'); });
          if (esVoice) utterance.voice = esVoice;
          utterance.onend = function() { isSpeaking = false; };
          utterance.onerror = function() { isSpeaking = false; };
          window.speechSynthesis.speak(utterance);
        }
      } catch (err) {
        isSpeaking = false;
        console.warn('[TTS] Speech error:', err);
      }
    },
    speakLastAssistantResponse: function() {
      // Find ONLY assistant response containers specifically rendered by the AI planner
      var plannerNodes = document.querySelectorAll('[data-testid="planner-response-text"]');
      if (plannerNodes && plannerNodes.length > 0) {
        var lastNode = plannerNodes[plannerNodes.length - 1];
        var txt = (lastNode.innerText || lastNode.textContent || '').trim();
        if (txt && txt.length > 2) {
          lastSpoken = txt;
          window.__agTts.speak(txt);
          return;
        }
      }

      // Fallback: search paragraphs while strictly rejecting ANY user input card or prompt area
      var allParagraphs = document.querySelectorAll('p, .markdown');
      var assistantTexts = [];

      for (var i = 0; i < allParagraphs.length; i++) {
        var el = allParagraphs[i];
        if (el.closest('[data-testid="user-input-step"], [data-testid="pending-user-messages"], [data-testid="queued-messages-card"], [aria-label*="User" i], textarea, input, [contenteditable="true"], form, nav, button, [role="tooltip"]')) {
          continue;
        }
        var candidate = (el.innerText || el.textContent || '').trim();
        if (candidate && candidate.length > 5) {
          assistantTexts.push(candidate);
        }
      }

      if (assistantTexts.length > 0) {
        var latestText = assistantTexts[assistantTexts.length - 1];
        lastSpoken = latestText;
        window.__agTts.speak(latestText);
      }
    }
  };

  var speakerBtn = null;
  function updateButtonUi() {
    if (!speakerBtn) return;
    if (autoSpeakEnabled) {
      speakerBtn.innerHTML = '🔊';
      speakerBtn.title = 'Voz automática ACTIVADA (Toca para escuchar / Mantén presionado para desactivar)';
      speakerBtn.style.background = 'rgba(16, 185, 129, 0.85)'; // Green
      speakerBtn.style.borderColor = 'rgba(52, 211, 153, 0.5)';
    } else {
      speakerBtn.innerHTML = '🔈';
      speakerBtn.title = 'Toca para escuchar la última respuesta del asistente (Mantén presionado para auto-voz)';
      speakerBtn.style.background = 'rgba(30, 41, 59, 0.85)'; // Slate
      speakerBtn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
    }
  }

  function injectSpeakerButton() {
    if (document.getElementById('ag-speaker-btn')) return;

    speakerBtn = document.createElement('button');
    speakerBtn.id = 'ag-speaker-btn';
    speakerBtn.style.cssText = [
      'position: fixed',
      'top: 14px',
      'right: 60px',
      'z-index: 9999',
      'width: 34px',
      'height: 34px',
      'border-radius: 50%',
      'border: 1px solid rgba(255,255,255,0.2)',
      'color: #fff',
      'font-size: 16px',
      'display: flex',
      'align-items: center',
      'justify-content: center',
      'cursor: pointer',
      'box-shadow: 0 2px 8px rgba(0,0,0,0.4)',
      'backdrop-filter: blur(8px)',
      'transition: all 0.2s ease',
      'user-select: none',
      '-webkit-user-select: none'
    ].join(';');

    var pressTimer = null;
    var wasLongPress = false;

    // Click: Speak latest assistant response on demand!
    speakerBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      if (wasLongPress) {
        wasLongPress = false;
        return;
      }
      if (isSpeaking) {
        window.__agTts.stop();
        return;
      }
      speakerBtn.style.transform = 'scale(0.88)';
      setTimeout(function() { speakerBtn.style.transform = 'scale(1)'; }, 150);
      window.__agTts.speakLastAssistantResponse();
    });

    // Long press: Toggle auto-speak on/off
    speakerBtn.addEventListener('touchstart', function() {
      wasLongPress = false;
      pressTimer = setTimeout(function() {
        wasLongPress = true;
        var nowOn = window.__agTts.toggleAutoSpeak();
        if (navigator.vibrate) navigator.vibrate(50);
        console.log('[TTS] Auto-speak toggled:', nowOn);
      }, 700);
    }, { passive: true });

    speakerBtn.addEventListener('touchend', function() {
      clearTimeout(pressTimer);
    }, { passive: true });

    updateButtonUi();
    document.body.appendChild(speakerBtn);
  }

  // Observer: ONLY auto-speaks when autoSpeakEnabled is explicitly turned ON by user
  var debounceTimer = null;
  function onDomMutated() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function() {
      injectSpeakerButton();
      if (!autoSpeakEnabled) return; // Do NOTHING if user hasn't turned auto-speak ON!

      var typing = document.querySelectorAll('.animate-pulse, [data-testid="send-button-pending"]');
      if (typing.length > 0) return;

      // Prioritize strict planner response element
      var plannerNodes = document.querySelectorAll('[data-testid="planner-response-text"]');
      if (plannerNodes && plannerNodes.length > 0) {
        var lastNode = plannerNodes[plannerNodes.length - 1];
        var txt = (lastNode.innerText || lastNode.textContent || '').trim();
        if (txt && txt.length > 5 && txt !== lastSpoken) {
          lastSpoken = txt;
          window.__agTts.speak(txt);
          return;
        }
      }

      // Secondary fallback with aggressive user message exclusion
      var allParagraphs = document.querySelectorAll('p, .markdown');
      for (var i = allParagraphs.length - 1; i >= 0; i--) {
        var el = allParagraphs[i];
        if (el.closest('[data-testid="user-input-step"], [data-testid="pending-user-messages"], [data-testid="queued-messages-card"], [aria-label*="User" i], textarea, input, [contenteditable="true"], form, nav, button')) {
          continue;
        }
        var txt = (el.innerText || el.textContent || '').trim();
        if (txt && txt.length > 15 && txt !== lastSpoken) {
          lastSpoken = txt;
          window.__agTts.speak(txt);
          break;
        }
      }
    }, 1000);
  }

  function start() {
    injectSpeakerButton();
    var target = document.getElementById('root') || document.body;
    if (target) {
      var observer = new MutationObserver(onDomMutated);
      observer.observe(target, { childList: true, subtree: true, characterData: true });
    }
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(start, 1000);
  } else {
    window.addEventListener('DOMContentLoaded', function() {
      setTimeout(start, 1000);
    });
  }
})();
