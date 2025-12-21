import type { Config } from 'tailwindcss'

const config: Config = {
  // Ensure these paths match your actual folder names!
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    container: {
      center: true,
      padding: '1rem',
    },
    extend: {
      colors: {
        'obsidian': '#0B0114',
        'deep-violet': '#581C87',
        'electric-purple': '#A855F7',
        'hot-pink': '#F472B6',
        'neon-cyan': '#22D3EE',
        // By putting 'gray' here, you've ensured text-gray-400 etc. work perfectly
      },
      backgroundImage: {
        'gradient-neon': 'linear-gradient(135deg, #0B0114 0%, #1A0B2E 50%, #0B0114 100%)',
        'gradient-primary': 'linear-gradient(to right, #A855F7, #F472B6)',
      },
      // Added for your "FHE Encryption" UI vibes
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [], // Removed line-clamp as it's built-in now
}
export default config