/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 暖杏色主调
        primary: {
          DEFAULT: '#BC6E43',
          hover: '#A85B32',
          light: '#F7ECE1',
          soft: '#E2B48D',
        },
        secondary: {
          DEFAULT: '#3D405B',
          hover: '#2D3045',
          light: '#E8E9F0',
        },
        // 嫩芽绿辅助色
        accent: {
          DEFAULT: '#7FB78E',
          hover: '#639B74',
          light: '#E9F3EC',
        },
        success: {
          DEFAULT: '#6BA684',
          hover: '#55916F',
          light: '#E8F2EB',
        },
        info: {
          DEFAULT: '#8FB6E8',
          hover: '#6F9AD9',
          light: '#EDF3FB',
        },
        warning: {
          DEFAULT: '#F4A261',
          hover: '#E08C4A',
          light: '#FDF3EA',
        },
        danger: {
          DEFAULT: '#E76F51',
          hover: '#D45A3C',
          light: '#FDEBE7',
        },
        surface: '#FFFFFF',
        background: '#FBF5EA',
        'text-primary': '#3D405B',
        'text-secondary': '#6B7280',
        'text-muted': '#A3978A',
        'border': '#EFE3D2',
        'sidebar-bg': '#FFFFFF',
        'sidebar-text': '#3D405B',
        'sidebar-active': '#BC6E43',
        // 兼容旧类名：brand-* 映射为暖杏色系
        brand: {
          50: '#F7ECE1',
          100: '#F0DCC8',
          200: '#E2B48D',
          300: '#D3936B',
          400: '#C87F52',
          500: '#BC6E43',
          600: '#A85B32',
          700: '#8A4928',
          800: '#6B3920',
          900: '#522C1A',
        },
      },
      fontFamily: {
        sans: ['"PingFang SC"', '"Microsoft YaHei"', '"Hiragino Sans GB"', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"Noto Serif SC"', '"STSong"', '"Songti SC"', 'serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -4px rgba(188, 110, 67, 0.10)',
        'card': '0 2px 12px rgba(61, 64, 91, 0.06)',
        'hover': '0 10px 28px -6px rgba(188, 110, 67, 0.18)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.25rem',
      }
    },
  },
  plugins: [],
}
