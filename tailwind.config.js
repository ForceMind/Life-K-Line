/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'chart-bg': '#ffffff', // 亮色背景
        'chart-up': '#ef5350', // 红色（涨/好）
        'chart-down': '#26a69a', // 绿色（跌/差）
      }
    },
  },
  plugins: [],
}
