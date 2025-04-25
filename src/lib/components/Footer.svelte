<script>
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
          <!-- SVG Twitter -->
        </a>
        <a href="https://discord.gg/gamepv" target="_blank" rel="noopener noreferrer" aria-label="Discord">
          <!-- SVG Discord -->
        </a>
        <a href="https://github.com/gamepv" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
          <!-- SVG GitHub -->
        </a>
      </div>
     
      <div class="footer-copy">
        {copyright}
      </div>
    </div>
  </footer>
  
  <style>
    /* Stick footer to bottom of viewport */
    .footer {
      
      bottom: 0;
      left: 0;
      width: 100%;
      padding: 0.75rem var(--spacing-screen-safe, 20px);
      background-color: var(--color-surface, #21212b);
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      color: var(--color-text-secondary, #94A3B8);
      
    }
  
    /* Center and tighten content */
    .footer-content {
      max-width: var(--max-width-game, 1200px);
      margin: 0 auto;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
    }
  
    .footer-logo {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
  
    .footer-brand {
      font-family: 'Press Start 2P', cursive;
      color: var(--color-primary, #4ade80);
      font-size: 1rem;
      text-shadow: 0 0 5px var(--color-primary, #4ade80);
    }
  
    .footer-tagline {
      font-family: 'VT323', monospace;
      font-size: 0.9rem;
      margin-top: 0.2rem;
    }
  
    .footer-links,
    .footer-social {
      display: flex;
      gap: 1rem;
      align-items: center;
    }
  
    .footer-links a,
    .footer-social a {
      color: var(--color-text, #e5e5e5);
      text-decoration: none;
      font-family: 'VT323', monospace;
      font-size: 0.9rem;
      transition: color 0.2s;
    }
  
    .footer-links a:hover,
    .footer-social a:hover {
      color: var(--color-primary, #4ade80);
    }
  
    .footer-social a {
      transition: transform 0.2s;
    }
  
    .footer-social a:hover {
      transform: translateY(-2px);
    }
  
    .footer-copy {
      font-size: 0.8rem;
      opacity: 0.8;
    }
  
    @media (max-width: 768px) {
      .footer-content {
        flex-direction: column;
        gap: 0.5rem;
      }
    }
  </style>
  