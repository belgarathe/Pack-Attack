/**
 * PostCSS Configuration
 * Optimized for cross-browser compatibility
 */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    // Autoprefixer adds vendor prefixes for cross-browser support
    // Supports: Chrome, Firefox, Safari, Edge, iOS Safari, Android
    autoprefixer: {
      // Target browsers based on browserslist
      flexbox: "no-2009", // Use modern flexbox syntax
      grid: "autoplace", // Enable CSS Grid with autoprefixer
    },
  },
};

export default config;

