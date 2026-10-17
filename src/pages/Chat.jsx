import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Layout from "../components/Layout";
import ModelSelector from "../components/ui/ModelSelector";
import { streamChatCompletion } from "../services/chat";

export default function Chat() {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [pending, setPending] = useState(false);
  const [model, setModel] = useState(() => localStorage.getItem("qpt-chat-model") || "");
  const scrollRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function handleModelChange(id) {
    setModel(id);
    localStorage.setItem("qpt-chat-model", id);
  }

  function updateLast(fn) {
    setMessages((prev) => [...prev.slice(0, -1), fn(prev[prev.length - 1])]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const value = input.trim();
    if (!value || !model || pending) return;

    const history = [...messages.filter((m) => !m.error), { role: "user", text: value }];
    setMessages((prev) => [...prev, { role: "user", text: value }, { role: "assistant", text: "" }]);
    setInput("");
    setPending(true);

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await streamChatCompletion({
        model,
        messages: history.map((m) => ({ role: m.role, content: m.text })),
        signal: controller.signal,
        onDelta: (text) => updateLast((m) => ({ ...m, text: m.text + text })),
      });
    } catch (err) {
      if (err.name === "AbortError") return;
      updateLast(() => ({ role: "assistant", text: t("chat.error"), error: true }));
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setPending(false);
    }
  }

  return (
    <Layout minimal>
      <section className="chat-page">
        <div className="chat-scroll" ref={scrollRef}>
          {messages.length === 0 ? (
            <p className="chat-empty">{t("chat.empty")}</p>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`chat-msg chat-msg-${m.role}${m.error ? " chat-msg-error" : ""}`}>
                {m.text || (m.role === "assistant" && pending && i === messages.length - 1 ? t("chat.thinking") : "")}
              </div>
            ))
          )}
        </div>
        <form className="chat-input-row" onSubmit={handleSubmit}>
          <ModelSelector value={model} onChange={handleModelChange} />
          <input
            className="chat-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("chat.placeholder")}
            aria-label={t("chat.placeholder")}
          />
          <button type="submit" className="chat-send" aria-label={t("chat.send")} disabled={pending || !model}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M3 11l18-8-8 18-2-8-8-2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
          </button>
        </form>
      </section>
    </Layout>
  );
}
