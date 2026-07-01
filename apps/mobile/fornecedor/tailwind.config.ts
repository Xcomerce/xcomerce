import type { Config } from 'tailwindcss'

export default {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#2F66F3',
          dark: '#0D1F4D',
          accent: '#F5A000',
        },
      },
    },
  },
  plugins: [],
} satisfies Config
