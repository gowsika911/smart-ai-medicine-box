import { useEffect, useRef, useState } from 'react';
import axiosInstance from '../api/axiosInstance';

const SUGGESTIONS = [
  'Should I take my tablets before or after food?',
  'What are common side effects of Metformin?',
  'I forgot my morning dose. What should I do?',
  'Which foods should I avoid with BP medicines?',
];

const WELCOME = {
  role: 'assistant',
  content:
    "Hi! I'm the MedBox assistant. Ask me about your medicines, timing, food and side effects. " +
    "I can't diagnose or change your doses, so please check with your doctor for those.",
};

function Assistant() {
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending]);

  const send = async (text) => {
    const question = text.trim();
    if (!question || sending) return;

    setError('');
    // history = what was said before this question (the welcome message is not part of it)
    const history = messages.filter((m) => m !== WELCOME);
    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setInput('');
    setSending(true);

    try {
      const res = await axiosInstance.post('/chat', { message: question, history });
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.data.reply, emergency: !!res.data.emergency },
      ]);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not reach the assistant. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    send(input);
  };

  return (
    <div className="form-page">
      <header className="page-header">
        <div>
          <h1>Health assistant</h1>
          <p className="page-subtitle">AI answers about your medicines. General information only, not medical advice.</p>
        </div>
      </header>

      <div className="card-panel form-panel-wide chat-panel">
        <div className="chat-messages" aria-live="polite">
          {messages.map((m, i) => (
            <div key={i} className={`chat-bubble chat-${m.role} ${m.emergency ? 'chat-emergency' : ''}`}>
              {m.content}
            </div>
          ))}
          {sending && <div className="chat-bubble chat-assistant chat-typing">Thinking...</div>}
          <div ref={bottomRef} />
        </div>

        {messages.length === 1 && (
          <div className="chat-suggestions">
            {SUGGESTIONS.map((s) => (
              <button type="button" key={s} className="chat-chip" onClick={() => send(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        {error && <div className="alert-banner">{error}</div>}

        <form className="chat-form" onSubmit={handleSubmit}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your medicines..."
            maxLength={800}
            disabled={sending}
            aria-label="Your question"
          />
          <button type="submit" className="btn-primary" disabled={sending || !input.trim()}>
            Send
          </button>
        </form>

        <p className="chat-footnote">
          In an emergency call 112 (108 for an ambulance). Never change or skip a dose because of a chat answer.
        </p>
      </div>
    </div>
  );
}

export default Assistant;
