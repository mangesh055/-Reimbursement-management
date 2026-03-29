import React, { useState, useRef } from 'react'
import { Upload, Image, X } from 'lucide-react'

export default function FileUpload({ onFileSelect, label = 'Upload Receipt', loading = false }) {
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState(null)
  const inputRef = useRef()

  const handleFile = (file) => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreview(url)
    onFileSelect(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith('image/')) handleFile(file)
  }

  return (
    <div>
      <div
        onClick={() => !preview && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragging ? '#6366f1' : 'var(--border-color)'}`,
          borderRadius: 12, padding: 24, textAlign: 'center',
          cursor: preview ? 'default' : 'pointer',
          background: dragging ? 'rgba(99,102,241,0.05)' : 'rgba(0,0,0,0.2)',
          transition: 'all 0.2s',
          position: 'relative'
        }}
      >
        {loading ? (
          <div style={{ color: '#818cf8', fontSize: 14, fontWeight: 500 }}>
            <div className="pulse" style={{ fontSize: 24, marginBottom: 8 }}>🤖</div>
            Reading your receipt with AI...
          </div>
        ) : preview ? (
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img src={preview} alt="Receipt" style={{ maxHeight: 180, maxWidth: '100%', borderRadius: 8 }} />
            <button
              onClick={(e) => { e.stopPropagation(); setPreview(null); onFileSelect(null) }}
              style={{
                position: 'absolute', top: -8, right: -8,
                background: '#ef4444', border: 'none', borderRadius: '50%',
                width: 24, height: 24, cursor: 'pointer', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            ><X size={12} /></button>
          </div>
        ) : (
          <>
            <Upload size={32} style={{ color: 'var(--text-secondary)', marginBottom: 8 }} />
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Drag & drop or click · JPG, PNG, HEAP</div>
            <div style={{ fontSize: 11, color: '#6366f1', marginTop: 6 }}>📸 Camera capture also supported</div>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files[0])}
      />
    </div>
  )
}
