import { API_BASE } from "../config/constants";

// Streams an OpenAI-compatible chat completion, calling onDelta with each text chunk.
export async function streamChatCompletion({ model, messages, temperature = 1, signal, onDelta }) {
  const res = await fetch(`${API_BASE}/openai/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, stream: true, temperature }),
    signal,
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);

  // Backend may ignore stream and answer with a single JSON object.
  if ((res.headers.get("content-type") || "").includes("application/json")) {
    const data = await res.json();
    onDelta(data?.choices?.[0]?.message?.content ?? "");
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop();
    for (const event of events) {
      for (const line of event.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (payload === "[DONE]") return;
        const chunk = JSON.parse(payload);
        const text = chunk?.choices?.[0]?.delta?.content;
        if (text) onDelta(text);
      }
    }
  }
}
