// lib/sarvam.ts
// Sarvam AI REST API helpers for text chat

const SARVAM_API_KEY = process.env.EXPO_PUBLIC_SARVAM_API_KEY ?? '';
const SARVAM_CHAT_URL = 'https://api.sarvam.ai/v1/chat/completions';

export type SarvamMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

/** Calls Sarvam 105b chat completions and returns the assistant's reply text. */
export async function sarvamChat(
  messages: SarvamMessage[],
  systemPrompt?: string,
): Promise<string> {
  const payload: SarvamMessage[] = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages;

  const res = await fetch(SARVAM_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-subscription-key': SARVAM_API_KEY,
    },
    body: JSON.stringify({
      model: 'sarvam-105b',
      messages: payload,
      temperature: 0.4,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Sarvam chat error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}
