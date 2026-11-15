/** Preferred identity is distinct from the palette currently enabled on pages. */
export type PaletteId = 'classic-purple' | 'deep-teal' | 'warm-amber'
export type NegarPage = 'studio' | 'stt' | 'tts' | 'video' | 'login' | 'dashboard' | 'file-detail'

const tealColors = { background: '#F3F7F6', secondary: '#17323B', accent: '#0D9488' }
const amberColors = { background: '#FAF7F0', secondary: '#2D302B', accent: '#C97B24' }

export const brandIdentity = {
  name: 'Negar',
  preferredPalette: 'warm-amber' as PaletteId,
  proportions: { background: 70, secondary: 20, accent: 10 },
  colors: amberColors,
}

export type PaletteSettings = {
  defaultPalette: PaletteId
  pages: Partial<Record<NegarPage, PaletteId>>
}

/** Change the default for all Negar pages, or opt individual pages in here. */
export const paletteSettings: PaletteSettings = {
  defaultPalette: 'classic-purple',
  pages: { dashboard: 'warm-amber' },
}

const tealLight = {
  bg: tealColors.background,
  surface: '#FFFFFF',
  raised: '#E9F1EF',
  ink: tealColors.secondary,
  muted: '#56706F',
  line: '#D6E4DF',
  accent: '#0F766E',
  'accent-hover': '#115E59',
  'accent-bright': '#087F75',
  'accent-soft': '#DDF2ED',
  'accent-border': '#A7D7CD',
  'accent-decorative': tealColors.accent,
  'on-accent': '#FFFFFF',
}

const tealDark: Record<keyof typeof tealLight, string> = {
  bg: '#0D1D22',
  surface: '#142B32',
  raised: tealColors.secondary,
  ink: '#EAF4F0',
  muted: '#9CBAB3',
  line: '#2D4B50',
  accent: '#5EEAD4',
  'accent-hover': '#99F6E4',
  'accent-bright': '#99F6E4',
  'accent-soft': '#163E43',
  'accent-border': '#2B6E69',
  'accent-decorative': '#2DD4BF',
  'on-accent': '#102A2F',
}

const amberLight: Record<keyof typeof tealLight, string> = {
  bg: amberColors.background,
  surface: '#FFFEFA',
  raised: '#F1ECE0',
  ink: amberColors.secondary,
  muted: '#686C5E',
  line: '#DFDCCE',
  accent: '#9D5A17',
  'accent-hover': '#824710',
  'accent-bright': '#9D5A17',
  'accent-soft': '#F8E8D1',
  'accent-border': '#E8CAA2',
  'accent-decorative': amberColors.accent,
  'on-accent': '#FFFFFF',
}

const amberDark: Record<keyof typeof tealLight, string> = {
  bg: '#1A1D19',
  surface: '#252A24',
  raised: amberColors.secondary,
  ink: '#F5F2E8',
  muted: '#B4BAA6',
  line: '#444A3F',
  accent: '#F2BC70',
  'accent-hover': '#FFD49A',
  'accent-bright': '#FFD49A',
  'accent-soft': '#3C3021',
  'accent-border': '#785B33',
  'accent-decorative': '#E9A64A',
  'on-accent': '#2B2114',
}

export const paletteCatalog = {
  // Classic uses the exact legacy CSS fallbacks, including page-specific shades.
  'classic-purple': { name: 'Classic Purple', light: null, dark: null },
  'deep-teal': { name: 'Deep Teal', light: tealLight, dark: tealDark },
  'warm-amber': { name: 'Warm Amber', light: amberLight, dark: amberDark },
} as const

export function resolvePalette(pathname: string, settings: PaletteSettings = paletteSettings): PaletteId {
  const path = pathname.replace(/\/+$/, '') || '/'
  const page: NegarPage | undefined = path.startsWith('/dashboard/files/') ? 'file-detail'
    : ({ '/studio': 'studio', '/studio/stt': 'stt', '/studio/negar': 'stt',
        '/studio/tts': 'tts', '/studio/video': 'video', '/login': 'login',
        '/dashboard': 'dashboard' } as Record<string, NegarPage>)[path]
  return page ? settings.pages[page] ?? settings.defaultPalette : settings.defaultPalette
}

export function paletteStyles(id: PaletteId): Record<string, string> {
  const palette = paletteCatalog[id]
  const styles: Record<string, string> = {}
  for (const mode of ['light', 'dark'] as const) {
    const tokens = palette[mode]
    if (!tokens) continue
    for (const [role, color] of Object.entries(tokens)) {
      styles[`--palette-${mode}-${role}`] = color
      styles[`--palette-${mode}-${role}-rgb`] = [1, 3, 5]
        .map(index => parseInt(color.slice(index, index + 2), 16)).join(', ')
    }
  }
  return styles
}
