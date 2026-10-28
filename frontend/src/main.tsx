import 'vazirmatn/Vazirmatn-Variable-font-face.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'
import App from './App'
import MediaStudio from './MediaStudio'
import Studio from './Studio'
import VideoEditor from './VideoEditor'
import Login from './Login'
import Dashboard from './Dashboard'
import FileDetail from './FileDetail'
import { AudioPlayerProvider } from './AudioPlayer'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AudioPlayerProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/studio" element={<MediaStudio />} />
          <Route path="/studio/stt" element={<Studio />} />
          <Route path="/studio/negar" element={<Navigate to="/studio/stt" replace />} />
          <Route path="/studio/video" element={<VideoEditor />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard/files/:id" element={<FileDetail />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AudioPlayerProvider>
    </BrowserRouter>
  </StrictMode>,
)
