import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0b0f14',
        surface: '#131c28',
        'secondary-bg': '#0f1620',
        border: '#27364a',
        lime: {
          DEFAULT: '#b7ff2a',
          pressed: '#7ed100',
          dim: 'rgba(183, 255, 42, 0.12)',
        },
        'text-primary': '#eaf2ff',
        'text-secondary': '#a9b7cc',
        'text-tertiary': '#7b8aa3',
        success: '#3dff8b',
        warning: '#ffcc00',
        danger: '#ff4d4d',
        info: '#4da3ff',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '18px',
        control: '13px',
      },
    },
  },
  plugins: [],
};

export default config;
