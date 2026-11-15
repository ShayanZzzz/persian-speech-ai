import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { brandIdentity, paletteCatalog, paletteSettings, paletteStyles, resolvePalette } from '../src/config/brand.ts'

const routes = ['/studio', '/studio/stt', '/studio/tts', '/studio/video', '/login', '/dashboard', '/dashboard/files/42']

test('approved identity and the original classic palette remain available', () => {
  assert.equal(brandIdentity.preferredPalette, 'warm-amber')
  assert.deepEqual(brandIdentity.colors, { background: '#FAF7F0', secondary: '#2D302B', accent: '#C97B24' })
  assert.equal(paletteCatalog['deep-teal'].light.bg, '#F3F7F6')
  assert.equal(paletteCatalog['deep-teal'].light.ink, '#17323B')
  assert.equal(paletteCatalog['deep-teal'].light['accent-decorative'], '#0D9488')
  assert.equal(Object.values(brandIdentity.proportions).reduce((a, b) => a + b), 100)
  assert.ok(Object.hasOwn(paletteCatalog, paletteSettings.defaultPalette))
  assert.deepEqual(paletteStyles('classic-purple'), {})
})

test('one default setting activates all Negar pages and both modes', () => {
  for (const pathname of routes) {
    assert.equal(resolvePalette(pathname, { defaultPalette: 'deep-teal', pages: {} }), 'deep-teal')
    assert.equal(resolvePalette(pathname, { defaultPalette: 'classic-purple', pages: {} }), 'classic-purple')
    assert.equal(resolvePalette(pathname, { defaultPalette: 'warm-amber', pages: {} }), 'warm-amber')
  }
  const styles = paletteStyles('deep-teal')
  assert.equal(styles['--palette-light-bg'], '#F3F7F6')
  assert.notEqual(styles['--palette-light-bg'], styles['--palette-dark-bg'])
  assert.equal(styles['--palette-light-ink-rgb'], '23, 50, 59')
})

test('page overrides migrate only the selected page, including aliases and detail URLs', () => {
  const settings = { defaultPalette: 'classic-purple' as const, pages: { dashboard: 'deep-teal' as const } }
  assert.equal(resolvePalette('/dashboard/', settings), 'deep-teal')
  assert.equal(resolvePalette('/dashboard/files/tts-8', settings), 'classic-purple')
  assert.equal(resolvePalette('/studio/tts', settings), 'classic-purple')
  assert.equal(resolvePalette('/studio/negar', { ...settings, pages: { stt: 'deep-teal' } }), 'deep-teal')
  assert.equal(resolvePalette('/dashboard/files/tts-8', { ...settings, pages: { 'file-detail': 'deep-teal' } }), 'deep-teal')
})

test('all migrated CSS roles have central light and dark definitions', () => {
  const bridge = readFileSync(new URL('../src/BrandPalette.css', import.meta.url), 'utf8')
  const stylesByPalette = ['deep-teal', 'warm-amber'].map(id => paletteStyles(id as 'deep-teal' | 'warm-amber'))
  const names = ['Studio', 'Dashboard', 'StudioHeader', 'MediaStudio', 'TTSStudio', 'VideoEditor', 'FileDetail', 'Login', 'AudioPlayer', 'SharedTooltip']
  for (const name of names) {
    const css = readFileSync(new URL(`../src/${name}.css`, import.meta.url), 'utf8')
    for (const [, role] of css.matchAll(/var\(--brand-([a-z-]+),/g)) {
      for (const mode of ['light', 'dark']) {
        for (const styles of stylesByPalette) assert.ok(styles[`--palette-${mode}-${role}`], `${name}: ${mode}/${role}`)
        assert.ok(bridge.includes(`--brand-${role}: var(--palette-${mode}-${role});`), `${name}: missing bridge for ${role}`)
      }
    }
  }
  for (const modeClass of ['negar-dark', 'dashboard-dark', 'tts-dark', 'ms-dark', 'studio-header-dark', 'file-detail-dark', 've-dark', 'global-audio-player']) {
    assert.ok(bridge.includes(`.${modeClass}`), `Missing mode scope: ${modeClass}`)
  }
})

function luminance(hex: string) {
  const channels = [1, 3, 5].map(index => {
    const value = parseInt(hex.slice(index, index + 2), 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

test('core text and action colors retain readable contrast in both modes', () => {
  for (const palette of ['deep-teal', 'warm-amber'] as const) {
   for (const mode of ['light', 'dark'] as const) {
    const roles = paletteCatalog[palette][mode]
    for (const [foreground, background] of [[roles.ink, roles.bg], [roles.muted, roles.bg], [roles['on-accent'], roles.accent]]) {
      const values = [luminance(foreground), luminance(background)].sort((a, b) => a - b)
      assert.ok((values[1] + 0.05) / (values[0] + 0.05) >= 4.5, `${palette}/${mode}: ${foreground} on ${background}`)
    }
   }
  }
})


test('only the dashboard uses the active amber palette', () => {
  assert.equal(resolvePalette('/dashboard'), 'warm-amber')
  for (const path of routes.filter(path => path !== '/dashboard')) assert.equal(resolvePalette(path), 'classic-purple')
})
