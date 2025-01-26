<!-- src/lib/components/Toast.svelte -->
<script lang="ts">
    import { onMount } from 'svelte';
    import { fade, fly } from 'svelte/transition';
    import { toasts, type Toast } from '$lib/stores/toasts.js';

    export let toast: Toast;

    onMount(() => {
        return () => {
            toasts.remove(toast.id);
        };
    });
</script>

<div
    class="toast {toast.type}"
    role="alert"
    transition:fade|local={{ duration: 200 }}
>
    <div class="content">
        <span class="message">{toast.message}</span>
    </div>
    <button 
        class="close"
        on:click={() => toasts.remove(toast.id)}
        aria-label="Close notification"
    >
        ×
    </button>
</div>

<style>
    .toast {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem;
        margin: 0.5rem;
        border-radius: 0.5rem;
        color: white;
        background: rgb(31 41 55);
        min-width: 300px;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    }

    .content {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    .message {
        font-size: 0.875rem;
    }

    .close {
        background: none;
        border: none;
        color: white;
        font-size: 1.25rem;
        cursor: pointer;
        padding: 0.25rem;
        opacity: 0.7;
        transition: opacity 0.2s;
    }

    .close:hover {
        opacity: 1;
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
</style>