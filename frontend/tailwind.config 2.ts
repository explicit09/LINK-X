import type { Config } from "tailwindcss";
import { colors, typography, spacing, radius, animation, shadows } from './src/styles/tokens';

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	// Optimize for production builds
	safelist: [
		// Keep essential utility classes that might be used dynamically
		'animate-spin',
		'animate-pulse',
		'animate-bounce',
		'bg-blue-600',
		'bg-green-600',
		'bg-red-600',
		'text-blue-600',
		'text-green-600',
		'text-red-600',
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'xs': '360px',
				'sm': '640px',
				'md': '768px',
				'lg': '1024px',
				'xl': '1280px',
				'2xl': '1440px'
			}
		},
		extend: {
			fontFamily: {
				sans: typography.fontFamily.sans,
				mono: typography.fontFamily.mono,
			},
			fontSize: typography.fontSize,
			fontWeight: typography.fontWeight,
			lineHeight: typography.lineHeight,
			letterSpacing: typography.letterSpacing,
			spacing: spacing,
			colors: {
				// Design token colors
				primary: colors.primary,
				accent: colors.accent,
				neutral: colors.neutral,
				success: colors.success,
				warning: colors.warning,
				error: colors.error,
				info: colors.info,
				
				// Background colors
				background: {
					DEFAULT: 'var(--bg-primary)',
					secondary: 'var(--bg-secondary)',
					tertiary: 'var(--bg-tertiary)',
					inverse: 'var(--bg-inverse)',
				},
				
				// Text colors
				text: {
					DEFAULT: 'var(--text-primary)',
					secondary: 'var(--text-secondary)',
					tertiary: 'var(--text-tertiary)',
					disabled: 'var(--text-disabled)',
					inverse: 'var(--text-inverse)',
				},
				
				// Legacy mappings for existing components
				border: 'var(--border)',
				input: 'var(--input)',
				ring: 'var(--ring)',
				foreground: 'var(--foreground)',
				popover: {
					DEFAULT: 'var(--popover)',
					foreground: 'var(--popover-foreground)'
				},
				card: {
					DEFAULT: 'var(--card)',
					foreground: 'var(--card-foreground)'
				},
				secondary: {
					DEFAULT: 'var(--secondary)',
					foreground: 'var(--secondary-foreground)'
				},
				destructive: {
					DEFAULT: 'var(--destructive)',
					foreground: 'var(--destructive-foreground)'
				},
				muted: {
					DEFAULT: 'var(--muted)',
					foreground: 'var(--muted-foreground)'
				}
			},
			borderRadius: {
				...radius,
				lg: 'var(--radius-lg)',
				md: 'var(--radius-md)',
				sm: 'var(--radius-sm)'
			},
			boxShadow: {
				...shadows,
				glow: shadows.glow.DEFAULT,
				'glow-sm': shadows.glow.sm,
				'glow-lg': shadows.glow.lg,
			},
			transitionDuration: animation.duration,
			transitionTimingFunction: animation.easing,
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' },
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' },
				},
				fadeIn: {
					from: { opacity: '0', transform: 'translateY(10px)' },
					to: { opacity: '1', transform: 'translateY(0)' },
				},
				fadeInLeft: {
					from: { opacity: '0', transform: 'translateX(-20px)' },
					to: { opacity: '1', transform: 'translateX(0)' },
				},
				fadeInRight: {
					from: { opacity: '0', transform: 'translateX(20px)' },
					to: { opacity: '1', transform: 'translateX(0)' },
				},
				float: {
					'0%, 100%': { transform: 'translateY(0)' },
					'50%': { transform: 'translateY(-10px)' },
				},
				pulse: {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0.5' },
				},
				shimmer: {
					'0%': { transform: 'translateX(-100%)' },
					'100%': { transform: 'translateX(100%)' },
				}
			},
			animation: {
				'accordion-down': `accordion-down ${animation.duration.slow} ${animation.easing.out}`,
				'accordion-up': `accordion-up ${animation.duration.slow} ${animation.easing.out}`,
				'fade-in': `fadeIn ${animation.duration.slow} ${animation.easing.out} forwards`,
				'fade-in-left': `fadeInLeft ${animation.duration.slow} ${animation.easing.out} forwards`,
				'fade-in-right': `fadeInRight ${animation.duration.slow} ${animation.easing.out} forwards`,
				'float': 'float 6s ease-in-out infinite',
				'pulse': 'pulse 3s ease-in-out infinite',
				'shimmer': 'shimmer 2s infinite',
				'glow-pulse': 'pulse-glow 2s ease-in-out infinite',
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
