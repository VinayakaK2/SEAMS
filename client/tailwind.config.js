/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#6366F1',
                secondary: '#8B5CF6',
                accent: '#38BDF8',
                dark: {
                    100: '#1E2433',
                    200: '#161B2A',
                    300: '#111827',
                    400: '#0B0F1A',
                },
                glass: 'rgba(255,255,255,0.05)',
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'primary-gradient': 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                'blue-purple': 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%)',
                'app-bg': 'linear-gradient(135deg, #0B0F1A 0%, #111827 100%)',
            },
            boxShadow: {
                'glass': '0 8px 32px rgba(0, 0, 0, 0.4)',
                'glow': '0 0 20px rgba(99, 102, 241, 0.3)',
                'glow-purple': '0 0 30px rgba(139, 92, 246, 0.4)',
                'glow-blue': '0 0 30px rgba(56, 189, 248, 0.3)',
                'card': '0 4px 24px rgba(0, 0, 0, 0.3)',
            },
            animation: {
                'float': 'float 6s ease-in-out infinite',
                'float-delayed': 'float 8s ease-in-out infinite 2s',
                'float-slow': 'float 10s ease-in-out infinite 4s',
                'pulse-slow': 'pulse 4s ease-in-out infinite',
                'gradient-shift': 'gradient-shift 8s ease infinite',
                'shimmer': 'shimmer 2s linear infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
                    '33%': { transform: 'translateY(-20px) rotate(5deg)' },
                    '66%': { transform: 'translateY(10px) rotate(-3deg)' },
                },
                'gradient-shift': {
                    '0%': { backgroundPosition: '0% 50%' },
                    '50%': { backgroundPosition: '100% 50%' },
                    '100%': { backgroundPosition: '0% 50%' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
            },
            backdropBlur: {
                xs: '2px',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
