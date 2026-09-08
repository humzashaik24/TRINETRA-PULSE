/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      /* --- Colors --- */
      colors: {
        background: 'hsl(var(--color-background))',
        surface: {
          DEFAULT: 'hsl(var(--color-surface))',
          elevated: 'hsl(var(--color-surface-elevated))',
          hover: 'hsl(var(--color-surface-hover))',
          active: 'hsl(var(--color-surface-active))',
        },
        foreground: {
          DEFAULT: 'hsl(var(--color-text-primary))',
          secondary: 'hsl(var(--color-text-secondary))',
          muted: 'hsl(var(--color-text-muted))',
          disabled: 'hsl(var(--color-text-disabled))',
        },
        border: {
          DEFAULT: 'hsl(var(--color-border))',
          subtle: 'hsl(var(--color-border-subtle))',
          strong: 'hsl(var(--color-border-strong))',
          focus: 'hsl(var(--color-border-focus))',
        },
        brand: {
          DEFAULT: 'hsl(var(--color-brand))',
          hover: 'hsl(var(--color-brand-hover))',
          subtle: 'hsl(var(--color-brand-subtle))',
          foreground: 'hsl(var(--color-brand-foreground))',
        },
        ring: 'hsl(var(--color-ring))',
        success: {
          DEFAULT: 'hsl(var(--color-success))',
          subtle: 'hsl(var(--color-success-subtle))',
        },
        warning: {
          DEFAULT: 'hsl(var(--color-warning))',
          subtle: 'hsl(var(--color-warning-subtle))',
        },
        danger: {
          DEFAULT: 'hsl(var(--color-danger))',
          subtle: 'hsl(var(--color-danger-subtle))',
        },
        info: {
          DEFAULT: 'hsl(var(--color-info))',
          subtle: 'hsl(var(--color-info-subtle))',
        },
        entity: {
          DEFAULT: 'hsl(var(--color-entity))',
          subtle: 'hsl(var(--color-entity-subtle))',
          person: 'hsl(var(--color-entity-person))',
          phone: 'hsl(var(--color-entity-phone))',
          vehicle: 'hsl(var(--color-entity-vehicle))',
          location: 'hsl(var(--color-entity-location))',
          organization: 'hsl(var(--color-entity-organization))',
          account: 'hsl(var(--color-entity-account))',
          transaction: 'hsl(var(--color-entity-transaction))',
          event: 'hsl(var(--color-entity-event))',
          case: 'hsl(var(--color-entity-case))',
          document: 'hsl(var(--color-entity-document))',
          evidence: 'hsl(var(--color-entity-evidence))',
        },
        network: {
          DEFAULT: 'hsl(var(--color-network))',
          subtle: 'hsl(var(--color-network-subtle))',
        },
        evidence: {
          DEFAULT: 'hsl(var(--color-evidence))',
          subtle: 'hsl(var(--color-evidence-subtle))',
        },
        ai: {
          DEFAULT: 'hsl(var(--color-ai))',
          subtle: 'hsl(var(--color-ai-subtle))',
        },
        anomaly: {
          DEFAULT: 'hsl(var(--color-anomaly))',
          subtle: 'hsl(var(--color-anomaly-subtle))',
        },
        skeleton: {
          DEFAULT: 'hsl(var(--color-skeleton))',
          shimmer: 'hsl(var(--color-skeleton-shimmer))',
        },
        chart: {
          1: 'hsl(var(--color-chart-1))',
          2: 'hsl(var(--color-chart-2))',
          3: 'hsl(var(--color-chart-3))',
          4: 'hsl(var(--color-chart-4))',
          5: 'hsl(var(--color-chart-5))',
          6: 'hsl(var(--color-chart-6))',
          7: 'hsl(var(--color-chart-7))',
          8: 'hsl(var(--color-chart-8))',
        },
        graph: {
          node: 'hsl(var(--color-graph-node-default))',
          edge: 'hsl(var(--color-graph-edge-default))',
          'node-highlight': 'hsl(var(--color-graph-node-highlight))',
          'edge-highlight': 'hsl(var(--color-graph-edge-highlight))',
        },
      },

      /* --- Typography --- */
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'Cascadia Code', 'Fira Code', 'monospace'],
        display: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        'display-lg': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.025em', fontWeight: '700' }],
        'display-md': ['2.25rem', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-sm': ['1.875rem', { lineHeight: '1.2', letterSpacing: '-0.015em', fontWeight: '600' }],
        'heading-lg': ['1.5rem', { lineHeight: '1.25', letterSpacing: '-0.015em', fontWeight: '600' }],
        'heading-md': ['1.25rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }],
        'heading-sm': ['1.125rem', { lineHeight: '1.35', letterSpacing: '-0.005em', fontWeight: '600' }],
        'subheading': ['0.9375rem', { lineHeight: '1.4', letterSpacing: '-0.005em', fontWeight: '500' }],
        'body-lg': ['1rem', { lineHeight: '1.6', fontWeight: '400' }],
        'body': ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],
        'body-sm': ['0.8125rem', { lineHeight: '1.5', fontWeight: '400' }],
        'caption': ['0.75rem', { lineHeight: '1.4', fontWeight: '400' }],
        'label': ['0.75rem', { lineHeight: '1', letterSpacing: '0.03em', fontWeight: '500' }],
        'code': ['0.8125rem', { lineHeight: '1.5', fontFamily: 'var(--font-mono)' }],
        'overline': ['0.6875rem', { lineHeight: '1', letterSpacing: '0.06em', fontWeight: '600' }],
      },

      /* --- Spacing --- */
      spacing: {
        '0.5': '2px',
        '1': '4px',
        '1.5': '6px',
        '2': '8px',
        '2.5': '10px',
        '3': '12px',
        '3.5': '14px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '7': '28px',
        '8': '32px',
        '9': '36px',
        '10': '40px',
        '12': '48px',
        '14': '56px',
        '16': '64px',
        '20': '80px',
        '24': '96px',
      },

      /* --- Border radius --- */
      borderRadius: {
        'none': '0',
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
        'pill': 'var(--radius-pill)',
      },

      /* --- Box shadow --- */
      boxShadow: {
        'xs': 'var(--shadow-xs)',
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'overlay': 'var(--shadow-overlay)',
        'none': 'none',
      },

      /* --- Animation --- */
      transitionDuration: {
        'instant': 'var(--motion-instant)',
        'fast': 'var(--motion-fast)',
        'normal': 'var(--motion-normal)',
        'slow': 'var(--motion-slow)',
        'deliberate': 'var(--motion-deliberate)',
      },
      transitionTimingFunction: {
        'default': 'var(--ease-default)',
        'in': 'var(--ease-in)',
        'out': 'var(--ease-out)',
        'spring': 'var(--ease-spring)',
        'enter': 'var(--ease-enter)',
        'exit': 'var(--ease-exit)',
        'emphasized': 'var(--ease-emphasized)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(4px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-4px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms var(--ease-out)',
        'fade-out': 'fade-out 200ms var(--ease-out)',
        'slide-up': 'slide-up 200ms var(--ease-out)',
        'slide-down': 'slide-down 200ms var(--ease-out)',
        'scale-in': 'scale-in 150ms var(--ease-spring)',
        'pulse-subtle': 'pulse-subtle 2s var(--ease-default) infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
