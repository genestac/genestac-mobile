// lib/healthChat.ts
// Calls the Genestac CRM backend for AI Health Coach text chat.
// GPT-4o is used server-side with full user context (health assessments, daily logs, plans).
// The Supabase access token is sent as a Bearer token so the backend can identify the user.

import { supabase } from '@/lib/supabase';

const CRM_CHAT_URL = `${process.env.EXPO_PUBLIC_CRM_API_URL ?? 'https://api.genestac.com'}/api/mobile/health-chat`;

export type HealthChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

/**
 * Send a conversation to the CRM backend AI Health Coach endpoint.
 * Returns the assistant's reply text.
 *
 * @param messages  Full conversation history (user + assistant turns)
 */
export async function healthChat(messages: HealthChatMessage[]): Promise<string> {
  // Get the current Supabase access token
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  const res = await fetch(CRM_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Health chat error ${res.status}: ${text}`);
  }

  const json = await res.json() as { reply: string };
  return json.reply;
}
