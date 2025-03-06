// src/lib/state/validation.svelte.ts
import { setContext, getContext } from 'svelte';
import type { 
  ValidationState as ValidationStateType,
  RoundView,
  Score,
  VerifiedScore,
  ValidationMetadata,
  ValidationResult 
} from '$lib/types.js';

const VALIDATION_STATE_KEY = Symbol('validation-state');

export class ValidationState {
  // États de base
  currentRound = $state<RoundView | null>(null);
  pendingScores = $state<Score[]>([]);
  selectedScores = $state<Set<number>>(new Set());
  batchValidation = $state<Record<number, boolean>>({});
  verifiedScores = $state<VerifiedScore[]>([]);

  // États UI
  error = $state<string | null>(null);
  loading = $state<boolean>(false);
  verifying = $state<boolean>(false);

  // Métadonnées de validation
  metadata = $state<ValidationMetadata | null>(null);
  validationResults = $state<ValidationResult[]>([]);

  // Métriques
  metrics = $state<{
    totalVerified: number;
    successRate: number;
    averageVerificationTime: number;
  }>({
    totalVerified: 0,
    successRate: 0,
    averageVerificationTime: 0
  });

  // Méthodes de mise à jour des états
  setCurrentRound(round: RoundView) {
    this.currentRound = round;
  }

  setPendingScores(scores: Score[]) {
    this.pendingScores = scores;
  }

  setSelectedScores(scores: Set<number>) {
    this.selectedScores = scores;
  }

  setBatchValidation(validation: Record<number, boolean>) {
    this.batchValidation = validation;
  }

  addVerifiedScore(score: VerifiedScore) {
    this.verifiedScores = [...this.verifiedScores, score];
    this.updateMetrics();
  }

  // Méthodes de gestion des états UI
  setError(error: string | null) {
    this.error = error;
  }

  setLoading(loading: boolean) {
    this.loading = loading;
  }

  setVerifying(verifying: boolean) {
    this.verifying = verifying;
  }

  // Méthodes de gestion des métadonnées
  setValidationMetadata(metadata: ValidationMetadata) {
    this.metadata = metadata;
  }

  addValidationResult(result: ValidationResult) {
    this.validationResults = [...this.validationResults, result];
    this.updateMetrics();
  }

  // Méthodes utilitaires
  clearValidationState() {
    this.selectedScores.clear();
    this.batchValidation = {};
    this.error = null;
    this.metadata = null;
  }

  private updateMetrics() {
    const total = this.validationResults.length;
    if (total === 0) return;

    const successful = this.validationResults.filter(r => r.isValid).length;
    const totalTime = this.validationResults.reduce((sum, r) => sum + (r.timestamp || 0), 0);

    this.metrics = {
      totalVerified: total,
      successRate: (successful / total) * 100,
      averageVerificationTime: totalTime / total
    };
  }

  // Getters pour les métadonnées
  getValidationMetadata(): ValidationMetadata | null {
    return this.metadata;
  }

  getMetrics() {
    return this.metrics;
  }

  getValidationResults() {
    return this.validationResults;
  }
}

export function createValidationState() {
  const state = new ValidationState();
  setContext(VALIDATION_STATE_KEY, state);
  return state;
}

export function getValidationState(): ValidationState {
  const state = getContext<ValidationState>(VALIDATION_STATE_KEY);
  if (!state) throw new Error('ValidationState not found in context');
  return state;
}