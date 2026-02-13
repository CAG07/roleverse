import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: '#f0ecc9',
        'cream-dark': '#e0dbb5',
        brown: '#503d2e',
        'brown-dark': '#3a2a1e',
        gold: '#e3a72f',
        'gold-light': '#edc05a',
        rust: '#d54b1a',
        teal: '#058789',
        'teal-dark': '#046a6c',
      },
      fontFamily: {
        medieval: ['MedievalSharp', 'Georgia', 'serif'],
        body: ['Crimson Text', 'Georgia', 'serif'],
      },
      backgroundImage: {
        'parchment-texture':
          'radial-gradient(ellipse at center, #f0ecc9 0%, #e0dbb5 100%)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
