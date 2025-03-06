<script lang="ts">
    import { onMount } from 'svelte';
    import { fade, fly } from 'svelte/transition';
    import { browser } from '$app/environment';
    import type { Toast as ToastType } from '$lib/state/ui.svelte.js';
    import { getUIState } from '$lib/state/ui.svelte.js';

    const { toast } = $props<{ toast: ToastType }>();
    const uiState = getUIState();

    // États avec Runes
    let destroyed = $state(false);
    let timeoutId = $state<number | undefined>(undefined);
    let startTime = $state(Date.now());

    // Calcul du temps restant avec Runes
    let remainingTime = $derived(
        toast.duration ? Math.max(0, startTime + toast.duration - Date.now()) : 0
    );

    // Gestion de la durée d'affichage automatique avec Runes
    $effect(() => {
        if (browser && !destroyed && toast.duration) {
            timeoutId = window.setTimeout(destroyToast, toast.duration);
            return () => {
                if (timeoutId) window.clearTimeout(timeoutId);
            };
        }
    });

    // Nettoyage au démontage du composant
    onMount(() => {
        return () => {
            if (timeoutId) window.clearTimeout(timeoutId);
            if (!destroyed) destroyToast();
        };
    });

    async function destroyToast() {
        if (destroyed) return;
        destroyed = true;

        if (browser) {
            await new Promise(resolve => setTimeout(resolve, 300));
            uiState.removeToast(toast.id);
        }
    }

    function handleMouseEnter() {
        if (timeoutId) {
            window.clearTimeout(timeoutId);
            timeoutId = undefined;
        }
    }

    function handleMouseLeave() {
        if (!destroyed && toast.duration && remainingTime > 0) {
            timeoutId = window.setTimeout(destroyToast, remainingTime);
        }
    }
</script>


{#if browser}
    <div
        class="toast {toast.type}"
        class:disintegrating={destroyed}
        role="alert"
        in:fly|local={{ y: 50, duration: 300 }}
        out:fade|local={{ duration: 300 }}
        onmouseenter={handleMouseEnter}
        onmouseleave={handleMouseLeave}
    >
        {#if toast.icon}
            <div class="icon" aria-hidden="true">
                {toast.icon}
            </div>
        {/if}

        <div class="content">
            <span class="message">{toast.message}</span>
        </div>

        <button
            type="button"
            class="close"
            onclick={destroyToast}
            aria-label="Fermer la notification"
        >
            <span aria-hidden="true">&times;</span>
        </button>

        {#if !destroyed && toast.progress && toast.duration}
            <div 
                class="progress"
                style:--duration="{toast.duration}ms"
            ></div>
        {/if}
    </div>
{/if}

<style>
    .toast {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 1rem;
        margin: 0.5rem;
        border-radius: 0.5rem;
        color: white;
        background: rgb(31 41 55);
        min-width: 300px;
        max-width: 100%;
        position: relative;
        overflow: hidden;
        box-shadow: 
            0 4px 6px -1px rgb(0 0 0 / 0.1),
            0 2px 4px -2px rgb(0 0 0 / 0.1);
        animation: slideIn 0.3s ease-out;
    }

    .icon {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 1.5rem;
        height: 1.5rem;
        font-size: 1rem;
    }

    .content {
        flex: 1;
        min-width: 0;
    }

    .message {
        display: block;
        font-size: 0.875rem;
        line-height: 1.25rem;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .close {
        flex-shrink: 0;
        background: none;
        border: none;
        color: currentColor;
        padding: 0.25rem;
        cursor: pointer;
        opacity: 0.7;
        transition: opacity 0.2s;
    }

    .close:hover {
        opacity: 1;
    }

    .progress {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 3px;
        background: rgba(255, 255, 255, 0.3);
        transform-origin: left;
        animation: progress linear forwards;
        animation-duration: var(--duration);
    }

    /* Animations */
    @keyframes slideIn {
        from {
            transform: translateX(100%) scale(0.5);
            opacity: 0;
        }
        to {
            transform: translateX(0) scale(1);
            opacity: 1;
        }
    }

    @keyframes progress {
        from { transform: scaleX(1); }
        to { transform: scaleX(0); }
    }

    .disintegrating {
        animation: disintegrate 0.3s ease-out forwards;
    }

    @keyframes disintegrate {
        0% {
            transform: scale(1);
            opacity: 1;
        }
        100% {
            transform: scale(0.8);
            opacity: 0;
        }
    }

    /* Types de toasts */
    .success {
        background: rgb(22 163 74);
    }

    .error {
        background: rgb(220 38 38);
    }

    .warning {
        background: rgb(234 179 8);
    }

    .info {
        background: rgb(59 130 246);
    }

    /* Media queries */
    @media (max-width: 640px) {
        .toast {
            width: calc(100vw - 2rem);
            min-width: 0;
            margin: 0.5rem 1rem;
        }
    }
</style>