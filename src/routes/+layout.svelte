<script lang="ts">
  import Header from '$lib/components/Header.svelte';
  import type { PageData } from '$lib/types.js';
  import '../app.css';

  let { data, children } = $props<{ data: PageData, children: any }>();
</script>

<div class="app">
  <Header isAdmin={data.isAdmin} />

  <main class="main">
    {@render children()}
  </main>

  <footer class="footer">
    <p>© 2024 Retro Gaming Platform</p>
  </footer>
</div>

<style>
  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .main {
    flex: 1;
  }

  .footer {
    padding: 1rem;
    text-align: center;
    color: var(--color-text-secondary);
    background: var(--color-surface);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
</style>

