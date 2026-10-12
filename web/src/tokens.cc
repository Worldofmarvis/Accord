:root {
  /* ---------- Color: brand ---------- */
  --color-brand-header: #142c8e; 
  --color-brand-header-active: #27419a; 
  --color-primary: #003087; 
  --color-primary-hover: #001f5c; 
  --color-primary-contrast: #ffffff; /* text on primary and header */

  --color-accent: #0070e0; 
  --color-accent-strong: #0057b3; 
  --color-accent-soft: #e6f0fd; /* added: light blue fill for highlighted cards */

  /* ---------- Color: surfaces ---------- */
  --color-bg: #faf8f5; /* sampled: page background (warm off-white) */
  --color-surface: #ffffff; /* sampled: cards and panels */
  --color-surface-muted: #f3f1ed; /* added: table headers, disabled fields */
  --color-surface-hover: #f0eeea; /* added: hover on rows and ghost buttons */

  /* ---------- Color: text ---------- */
  --color-text: #001435; 
  --color-text-muted: #5b6577; 
  --color-text-subtle: #8a93a3; 

  /* ---------- Color: borders ---------- */
  --color-border: #e5e5e5; /* sampled: card and input borders */
  --color-border-soft: #efefef; /* added: dividers inside cards */
  --color-border-strong: #9aa3b2; 

  /* ---------- Color: status ---------- */
  --color-danger: #d50102; /* sampled: alert banner red (blocked offer, failed payment) */
  --color-danger-soft: #fde8e8;
  --color-success: #0a7a43; 
  --color-success-soft: #e3f4ea;
  --color-warning: #b45f06; /* added: round 3 warning, seller locked */
  --color-warning-soft: #fdf1dc;
  --color-info: var(--color-accent);
  --color-info-soft: var(--color-accent-soft);

  /* ---------- Color: negotiation roles (added) ---------- */
  --color-buyer: #0070e0; 
  --color-buyer-soft: #e6f0fd;
  --color-seller: #0b7a75; 
  --color-seller-soft: #e1f3f1;

  /* ---------- Focus ---------- */
  --focus-ring: 2px solid var(--color-accent-strong);
  --focus-offset: 2px;

  /* ---------- Typography: families ---------- */
  --font-sans: 'Helvetica Neue', Helvetica, Arial, system-ui, -apple-system, 'Segoe UI',
    Roboto, sans-serif;
  --font-mono: ui-monospace, 'SF Mono', Consolas, 'Liberation Mono', monospace;

  /* ---------- Typography: sizes (rem, 16px base) ---------- */
  --text-xs: 0.75rem; 
  --text-sm: 0.875rem; 
  --text-base: 1rem; 
  --text-lg: 1.125rem; 
  --text-xl: 1.375rem; 
  --text-2xl: 1.75rem; 
  --text-3xl: 2.5rem; 

  /* ---------- Typography: weights and line heights ---------- */
  --weight-regular: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700; 

  --leading-tight: 1.2; 
  --leading-normal: 1.5; 
  --leading-loose: 1.7; 

  /* ---------- Spacing (4px base) ---------- */
  --space-0: 0;
  --space-1: 0.25rem; 
  --space-2: 0.5rem; 
  --space-3: 0.75rem; 
  --space-4: 1rem; 
  --space-5: 1.5rem; 
  --space-6: 2rem; 
  --space-7: 3rem; 
  --space-8: 4rem; 

  /* ---------- Shape ---------- */
  --radius-sm: 8px;
  --radius-md: 12px; 
  --radius-lg: 16px; 
  --radius-pill: 999px; 

  --border-width: 1px;


  --shadow-sm: 0 1px 2px rgba(0, 20, 53, 0.06);
  --shadow-md: 0 4px 12px rgba(0, 20, 53, 0.1);
  --shadow-lg: 0 12px 28px rgba(0, 20, 53, 0.16);

  
  --content-max-width: 1100px;
  --page-gutter: var(--space-5);
  --header-height: 64px;

  
  --transition-fast: 120ms ease;
  --transition-base: 200ms ease;
}


@media (max-width: 640px) {
  :root {
    --page-gutter: var(--space-4);
  }
}
