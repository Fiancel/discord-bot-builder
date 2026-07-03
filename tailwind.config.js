/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        discord: {
          bg:      '#36393f',
          sidebar: '#2f3136',
          header:  '#202225',
          blurple: '#5865F2',
          green:   '#57F287',
          red:     '#ED4245',
          yellow:  '#FEE75C',
          text:    '#dcddde',
          muted:   '#72767d',
          channel: '#96989d',
        },
      },
      fontFamily: {
        sans: ['Arial', 'Helvetica', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
