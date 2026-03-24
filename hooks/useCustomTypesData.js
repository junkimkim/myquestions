'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export function useCustomTypesData() {
  const [customTypes, setCustomTypes] = useState([]);
  const [prompts, setPrompts] = useState({});
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const hydratedRef = useRef(false);

  const reload = useCallback(async () => {
    try {
      const res = await fetch('/api/custom-types', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoadError(data.error || `불러오기 실패 (${res.status})`);
        setCustomTypes([]);
        setPrompts({});
        hydratedRef.current = true;
        setReady(true);
        return;
      }
      setLoadError(null);
      setCustomTypes(Array.isArray(data.types) ? data.types : []);
      setPrompts(data.prompts && typeof data.prompts === 'object' ? data.prompts : {});
      hydratedRef.current = true;
      setReady(true);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
      setCustomTypes([]);
      setPrompts({});
      hydratedRef.current = true;
      setReady(true);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const removeCustomType = useCallback(
    async (id) => {
      const res = await fetch(`/api/custom-types/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.ok) await reload();
      return res;
    },
    [reload],
  );

  const updateCustomType = useCallback(
    async (id, patch) => {
      const res = await fetch(`/api/custom-types/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (res.ok) await reload();
      return res;
    },
    [reload],
  );

  const createCustomType = useCallback(
    async (payload) => {
      const res = await fetch('/api/custom-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) await reload();
      return res;
    },
    [reload],
  );

  const bulkUpsertPrompts = useCallback(
    async (items) => {
      const res = await fetch('/api/custom-types', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (res.ok) await reload();
      return res;
    },
    [reload],
  );

  return {
    customTypes,
    prompts,
    setPrompts,
    removeCustomType,
    updateCustomType,
    createCustomType,
    bulkUpsertPrompts,
    reload,
    loadError,
    ready,
  };
}
