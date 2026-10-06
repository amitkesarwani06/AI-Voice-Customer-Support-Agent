export default function Transcript({ messages }) {
  if (!messages || messages.length === 0) {
    return (
      <div className="transcript">
        <h3 className="section-title">💬 Conversation</h3>
        <p className="transcript-empty">
          Start a call to begin the conversation...
        </p>
      </div>
    );
  }

  return (
    <div className="transcript">
      <h3 className="section-title">💬 Conversation</h3>
      <div className="transcript-messages">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`message ${msg.role === 'user' ? 'message-user' : 'message-agent'}`}
          >
            <span className="message-label">
              {msg.role === 'user' ? '👤 You' : '🤖 Aria'}
            </span>
            <p className="message-text">{msg.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
