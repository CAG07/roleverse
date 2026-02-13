import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        parchment: '#f4e4c1',
        'parchment-dark': '#d4c4a1',
        'ink-brown': '#3e2723',
        'ink-dark': '#1a0f0a',
        'gold-accent': '#c9a84c',
        'gold-light': '#e0c872',
        'blood-red': '#8b0000',
        'dungeon-gray': '#2a2a2a',
        'stone-gray': '#4a4a4a',
      },
      fontFamily: {
        medieval: ['MedievalSharp', 'Georgia', 'serif'],
        body: ['Crimson Text', 'Georgia', 'serif'],
      },
      backgroundImage: {
        'parchment-texture':
          'radial-gradient(ellipse at center, #f4e4c1 0%, #d4c4a1 100%)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
