const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function sendChat(messages) {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) throw new Error(`Chat API error: ${res.status}`);
  const data = await res.json();
  return data.reply;
}

export async function generateSummary(messages) {
  const res = await fetch(`${API_URL}/api/summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) throw new Error(`Summary API error: ${res.status}`);
  return await res.json();
}
