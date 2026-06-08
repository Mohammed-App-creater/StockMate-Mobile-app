// StockMate design tokens — mirrors the design system in the handoff (mobile.css).
export const colors = {
  navy: '#0F172A',
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primary50: '#EFF6FF',
  primary100: '#DBEAFE',
  blueAccent: '#60A5FA', // active tab tint on navy bar

  success: '#16A34A',
  success50: '#F0FDF4',
  success100: '#DCFCE7',
  successDark: '#15803D',

  danger: '#DC2626',
  danger50: '#FEF2F2',
  danger100: '#FEE2E2',

  warning: '#D97706',
  warning50: '#FFFBEB',
  warning100: '#FEF3C7',

  background: '#F1F5F9',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  fieldBg: '#F8FAFC',
  text: '#1E293B',
  textMuted: '#64748B',
  textMuted2: '#94A3B8',
  border: '#E2E8F0',
  hairline: '#F1F5F9',
  white: '#FFFFFF',

  // Back-compat alias used by older screens.
  error: '#DC2626',
};

// Card / popover shadows (iOS) — pair with elevation on Android at call sites.
export const shadowCard = {
  shadowColor: '#0F172A',
  shadowOpacity: 0.08,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
} as const;

export default colors;
