import containerQueries from '@tailwindcss/container-queries';
import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: "class", // 'class' strategy for dark mode
    theme: {
        extend: {
            colors: {
                "primary": "#1e60a3", // Darker blue for contrast
                "background-light": "#F5F7FA", // Off-white background as requested
                "background-dark": "#CDEFE6", // Client requested dark mode background (Light Mint)
                "background-dark-navy": "#CDEFE6", // Updated to match client requested background
                "background-dark-black": "#CDEFE6", // Updated to match client requested background
                "charcoal": "#1a1a1a",
                "metallic": "#C0C0C0",
                "metallic-silver": "#C0C0C0",
                "silver": "#C0C0C0",
                "glass-dark": "rgba(28, 33, 39, 0.8)",
            },
            fontFamily: {
                "display": ["Maven Pro", "sans-serif"],
                "serif": ["Maven Pro", "serif"]
            },
            borderRadius: {
                "DEFAULT": "0.25rem",
                "lg": "0.5rem",
                "xl": "0.75rem",
                "full": "9999px"
            },
            keyframes: {
                fadeSlideIn: {
                    '0%': { opacity: '0', transform: 'translateY(12px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
            animation: {
                fadeSlideIn: 'fadeSlideIn 0.4s ease both',
            },
        },
    },
    plugins: [
        containerQueries,
        forms,
        typography,
    ],
}
