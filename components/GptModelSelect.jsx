'use client';

import { OPENAI_MODEL_IDS, CLAUDE_MODEL_IDS } from '@/lib/aiModels';

const LABELS = {
  'gpt-5.4-mini': 'gpt-5.4-mini (기본)',
  'claude-opus-4-6': 'Claude Opus 4.6',
  'claude-sonnet-4-6': 'Claude Sonnet 4.6',
  'claude-opus-4-5-20251101': 'Claude Opus 4.5',
  'claude-sonnet-4-5-20250929': 'Claude Sonnet 4.5',
  'claude-haiku-4-5-20251001': 'Claude Haiku 4.5',
  'claude-opus-4-20250514': 'Claude Opus 4',
  'claude-sonnet-4-20250514': 'Claude Sonnet 4',
};

export default function GptModelSelect({ id, value, onChange, disabled }) {
  const gpt5 = OPENAI_MODEL_IDS.filter((m) => m.startsWith('gpt-5'));
  const gpt4 = OPENAI_MODEL_IDS.filter((m) => !m.startsWith('gpt-5'));

  return (
    <select id={id} className="modelSelect" value={value} onChange={onChange} disabled={disabled}>
      <optgroup label="GPT-5 세대">
        {gpt5.map((m) => (
          <option key={m} value={m}>
            {LABELS[m] ?? m}
          </option>
        ))}
      </optgroup>
      <optgroup label="GPT-4 / 이전">
        {gpt4.map((m) => (
          <option key={m} value={m}>
            {LABELS[m] ?? m}
          </option>
        ))}
      </optgroup>
      <optgroup label="Claude (Anthropic)">
        {CLAUDE_MODEL_IDS.map((m) => (
          <option key={m} value={m}>
            {LABELS[m] ?? m}
          </option>
        ))}
      </optgroup>
    </select>
  );
}
