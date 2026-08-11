/** @type {import('tailwindcss').Config} */
// Design tokens. Colors come from theme/colors.js (shared with components).
// Reference tokens as Tailwind classes: bg-bg, bg-accent, text-text-secondary,
// rounded-lg, etc. Don't hardcode hex in components — add it to theme/colors.js.
const { colors } = require("./theme/colors");

module.exports = {
  // NativeWind manages the color scheme itself, so dark mode must be
  // class-based ('media' makes web throw "Cannot manually set color scheme").
  darkMode: "class",
  content: [
    "./App.tsx",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors,
      borderColor: {
        DEFAULT: "rgba(255,255,255,0.09)",
        divider: "rgba(255,255,255,0.08)",
      },
      borderRadius: {
        sm: "12px",
        md: "14px",
        lg: "16px",
        xl: "18px",
        "2xl": "22px",
      },
      fontFamily: {
        // applied once the Archivo font is loaded via expo-font; falls back to system until then
        sans: ["Archivo", "system-ui", "sans-serif"],
      },
      // type scale — [size, { lineHeight, letterSpacing }]. Pair with a weight
      // class (headings use font-extrabold) since RN keeps weight separate from size.
      fontSize: {
        display: ["34px", { lineHeight: "37px", letterSpacing: "-0.7px" }],
        h1: ["25px", { lineHeight: "28px", letterSpacing: "-0.4px" }],
        h2: ["20px", { lineHeight: "23px", letterSpacing: "-0.2px" }],
        h3: ["16px", { lineHeight: "21px" }],
        body: ["13px", { lineHeight: "21px" }],
        eyebrow: ["10px", { lineHeight: "12px", letterSpacing: "2px" }],
        button: ["14px", { lineHeight: "17px", letterSpacing: "1.7px" }],
      },
      letterSpacing: {
        eyebrow: "2px", // ~0.2em — uppercase section labels
        button: "1.7px", // ~0.12em — uppercase button labels
        pill: "1.5px", // ~0.16em — uppercase pill labels
      },
      // the one signature effect: hard offset button shadow, no blur.
      // RN 0.86 renders box-shadow natively on both platforms.
      boxShadow: {
        btn: "0 6px 0 0 #1e3d63",
        "btn-pressed": "0 2px 0 0 #1e3d63",
      },
    },
  },
  plugins: [],
};
