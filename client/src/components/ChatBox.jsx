import { useEffect, useRef, useState } from 'react';

/** Generic chat UI. onSend(text, history) must return the assistant reply string. */
export default function ChatBox({ initial = [], onSend, placeholder = 'Type a message…', disabled }) {
  const [msgs, setMsgs] = useState(initial); // initial is only used on first mount
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  const send = async () => {
    const t = text.trim();
    if (!t || busy) return;
    const history = msgs;
    setText('');
    setBusy(true);
    setMsgs((m) => [...m, { role: 'user', content: t }]);
    try {
      const reply = await onSend(t, history);
      setMsgs((m) => [...m, { role: 'assistant', content: reply }]);
    } catch {
      setMsgs((m) => [...m, { role: 'assistant', content: 'Something went wrong. Try again.' }]);
    }
    setBusy(false);
  };

  return (
    <div className="chat">
      <div className="chat-log">
        {msgs.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>{m.content}</div>
        ))}
        {busy && <div className="bubble assistant">…</div>}
        <div ref={end} />
      </div>
      <div className="chat-input">
        <textarea
          rows={2}
          value={text}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button className="btn" onClick={send} disabled={busy || disabled}>Send</button>
      </div>
    </div>
  );
}