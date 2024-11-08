import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      textColor: {
        main: {
          base: 'rgb(var(--color-text-base))',
          50: 'rgb(var(--color-text-50))',
          100: 'rgb(var(--color-text-100))',
          200: 'rgb(var(--color-text-200))',
          300: 'rgb(var(--color-text-300))',
          400: 'rgb(var(--color-text-400))',
          500: 'rgb(var(--color-text-500))',
          600: 'rgb(var(--color-text-600))',
          700: 'rgb(var(--color-text-700))',
          800: 'rgb(var(--color-text-800))',
          900: 'rgb(var(--color-text-900))',
        },
      },
      colors: {
        primary: {
          50: 'rgb(var(--color-primary-50) / <alpha-value>)',
          100: 'rgb(var(--color-primary-100) / <alpha-value>)',
          200: 'rgb(var(--color-primary-200) / <alpha-value>)',
          300: 'rgb(var(--color-primary-300) / <alpha-value>)',
          400: 'rgb(var(--color-primary-400) / <alpha-value>)',
          500: 'rgb(var(--color-primary-500) / <alpha-value>)',
          600: 'rgb(var(--color-primary-600) / <alpha-value>)',
          700: 'rgb(var(--color-primary-700) / <alpha-value>)',
          800: 'rgb(var(--color-primary-800) / <alpha-value>)',
          900: 'rgb(var(--color-primary-900) / <alpha-value>)',
        },
        secondary: {
          50: 'rgb(var(--color-secondary-50) / <alpha-value>)',
          100: 'rgb(var(--color-secondary-100) / <alpha-value>)',
          200: 'rgb(var(--color-secondary-200) / <alpha-value>)',
          300: 'rgb(var(--color-secondary-300) / <alpha-value>)',
          400: 'rgb(var(--color-secondary-400) / <alpha-value>)',
          500: 'rgb(var(--color-secondary-500) / <alpha-value>)',
          600: 'rgb(var(--color-secondary-600) / <alpha-value>)',
          700: 'rgb(var(--color-secondary-700) / <alpha-value>)',
          800: 'rgb(var(--color-secondary-800) / <alpha-value>)',
          900: 'rgb(var(--color-secondary-900) / <alpha-value>)',
        },
        accent: {
          50: 'rgb(var(--color-accent-50) / <alpha-value>)',
          100: 'rgb(var(--color-accent-100) / <alpha-value>)',
          200: 'rgb(var(--color-accent-200) / <alpha-value>)',
          300: 'rgb(var(--color-accent-300) / <alpha-value>)',
          400: 'rgb(var(--color-accent-400) / <alpha-value>)',
          500: 'rgb(var(--color-accent-500) / <alpha-value>)',
          600: 'rgb(var(--color-accent-600) / <alpha-value>)',
          700: 'rgb(var(--color-accent-700) / <alpha-value>)',
          800: 'rgb(var(--color-accent-800) / <alpha-value>)',
          900: 'rgb(var(--color-accent-900) / <alpha-value>)',
        },
        sidebar: {
          bg: 'var(--color-sidebar-bg)',
          text: 'var(--color-sidebar-text)',
          hover: 'var(--color-sidebar-hover)',
          icon: 'var(--color-sidebar-icon)',
        },
        header: {
          bg: 'var(--color-header-bg)',
          text: 'var(--color-header-text)',
          border: 'var(--color-header-border)',
          icon: 'var(--color-sidebar-icon)',
        },
        // NOTE: sub menu is a submenu in the avatar sidebar
        subMenu: {
          bg: 'var(--color-submenu-bg)',
          text: 'var(--color-submenu-text)',
          hover: 'var(--color-submenu-hover)',
          icon: 'var(--color-submenu-icon)',
        },
      },
      borderColor: {
        main: {
          base: 'rgb(var(--color-border-base))',
          50: 'rgb(var(--color-border-50))',
          100: 'rgb(var(--color-border-100))',
          200: 'rgb(var(--color-border-200))',
          300: 'rgb(var(--color-border-300))',
          400: 'rgb(var(--color-border-400))',
          500: 'rgb(var(--color-border-500))',
          600: 'rgb(var(--color-border-600))',
          700: 'rgb(var(--color-border-700))',
          800: 'rgb(var(--color-border-800))',
          900: 'rgb(var(--color-border-900))',
        },
      },
    },
  },

  plugins: [
    // require('@tailwindcss/forms'),
  ],
};
export default config;
