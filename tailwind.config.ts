import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'

export default {
  theme: {
    extend: {
      fontFamily: {
        sans: [`"${process.env.GOOGLE_FONT_SANS || 'Inter'}"`, '"Noto Sans SC"', ...defaultTheme.fontFamily.sans],
        mono: [`"${process.env.GOOGLE_FONT_MONO || 'Fira Mono'}"`, ...defaultTheme.fontFamily.mono],
      },
    },
  },
} satisfies Config
