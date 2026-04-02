'use client';

import { ALLOWED_GPT_MODEL_IDS } from '@/lib/openaiModels';

/** 라벨은 value와 동일(기본값만 표시 보조) */
const LABELS = {
  'gpt-5.4-mini': 'gpt-5.4-mini (기본)',
};

export default function GptModelSelect({ id, value, onChange, disabled }) {
  const g5 = ALLOWED_GPT_MODEL_IDS.filter((m) => m.startsWith('gpt-5'));
  const g4 = ALLOWED_GPT_MODEL_IDS.filter((m) => !m.startsWith('gpt-5'));

  return (
    <select id={id} className="modelSelect" value={value} onChange={onChange} disabled={disabled}>
      <optgroup label="GPT-5 세대">
        {g5.map((m) => (
          <option key={m} value={m}>
            {LABELS[m] ?? m}
          </option>
        ))}
      </optgroup>
      <optgroup label="GPT-4 / 이전">
        {g4.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </optgroup>
    </select>
  );
}
