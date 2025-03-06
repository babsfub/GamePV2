// lib/state/ui.ts
import { setContext, getContext } from 'svelte';
import { browser } from '$app/environment';
import type { GameId } from '$lib/types.js';

const UI_STATE_KEY = Symbol('ui-state');

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  progress?: boolean;
  icon?: string;
  timestamp: number;
}

export interface ToastOptions {
  duration?: number;
  progress?: boolean;
  icon?: string;
}

export class UIState {
  // États de base
  selectedGame = $state<GameId | null>(null);
  isMobileMenuOpen = $state(false);
  toasts = $state<Toast[]>([]);
  isLoading = $state(false);

  // Configuration par défaut des toasts
  private readonly defaultToastOptions: Required<Omit<ToastOptions, 'icon'>> = {
    duration: 5000,
    progress: true
  };

  // Gestion du menu mobile
  toggleMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMenu() {
    this.isMobileMenuOpen = false;
  }

  // Sélection du jeu
  selectGame(gameId: GameId | null) {
    this.selectedGame = gameId;
    this.closeMenu();
  }

  // Gestion des toasts
  showToast(type: ToastType, message: string, options: ToastOptions = {}) {
    if (!browser) return; // Pas de toasts pendant le SSR

    const { duration, progress, icon } = { ...this.defaultToastOptions, ...options };
    
    const toast: Toast = {
      id: crypto.randomUUID(),
      type,
      message,
      duration,
      progress,
      icon,
      timestamp: Date.now()
    };

    // Ajout du nouveau toast et tri par timestamp
    this.toasts = [...this.toasts, toast]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5); // Limite le nombre de toasts affichés

    if (duration > 0) {
      setTimeout(() => this.removeToast(toast.id), duration);
    }

    return toast.id;
  }

  removeToast(id: string) {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }

  clearToasts() {
    this.toasts = [];
  }

  // Helpers pour les différents types de toasts
  success(message: string, options?: ToastOptions) {
    return this.showToast('success', message, {
      icon: '✓',
      ...options
    });
  }

  error(message: string, options?: ToastOptions) {
    return this.showToast('error', message, {
      duration: 0, // Les erreurs restent visibles jusqu'à ce qu'on les ferme
      icon: '✕',
      ...options
    });
  }

  warning(message: string, options?: ToastOptions) {
    return this.showToast('warning', message, {
      icon: '⚠',
      ...options
    });
  }

  info(message: string, options?: ToastOptions) {
    return this.showToast('info', message, {
      icon: 'ℹ',
      ...options
    });
  }

  // Gestion du loader
  startLoading() {
    this.isLoading = true;
  }

  stopLoading() {
    this.isLoading = false;
  }
}

// Fonctions de gestion du contexte
export function createUIState() {
  const state = new UIState();
  setContext(UI_STATE_KEY, state);
  return state;
}

export function getUIState(): UIState {
  const state = getContext<UIState>(UI_STATE_KEY);
  if (!state) throw new Error('UIState not found in context');
  return state;
}