import { useState, useRef, useCallback, useEffect } from 'react';
import { sendChat } from '../api';

const STATES = {
  IDLE: 'IDLE',
  LISTENING: 'LISTENING',
  THINKING: 'THINKING',
  SPEAKING: 'SPEAKING',
  ENDED: 'ENDED',
};

export default function VoiceAgent({ onTranscriptUpdate, onCallEnd }) {
  const [agentState, setAgentState] = useState(STATES.IDLE);
  const messagesRef = useRef([]); // full conversation history for API
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const isCallActiveRef = useRef(false);

  // Pick best Indian English voice
  const getVoice = useCallback(() => {
    const voices = synthRef.current.getVoices();
    // Prefer Indian English voices
    const indianVoice = voices.find(
      (v) => v.lang === 'en-IN' && v.name.toLowerCase().includes('female')
    );
    if (indianVoice) return indianVoice;
    const anyIndian = voices.find((v) => v.lang === 'en-IN');
    if (anyIndian) return anyIndian;
    // Fallback to any English female voice
    const enFemale = voices.find(
      (v) => v.lang.startsWith('en') && v.name.toLowerCase().includes('female')
    );
    if (enFemale) return enFemale;
    // Fallback to any English voice
    return voices.find((v) => v.lang.startsWith('en')) || voices[0];
  }, []);

  // Load voices (they load async in some browsers)
  useEffect(() => {
    synthRef.current.getVoices();
    speechSynthesis.onvoiceschanged = () => synthRef.current.getVoices();
  }, []);

  // Speak text using browser TTS
  const speak = useCallback(
    (text) => {
      return new Promise((resolve) => {
        // Cancel any ongoing speech
        synthRef.current.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = getVoice();
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        setAgentState(STATES.SPEAKING);
        synthRef.current.speak(utterance);
      });
    },
    [getVoice]
  );

  // Start listening via Web Speech API
  const startListening = useCallback(() => {
    if (!isCallActiveRef.current) return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = async (event) => {
      const userText = event.results[0][0].transcript;
      if (!userText.trim()) {
        // Empty result, restart listening
        if (isCallActiveRef.current) startListening();
        return;
      }

      // Add user message
      messagesRef.current = [
        ...messagesRef.current,
        { role: 'user', content: userText },
      ];
      onTranscriptUpdate([...messagesRef.current]);

      // Send to backend
      setAgentState(STATES.THINKING);
      try {
        const reply = await sendChat(messagesRef.current);
        messagesRef.current = [
          ...messagesRef.current,
          { role: 'assistant', content: reply },
        ];
        onTranscriptUpdate([...messagesRef.current]);

        // Speak the reply
        await speak(reply);

        // Resume listening after speaking
        if (isCallActiveRef.current) {
          setAgentState(STATES.LISTENING);
          startListening();
        }
      } catch (err) {
        console.error('Chat error:', err);
        const errorMsg =
          "I'm sorry, I'm having trouble connecting. Please try again.";
        await speak(errorMsg);
        if (isCallActiveRef.current) {
          setAgentState(STATES.LISTENING);
          startListening();
        }
      }
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      if (event.error === 'no-speech' && isCallActiveRef.current) {
        // No speech detected, restart
        startListening();
        return;
      }
      if (isCallActiveRef.current) {
        setTimeout(() => startListening(), 500);
      }
    };

    recognition.onend = () => {
      // If call is active but recognition ended without result, restart
      // (handled by onresult/onerror already in most cases)
    };

    recognitionRef.current = recognition;
    setAgentState(STATES.LISTENING);
    recognition.start();
  }, [onTranscriptUpdate, speak]);

  // Start call
  const handleStartCall = useCallback(async () => {
    messagesRef.current = [];
    onTranscriptUpdate([]);
    isCallActiveRef.current = true;

    // Greeting
    const greeting =
      "Hi! I'm Aria from Aura Skincare. How can I help you today?";
    messagesRef.current = [{ role: 'assistant', content: greeting }];
    onTranscriptUpdate([...messagesRef.current]);
    await speak(greeting);

    setAgentState(STATES.LISTENING);
    startListening();
  }, [onTranscriptUpdate, speak, startListening]);

  // End call
  const handleEndCall = useCallback(() => {
    isCallActiveRef.current = false;
    // Stop recognition
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    // Stop TTS
    synthRef.current.cancel();
    setAgentState(STATES.ENDED);
    onCallEnd([...messagesRef.current]);
  }, [onCallEnd]);

  // Status indicator config
  const stateConfig = {
    IDLE: { label: 'Ready', color: '#6b7280', icon: '🎧', pulse: false },
    LISTENING: { label: 'Listening...', color: '#22c55e', icon: '🎤', pulse: true },
    THINKING: { label: 'Thinking...', color: '#f59e0b', icon: '🧠', pulse: true },
    SPEAKING: { label: 'Speaking...', color: '#6366f1', icon: '🔊', pulse: true },
    ENDED: { label: 'Call Ended', color: '#ef4444', icon: '📞', pulse: false },
  };

  const currentState = stateConfig[agentState];

  return (
    <div className="voice-agent">
      {/* Status Indicator */}
      <div className="agent-status">
        <div
          className={`status-dot ${currentState.pulse ? 'pulse' : ''}`}
          style={{ backgroundColor: currentState.color }}
        />
        <span className="status-icon">{currentState.icon}</span>
        <span className="status-label">{currentState.label}</span>
      </div>

      {/* Agent Avatar */}
      <div className="agent-avatar">
        <div
          className={`avatar-circle ${currentState.pulse ? 'avatar-pulse' : ''}`}
          style={{ borderColor: currentState.color }}
        >
          <span className="avatar-letter">A</span>
        </div>
        <h3 className="agent-name">Aria</h3>
        <p className="agent-role">AI Voice Support</p>
      </div>

      {/* Call Controls */}
      <div className="call-controls">
        {agentState === STATES.IDLE || agentState === STATES.ENDED ? (
          <button className="btn btn-start" onClick={handleStartCall}>
            📞 Start Call
          </button>
        ) : (
          <button className="btn btn-end" onClick={handleEndCall}>
            📵 End Call
          </button>
        )}
      </div>
    </div>
  );
}
