import type { Config } from 'tailwindcss'

const config: Config = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
        './src/contexts/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'monospace'],
            },
            colors: {
                surface: {
                    DEFAULT: '#1a1a1a',
                    hover: '#2a2a2a',
                },
                accent: '#4f46e5',
                muted: '#9ca3af',
            },
            spacing: {
                '18': '4.5rem',
                '88': '22rem',
            },
            maxWidth: {
                '8xl': '88rem',
            },
        },
    },
    plugins: [],
}

export default config 