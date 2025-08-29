export const color = {
  // Premium color palette
  background: '#FFFFFF',
  backgroundSecondary: '#FAFAFA',
  foreground: '#000000',
  foregroundSecondary: '#666666',
  foregroundTertiary: '#999999',
  accent: '#00B386',
  accentHover: '#009973',
  muted: '#F5F5F5',
  border: '#E6E6E6',
  cardBackground: '#FFFFFF',
  searchBackground: '#F8F8F8',
  danger: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
} as const;

export const typography = {
  fontFamily: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`,
  weights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  grid: 8, // 8px grid system
  cardPadding: 16,
  containerPadding: 20,
  sectionSpacing: 24,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  button: 8,
  card: 12,
  search: 25,
  full: 999,
} as const;

export const shadow = {
  none: 'none',
  sm: '0 1px 3px rgba(0,0,0,0.08)',
  md: '0 4px 12px rgba(0,0,0,0.08)',
  lg: '0 8px 24px rgba(0,0,0,0.12)',
  card: '0 2px 8px rgba(0,0,0,0.06)',
  premium: '0 2px 16px rgba(0,0,0,0.06)',
  button: '0 2px 4px rgba(0,0,0,0.1)',
} as const;

export const tokens = { color, typography, spacing, radii, shadow } as const;

export type Tokens = typeof tokens;

