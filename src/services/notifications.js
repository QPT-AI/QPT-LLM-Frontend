import { API_BASE } from "../config/constants";

export async function registerEmail(email) {
  const res = await fetch(`${API_BASE}/notifications/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}
