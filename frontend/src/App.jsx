import { useState, useCallback } from 'react';
import VoiceAgent from './components/VoiceAgent';
import Transcript from './components/Transcript';
import OrderHelper from './components/OrderHelper';
import CallSummary from './components/CallSummary';
import { generateSummary } from './api';
import './App.css';

function App() {
  const [transcript, setTranscript] = useState([]);
  const [summary, setSummary] = useState(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  const handleTranscriptUpdate = useCallback((messages) => {
    setTranscript(messages);
  }, []);

  const handleCallEnd = useCallback(async (messages) => {
    if (messages.length < 2) return; // No real conversation

    setGeneratingSummary(true);
    try {
      const result = await generateSummary(messages);
      setSummary(result);
    } catch (err) {
      console.error('Summary generation failed:', err);
      setSummary({
        customer_intent: 'UNKNOWN',
        order_id: null,
        resolution_status: 'UNRESOLVED',
        call_summary: 'Failed to generate summary.',
      });
    } finally {
      setGeneratingSummary(false);
    }
  }, []);

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-brand">
          <h1 className="header-title">✨ Aura Skincare</h1>
          <p className="header-subtitle">AI Voice Customer Support</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {/* Left Column: Agent + Orders */}
        <div className="left-column">
          <VoiceAgent
            onTranscriptUpdate={handleTranscriptUpdate}
            onCallEnd={handleCallEnd}
          />
          <OrderHelper />
        </div>

        {/* Right Column: Transcript + Summary */}
        <div className="right-column">
          <Transcript messages={transcript} />
          {generatingSummary && (
            <div className="generating-summary">
              ⏳ Generating call summary...
            </div>
          )}
          <CallSummary summary={summary} />
        </div>
      </main>
    </div>
  );
}

export default App;
