import { AI_INSIGHTS_AVAILABLE } from './aiFlags';
import type { AnonymizedInsightPayload } from './aiPayload';

const XAI_CHAT_URL = 'https://api.x.ai/v1/chat/completions';
const MODEL = 'grok-4.6';

const SYSTEM_PROMPT = [
  'You are a wellness-tracking assistant for a personal blood pressure log.',
  'You are not a doctor and must not diagnose, treat, or give personalized medical orders.',
  'Use only the JSON numbers provided. Never ask for identity, notes, or exact dates.',
  'Reply in 3 to 5 short bullet points: what the latest reading means in AHA-style categories, how it compares to the 7-day averages, and one lifestyle talking point.',
  'If the latest category is crisis or stage2, urge the user to contact a clinician promptly.',
  'End with this exact sentence: This is not medical advice. Discuss readings with a qualified clinician.',
].join(' ');

export async function fetchGrokInsight(
  apiKey: string,
  payload: AnonymizedInsightPayload
): Promise<string> {
  if (!AI_INSIGHTS_AVAILABLE) {
    throw new Error('Grok insights are parked');
  }
  const response = await fetch(XAI_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      max_tokens: 350,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Anonymized BP summary (no identity, notes, or timestamps):\n${JSON.stringify(payload)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(detail || `Grok request failed (${response.status})`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Grok returned an empty response');
  return text;
}
