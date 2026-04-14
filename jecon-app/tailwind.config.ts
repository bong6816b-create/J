import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        br: {
          DEFAULT: '#2C1810',
          2: '#3D2314',
        },
        cara: '#7B4A2D',
        latte: '#B07A5A',
        cream: {
          DEFAULT: '#FFF8EE',
          2: '#FFF2DC',
          3: '#FFE8C0',
        },
        gold: {
          DEFAULT: '#F5C842',
          dark: '#D4A820',
        },
        red: '#E63B2E',
        grn: {
          DEFAULT: '#2E7D52',
          2: '#3EAA6D',
        },
        blue: '#1D4ED8',
        teal: {
          DEFAULT: '#0D9488',
          2: '#14B8A6',
        },
        g1: '#F5F0EA',
        g2: '#C8B8A8',
        g3: '#8C7060',
        tx: {
          DEFAULT: '#1E0F07',
          2: '#5C3D28',
          3: '#8C7060',
        },
      },
      fontFamily: {
        bebas: ['"Bebas Neue"', 'sans-serif'],
        sans: ['"Noto Sans KR"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
