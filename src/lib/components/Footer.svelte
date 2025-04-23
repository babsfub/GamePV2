<script>
    import Ad from "./Ad.svelte";
    
    let { copyright = `© ${new Date().getFullYear()} Game-PV` } = $props();
  </script>
  
  <footer class="footer">
    <div class="footer-content">
      <div class="footer-logo">
        <span class="footer-brand">Game-PV</span>
        <span class="footer-tagline">Blockchain Arcade Games</span>
      </div>
      
      <div class="footer-links">
        <a href="/about">About</a>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <a href="/contact">Contact</a>
      </div>
  
      <div class="footer-social">
        <a href="https://twitter.com/gamepv" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>
        </a>
        <a href="https://discord.gg/gamepv" target="_blank" rel="noopener noreferrer" aria-label="Discord">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 8.5 2 12l3.5 3.5M18.5 8.5 22 12l-3.5 3.5M9 22l3-20 3 20"></path></svg>
        </a>
        <a href="https://github.com/gamepv" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path><path d="M9 18c-4.51 2-5-2-7-2"></path></svg>
        </a>
      </div>
      <Ad />
      <div class="footer-copyright">
        {copyright}
      </div>
    </div>
  </footer>
  
  <style>
    .footer {
      padding: 1.5rem var(--spacing-screen-safe, 20px);
      background-color: var(--color-surface, #21212b);
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      color: var(--color-text-secondary, #94A3B8);
      padding-bottom: env(safe-area-inset-bottom, 1rem);
    }
  
    .footer-content {
      max-width: var(--max-width-game, 1200px);
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
  
    .footer-logo {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
  
    .footer-brand {
      font-family: 'Press Start 2P', cursive;
      color: var(--color-primary, #4ade80);
      font-size: 1.2rem;
      text-shadow: 0 0 5px var(--color-primary, #4ade80);
    }
  
    .footer-tagline {
      font-family: 'VT323', monospace;
      font-size: 1rem;
      margin-top: 0.3rem;
    }
  
    .footer-links {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 1.5rem;
    }
  
    .footer-links a {
      color: var(--color-text, #e5e5e5);
      text-decoration: none;
      font-family: 'VT323', monospace;
      font-size: 1rem;
      position: relative;
      transition: color 0.2s ease;
    }
  
    .footer-links a:hover {
      color: var(--color-primary, #4ade80);
    }
  
    .footer-links a:hover::after {
      content: '';
      position: absolute;
      bottom: -3px;
      left: 0;
      width: 100%;
      height: 1px;
      background-color: var(--color-primary, #4ade80);
      box-shadow: 0 0 5px var(--color-primary, #4ade80);
    }
  
    .footer-social {
      display: flex;
      justify-content: center;
      gap: 1.2rem;
    }
  
    .footer-social a {
      color: var(--color-text-secondary, #94A3B8);
      transition: color 0.2s, transform 0.2s;
    }
  
    .footer-social a:hover {
      color: var(--color-primary, #4ade80);
      transform: translateY(-2px);
    }
  
    .footer-ads {
      margin: 1rem 0;
      max-width: 728px;
      width: 100%;
      align-self: center;
      border-radius: 0.5rem;
      overflow: hidden;
      background-color: var(--color-surface-alt, #2a2a36);
    }
  
    .footer-copyright {
      text-align: center;
      font-size: 0.9rem;
      opacity: 0.8;
    }
  
    @media (min-width: 768px) {
      .footer-content {
        gap: 2rem;
      }
    }
  </style>