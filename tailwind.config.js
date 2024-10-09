const colors = require('tailwindcss/colors');

module.exports = {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    fontFamily: {
      sans: ['"Inter Tight"', 'Sans-serif'],
    },
    extend: {
      colors: {
        primary: colors.stone[500],
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
};
