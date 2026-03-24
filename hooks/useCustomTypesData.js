'use client';

import { useEffect, useRef, useState } from 'react';
import { defaultCustomPromptForKind, getTypeKind } from '@/lib/defaultPrompts';
import {
  loadCustomTypes,
  loadPromptsPartial,
  mergeCustomTypesFromSources,
  saveCustomTypes,
  savePromptsPartial,
} from '@/lib/quizforgeStorage';

function defaultPromptForType(c) {
  return defaultCustomPromptForKind(getTypeKind(c));
}

function buildPromptsMap(types, mergedPartial) {
  const merged = { ...(mergedPartial || {}) };
  const out = {};
  for (const c of types) {
    out[c.id] = merged[c.id] ?? defaultPromptForType(c);
  }
  return out;
}

export function useCustomTypesData() {
  const [customTypes, setCustomTypes] = useState([]);
  const [prompts, setPrompts] = useState({});
  const [ready, setReady] = useState(false);
  const hydratedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const lsTypes = loadCustomTypes();
      const lsPartial = loadPromptsPartial() || {};

      let seedTypes = [];
      let seedPrompts = {};
      try {
        const [tRes, pRes] = await Promise.all([
          fetch('/seed/customTypes.json', { cache: 'no-store' }),
          fetch('/seed/customPrompts.json', { cache: 'no-store' }),
        ]);
        if (tRes.ok) {
          const j = await tRes.json();
          if (Array.isArray(j)) seedTypes = j;
        }
        if (pRes.ok) {
          const j = await pRes.json();
          if (j && typeof j === 'object' && j !== null) seedPrompts = j;
        }
      } catch {
        /* ignore */
      }

      if (cancelled) return;

      const types = mergeCustomTypesFromSources(seedTypes, lsTypes);
      const mergedPartial = { ...seedPrompts, ...lsPartial };
      const promptsMap = buildPromptsMap(types, mergedPartial);

      setCustomTypes(types);
      setPrompts(promptsMap);
      hydratedRef.current = true;
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    savePromptsPartial(prompts);
  }, [prompts]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    saveCustomTypes(customTypes);
  }, [customTypes]);

  return {
    customTypes,
    setCustomTypes,
    prompts,
    setPrompts,
    ready,
  };
}
