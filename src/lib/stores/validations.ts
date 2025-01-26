// src/lib/stores/validation.ts
import { writable } from 'svelte/store';
import type { Score, RoundInfo, ValidationState } from '$lib/types/scores.js';

interface ValidationStore {
  loading: boolean;
  verifying: boolean;
  error: string | null;
  currentRound: RoundInfo | null;
  pendingScores: Score[];
  selectedScores: Set<number>;
  batchValidation: ValidationState;
  generatedHashes: { [key: number]: string };
}

function createValidationStore() {
  const { subscribe, set, update } = writable<ValidationStore>({
    loading: true,
    verifying: false,
    error: null,
    currentRound: null,
    pendingScores: [],
    selectedScores: new Set(),
    batchValidation: {},
    generatedHashes: {}
  });

  return {
    subscribe,
    setLoading: (loading: boolean) => update(s => ({ ...s, loading })),
    setVerifying: (verifying: boolean) => update(s => ({ ...s, verifying })),
    setError: (error: string | null) => update(s => ({ ...s, error })),
    setCurrentRound: (currentRound: RoundInfo | null) => update(s => ({ ...s, currentRound })),
    setPendingScores: (pendingScores: Score[]) => update(s => ({ ...s, pendingScores })),
    toggleScore: (index: number) => update(s => {
      const selectedScores = new Set(s.selectedScores);
      if (selectedScores.has(index)) {
        selectedScores.delete(index);
        const { [index]: _, ...rest } = s.batchValidation;
        return { ...s, selectedScores, batchValidation: rest };
      }
      selectedScores.add(index);
      return { ...s, selectedScores };
    }),
    toggleAllScores: () => update(s => {
      const selectedScores = new Set<number>();
      if (s.selectedScores.size !== s.pendingScores.length) {
        s.pendingScores.forEach((_, i) => selectedScores.add(i));
      }
      return { ...s, selectedScores };
    }),
    setValidation: (index: number, isValid: boolean) => update(s => {
      const selectedScores = new Set(s.selectedScores).add(index);
      return {
        ...s,
        selectedScores,
        batchValidation: { ...s.batchValidation, [index]: isValid }
      };
    }),
    reset: () => update(s => ({
      ...s,
      selectedScores: new Set(),
      batchValidation: {},
      generatedHashes: {}
    }))
  };
}

export const validationStore = createValidationStore();