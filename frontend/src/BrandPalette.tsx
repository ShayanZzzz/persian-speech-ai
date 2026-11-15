import type { CSSProperties } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AudioPlayerProvider } from './AudioPlayer'
import { paletteStyles, resolvePalette } from './config/brand'
import './BrandPalette.css'

export default function BrandPalette() {
  const { pathname } = useLocation()
  const palette = resolvePalette(pathname)
  return (
    <div className="negar-palette" data-negar-palette={palette} style={paletteStyles(palette) as CSSProperties}>
      <AudioPlayerProvider><Outlet /></AudioPlayerProvider>
    </div>
  )
}
