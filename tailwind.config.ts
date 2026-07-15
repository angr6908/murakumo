import type { Config } from 'tailwindcss'
import colors from 'tailwindcss/colors'
import defaultTheme from 'tailwindcss/defaultTheme'

export default {
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      black: colors.black,
      white: colors.white,
      gray: colors.zinc,
      red: colors.rose,
      yellow: colors.amber,
      green: colors.green,
      blue: colors.sky,
      indigo: colors.indigo,
      purple: colors.purple,
      pink: colors.pink,
      teal: colors.teal,
      cyan: colors.cyan,
      orange: colors.orange,
    },
    extend: {
      fontFamily: {
        sans: [`"${process.env.GOOGLE_FONT_SANS || 'Inter'}"`, '"Noto Sans SC"', ...defaultTheme.fontFamily.sans],
        mono: [`"${process.env.GOOGLE_FONT_MONO || 'Fira Mono'}"`, ...defaultTheme.fontFamily.mono],
      },
      colors: {
        gray: {
          850: '#222226',
        },
      },
      animation: {
        'spin-slow': 'spin 5s linear infinite',
      },
    },
  },
} satisfies Config
