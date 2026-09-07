import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/ai.css';

const DEFAULT_CHIPS = [
  '⚖️ Intiqal vs Registry kya farq hai?',
  '💰 What currency is rent paid in?',
  '🔧 How do I report a maintenance emergency?',
  '📄 Standard lease terms in Pakistan',
  '🏢 How do rental requests work?',
];

export default function AiAssistant() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Salam ${user?.name ? user.name : 'there'}! I am **رہائش AI**, your smart rental and Pakistani property assistant.\n\nAll rents and invoices are managed in **PKR (Pakistani Rupees)**.\n\nHow can I help you today?`,
    },
  ]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const sendMessage = async (textToSend) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const stored = localStorage.getItem('token');
      let token = null;
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          token = parsed?.token || stored;
        } catch {
          token = stored;
        }
      }

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply || 'I am ready to help.' },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'All rents and charges are in PKR. Please ensure the backend is connected to receive live AI recommendations.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        className="ai-assistant-fab"
        onClick={() => setIsOpen(true)}
        aria-label="Open Rehainsh AI Assistant"
      >
        <span className="ai-fab-sparkle">✨</span>
        <span>Rehainsh AI</span>
      </button>

      {/* Expandable Chat Window */}
      {isOpen && (
        <div className="ai-modal-backdrop" onClick={() => setIsOpen(false)}>
          <div className="ai-chat-window" onClick={(e) => e.stopPropagation()}>
            <div className="ai-chat-header">
              <div className="ai-header-info">
                <div className="ai-header-avatar">✨</div>
                <div>
                  <h3 className="ai-header-title">رہائش AI Assistant</h3>
                  <p className="ai-header-subtitle">PKR Real Estate & Tenancy Assistant</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  style={{
                    background: '#047857',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/legal-ai');
                  }}
                  title="Open Pakistan Property Legal AI Suite"
                >
                  ⚖️ Legal AI
                </button>
                <button
                  className="ai-close-btn"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close Assistant"
                >
                  &times;
                </button>
              </div>
            </div>

            <div className="ai-chat-body">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`ai-message ${
                    m.role === 'user' ? 'ai-message-user' : 'ai-message-assistant'
                  }`}
                >
                  <div className="ai-msg-avatar">{m.role === 'user' ? '👤' : '✨'}</div>
                  <div className="ai-msg-bubble">{m.content}</div>
                </div>
              ))}

              {loading && (
                <div className="ai-message ai-message-assistant">
                  <div className="ai-msg-avatar">✨</div>
                  <div className="ai-msg-bubble ai-typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestion Chips */}
            <div className="ai-suggestion-chips">
              {DEFAULT_CHIPS.map((chip, idx) => (
                <button
                  key={idx}
                  className="ai-chip"
                  onClick={() => sendMessage(chip)}
                  disabled={loading}
                >
                  {chip}
                </button>
              ))}
            </div>

            <form className="ai-chat-footer" onSubmit={handleSubmit}>
              <input
                type="text"
                className="ai-chat-input"
                placeholder="Ask about rent, PKR payments, leases, repairs..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
              />
              <button
                type="submit"
                className="ai-send-btn"
                disabled={loading || !input.trim()}
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
