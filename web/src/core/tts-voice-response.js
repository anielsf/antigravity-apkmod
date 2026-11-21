/**
 * tts-voice-response.js - Native Speech Synthesis for Antigravity AI Responses.
 * Automatically speaks out assistant responses in Spanish using the device TTS engine.
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
      if (!ttsEnabled && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      console.log('[TTS] Voice responses enabled:', ttsEnabled);
      return ttsEnabled;
    },
    speak: function(text) {
      if (!ttsEnabled || !window.speechSynthesis || !text) return;
      try {
        window.speechSynthesis.cancel(); // Stop any pending speech
        
        // Clean markdown symbols, code blocks, and URLs so speech is natural
        var cleanText = text
          .replace(/```[\s\S]*?```/g, ' [código omitido] ') // Skip long code blocks in voice
          .replace(/`([^`]+)`/g, '$1')
          .replace(/!\[.*?\]\(.*?\)/g, '')
          .replace(/\[(.*?)\]\(.*?\)/g, '$1')
          .replace(/[*_~#>]/g, '')
          .replace(/https?:\/\/\S+/g, '')
          .trim();

        if (!cleanText) return;

        var utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'es-ES';
        utterance.rate = 1.05; // Slightly faster for natural flow
        utterance.pitch = 1.0;

        // Try to pick a natural Spanish voice
        var voices = window.speechSynthesis.getVoices();
        var esVoice = voices.find(function(v) { return v.lang && v.lang.startsWith('es'); });
        if (esVoice) utterance.voice = esVoice;

        window.speechSynthesis.speak(utterance);
        console.log('[TTS] Speaking response (' + cleanText.length + ' chars)');
      } catch (err) {
        console.warn('[TTS] Speech error:', err);
      }
    }
  };

  // Watch for assistant turn completion in the DOM to speak the answer
  var lastSpokenText = '';
  var isObserving = false;

  function observeResponses() {
    if (isObserving) return;
    var root = document.getElementById('root') || document.body;
    if (!root) return;

    var observer = new MutationObserver(function(mutations) {
      // Find all completed assistant messages
      var messages = document.querySelectorAll('[data-testid="agent-turn"], [data-message-author="assistant"], .agent-message-content');
      if (messages.length === 0) {
        // Fallback selector for chat bubbles
        messages = document.querySelectorAll('.prose');
      }
      if (messages.length > 0) {
        var lastMsg = messages[messages.length - 1];
        // Ensure it is not currently streaming/typing (check for streaming indicators)
        var isStreaming = document.querySelector('.animate-pulse, [data-testid="send-button-pending"], .cursor-default.animate-spin');
        if (!isStreaming) {
          var currentText = (lastMsg.innerText || '').trim();
          if (currentText && currentText !== lastSpokenText && currentText.length > 3) {
            // Check if user recently used voice or if auto-read is on
            lastSpokenText = currentText;
            window.__agTts.speak(currentText);
          }
        }
      }
    });

    observer.observe(root, { childList: true, subtree: true, characterData: true });
    isObserving = true;
    console.log('[TTS] Observer attached to DOM');
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(observeResponses, 1500);
  } else {
    window.addEventListener('DOMContentLoaded', function() {
      setTimeout(observeResponses, 1500);
    });
  }
})();
