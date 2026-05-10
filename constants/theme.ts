// constants/theme.ts

export type ThemeId =
  | 'default'
  | 'midnight'
  | 'forest'
  | 'sunset'
  | 'rose'
  | 'ocean';

export interface AppTheme {
  id: ThemeId;
  name: string;
  description: string;
  preview: string[]; // gradient colors for preview swatch
  colors: {
    primary: string;        // main accent (buttons, icons, active tab)
    primaryLight: string;   // light tint of primary (badge bg, chips)
    primaryText: string;    // text on primary bg
    secondary: string;      // secondary accent
    background: string;     // screen background
    surface: string;        // card/modal background
    border: string;         // subtle borders
    textPrimary: string;    // main text
    textSecondary: string;  // muted text
    tabBar: string;         // tab bar background
    tabBarBorder: string;   // tab bar top border
    tabActive: string;      // active tab icon/label
    tabInactive: string;    // inactive tab icon/label
    success: string;
    warning: string;
    danger: string;
    gradientStart: string;  // header gradient start
    gradientEnd: string;    // header gradient end
  };
}

export const THEMES: Record<ThemeId, AppTheme> = {
  default: {
    id: 'default',
    name: 'Default Blue',
    description: 'Classic professional blue',
    preview: ['#2563EB', '#4F46E5'],
    colors: {
      primary: '#2563EB',
      primaryLight: '#EEF2FF',
      primaryText: '#ffffff',
      secondary: '#4F46E5',
      background: '#F3F4F6',
      surface: '#ffffff',
      border: '#E5E7EB',
      textPrimary: '#111827',
      textSecondary: '#9CA3AF',
      tabBar: '#ffffff',
      tabBarBorder: '#E5E7EB',
      tabActive: '#2563EB',
      tabInactive: '#9CA3AF',
      success: '#10B981',
      warning: '#F59E0B',
      danger: '#EF4444',
      gradientStart: '#2563EB',
      gradientEnd: '#4F46E5',
    },
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    description: 'Dark & sleek dark mode',
    preview: ['#1E1B4B', '#312E81'],
    colors: {
      primary: '#818CF8',
      primaryLight: '#1E1B4B',
      primaryText: '#ffffff',
      secondary: '#6366F1',
      background: '#0F0F1A',
      surface: '#1A1A2E',
      border: '#2D2D44',
      textPrimary: '#F1F5F9',
      textSecondary: '#64748B',
      tabBar: '#1A1A2E',
      tabBarBorder: '#2D2D44',
      tabActive: '#818CF8',
      tabInactive: '#475569',
      success: '#34D399',
      warning: '#FBBF24',
      danger: '#F87171',
      gradientStart: '#1E1B4B',
      gradientEnd: '#312E81',
    },
  },
  forest: {
    id: 'forest',
    name: 'Forest',
    description: 'Natural greens & earthy tones',
    preview: ['#166534', '#15803D'],
    colors: {
      primary: '#16A34A',
      primaryLight: '#DCFCE7',
      primaryText: '#ffffff',
      secondary: '#15803D',
      background: '#F0FDF4',
      surface: '#ffffff',
      border: '#BBF7D0',
      textPrimary: '#14532D',
      textSecondary: '#6B7280',
      tabBar: '#ffffff',
      tabBarBorder: '#BBF7D0',
      tabActive: '#16A34A',
      tabInactive: '#9CA3AF',
      success: '#16A34A',
      warning: '#D97706',
      danger: '#DC2626',
      gradientStart: '#166534',
      gradientEnd: '#15803D',
    },
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm oranges & amber glow',
    preview: ['#EA580C', '#D97706'],
    colors: {
      primary: '#EA580C',
      primaryLight: '#FFF7ED',
      primaryText: '#ffffff',
      secondary: '#D97706',
      background: '#FFF7ED',
      surface: '#ffffff',
      border: '#FED7AA',
      textPrimary: '#7C2D12',
      textSecondary: '#9CA3AF',
      tabBar: '#ffffff',
      tabBarBorder: '#FED7AA',
      tabActive: '#EA580C',
      tabInactive: '#9CA3AF',
      success: '#16A34A',
      warning: '#D97706',
      danger: '#DC2626',
      gradientStart: '#EA580C',
      gradientEnd: '#D97706',
    },
  },
  rose: {
    id: 'rose',
    name: 'Rose',
    description: 'Elegant pinks & rose tones',
    preview: ['#E11D48', '#BE185D'],
    colors: {
      primary: '#E11D48',
      primaryLight: '#FFF1F2',
      primaryText: '#ffffff',
      secondary: '#BE185D',
      background: '#FFF1F2',
      surface: '#ffffff',
      border: '#FECDD3',
      textPrimary: '#881337',
      textSecondary: '#9CA3AF',
      tabBar: '#ffffff',
      tabBarBorder: '#FECDD3',
      tabActive: '#E11D48',
      tabInactive: '#9CA3AF',
      success: '#16A34A',
      warning: '#D97706',
      danger: '#DC2626',
      gradientStart: '#E11D48',
      gradientEnd: '#BE185D',
    },
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    description: 'Deep teals & cool aqua',
    preview: ['#0E7490', '#0891B2'],
    colors: {
      primary: '#0891B2',
      primaryLight: '#ECFEFF',
      primaryText: '#ffffff',
      secondary: '#0E7490',
      background: '#ECFEFF',
      surface: '#ffffff',
      border: '#A5F3FC',
      textPrimary: '#164E63',
      textSecondary: '#9CA3AF',
      tabBar: '#ffffff',
      tabBarBorder: '#A5F3FC',
      tabActive: '#0891B2',
      tabInactive: '#9CA3AF',
      success: '#16A34A',
      warning: '#D97706',
      danger: '#DC2626',
      gradientStart: '#0E7490',
      gradientEnd: '#0891B2',
    },
  },
};

export const DEFAULT_THEME_ID: ThemeId = 'default';
export const DEFAULT_THEME = THEMES[DEFAULT_THEME_ID];