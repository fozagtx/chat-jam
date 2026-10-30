import { noteForDegree, type Layer } from './music.js';

interface VibePattern {
  instrument: 'bass' | 'melody';
  steps: number[];
  degrees: number[];
}

const layerSchema = {
  type: 'object',
  properties: {
    instrument: { type: 'string', enum: ['bass', 'melody'] },
    steps: {
      type: 'array',
      items: { type: 'integer', minimum: 0, maximum: 15 },
      minItems: 16,
      maxItems: 16,
    },
    degrees: {
      type: 'array',
      items: { type: 'integer', minimum: 0, maximum: 6 },
      minItems: 16,
      maxItems: 16,
    },
  },
  required: ['instrument', 'steps', 'degrees'],
  additionalProperties: false,
};

export type VibeResult = { layer: Layer } | { disabled: true } | null;

export async function createVibeLayer(
  text: string,
  userId: string,
  userName: string,
  color: string,
  key: string,
  scale: string,
): Promise<VibeResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { disabled: true };

  const moderation = await fetch('https://api.openai.com/v1/moderations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: text }),
  });
  if (!moderation.ok) throw new Error('OpenAI moderation request failed');
  const moderationResult = (await moderation.json()) as {
    results?: Array<{ flagged?: boolean }>;
  };
  if (moderationResult.results?.[0]?.flagged) return null;

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      input: `Create a musical pattern for this mood: ${text}`,
      text: {
        format: {
          type: 'json_schema',
          name: 'music_layer',
          strict: true,
          schema: layerSchema,
        },
      },
    }),
  });
  if (!response.ok) throw new Error('OpenAI pattern request failed');
  const result = (await response.json()) as {
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };
  const output = result.output
    ?.flatMap((item) => item.content ?? [])
    .find((item) => item.type === 'output_text')?.text;
  if (!output) return null;

  const pattern = JSON.parse(output) as VibePattern;
  return {
    layer: {
      id: crypto.randomUUID(),
      userId,
      userName,
      color,
      instrument: 'vibe',
      steps: pattern.steps,
      degrees: pattern.degrees,
      notes: pattern.degrees.map((degree) => noteForDegree(key, scale, degree, 3)),
      createdAt: Date.now(),
    },
  };
}
