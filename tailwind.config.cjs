/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './context/**/*.{js,jsx,ts,tsx}',
    './lib/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        theme: {
          bg: 'var(--color-bg)',
          surface: 'var(--color-surface)',
          primary: 'var(--color-primary)',
          secondary: 'var(--color-secondary)',
          accent: 'var(--color-accent)',
          border: 'var(--color-border)',
          'error-bg': 'var(--color-error-bg)',
          'error-text': 'var(--color-error-text)',
          'error-border': 'var(--color-error-border)',
          'success-bg': 'var(--color-success-bg)',
          'success-text': 'var(--color-success-text)',
          'success-border': 'var(--color-success-border)',
        },
      },
    },
  },
  plugins: [],
}
