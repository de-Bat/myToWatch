// apps/mobile/src/design/tokens.ts
import { Platform } from 'react-native'

export const isTV = Platform.isTV

// Colours — Nocturne Cinema design system
export const colors = {
  bg: '#0D0D1A',
  bgCard: 'rgba(255,255,255,0.06)',
  bgCardFocused: 'rgba(139,92,246,0.25)',
  border: 'rgba(255,255,255,0.10)',
  borderFocused: '#8B5CF6',
  accent: '#8B5CF6',       // purple
  accentDim: '#6D28D9',
  text: '#FFFFFF',
  textMuted: '#9CA3AF',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
} as const

// Spacing
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const

// TV overscan safe margin — 5% on each side, minimum 48px
export const TV_OVERSCAN = isTV ? 48 : 0

// Side nav width on TV
export const TV_SIDE_NAV_WIDTH = 240

// Typography
export const typography = {
  displayLg: { fontSize: isTV ? 40 : 28, fontWeight: '700' as const, color: colors.text },
  display:   { fontSize: isTV ? 32 : 22, fontWeight: '700' as const, color: colors.text },
  heading:   { fontSize: isTV ? 24 : 18, fontWeight: '600' as const, color: colors.text },
  body:      { fontSize: isTV ? 20 : 16, fontWeight: '400' as const, color: colors.text },
  caption:   { fontSize: isTV ? 16 : 13, fontWeight: '400' as const, color: colors.textMuted },
} as const

// Card sizes
export const cardSize = {
  poster: { width: isTV ? 200 : 120, height: isTV ? 300 : 180 },
} as const
