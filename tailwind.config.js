/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f9f4',
          100: '#dcf1e6',
          200: '#bbe3ce',
          300: '#8dcdb0',
          400: '#57b08c',
          500: '#349470',
          600: '#24775a',
          700: '#1d5f49',
          800: '#1a4c3b',
          900: '#173f31',
          950: '#0b231c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
