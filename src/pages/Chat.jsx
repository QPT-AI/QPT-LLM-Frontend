import { useState } from "react";
import { useTranslation } from "react-i18next";
import Layout from "../components/Layout";
import ModelSelector from "../components/ui/ModelSelector";

export default function Chat() {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [model, setModel] = useState(() => localStorage.getItem("qpt-chat-model") || "");

  function handleModelChange(id) {
    setModel(id);
    localStorage.setItem("qpt-chat-model", id);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const value = input.trim();
    if (!value) return;
    setMessages((prev) => [...prev, { role: "user", text: value }]);
    setMessages((prev) => [...prev, { role: "assistant", text: t("chat.placeholderReply") }]);
    setInput("");
  }

  return (
    <Layout minimal>
      <section className="chat-page">
        <div className="chat-scroll">
          {messages.length === 0 ? (
            <p className="chat-empty">{t("chat.empty")}</p>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`chat-msg chat-msg-${m.role}`}>
                {m.text}
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
          <button type="submit" className="chat-send" aria-label={t("chat.send")}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M3 11l18-8-8 18-2-8-8-2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
          </button>
        </form>
      </section>
    </Layout>
  );
}
