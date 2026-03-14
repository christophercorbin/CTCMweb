/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#1B2D78',
          'navy-dark': '#131f55',
          'navy-light': '#243899',
          gold: '#F5C518',
          'gold-dark': '#d4a800',
          'gold-light': '#fdd84e',
        },
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #1B2D78 0%, #243899 60%, #1B2D78 100%)',
      },
    },
  },
  plugins: [],
};
