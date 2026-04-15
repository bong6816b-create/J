'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/components/MainLayoutClient'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

export default function PhotosPage() {
  const { selectedSite, selectedDate } = useApp()
  const supabase = createClient()
  const [photos, setPhotos] = useState<{ id: string; photo_url: string; taken_at: string; work_type?: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'ok' | 'warn' | ''>('')
  const [preview, setPreview] = useState('')

  useEffect(() => {
    if (!selectedSite) return
    loadPhotos()
  }, [selectedSite, selectedDate])

  async function loadPhotos() {
    if (!selectedSite) return
    const { data } = await supabase
      .from('site_photos')
      .select('*')
      .eq('site_id', selectedSite.id)
      .order('taken_at', { ascending: false })
    setPhotos(data ?? [])
  }

  async function uploadPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || !selectedSite) return
    setUploading(true)
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()
      const path = `${selectedSite.id}/${selectedDate}/${Date.now()}.${ext}`
      const { data: uploaded } = await supabase.storage.from('site-photos').upload(path, file)
      if (uploaded) {
        const { data: url } = supabase.storage.from('site-photos').getPublicUrl(uploaded.path)
        const { data: rec } = await supabase.from('site_photos').insert({
          site_id: selectedSite.id,
          photo_url: url.publicUrl,
          taken_at: new Date().toISOString(),
        }).select().single()
        if (rec) setPhotos(prev => [rec, ...prev])
      }
    }
    setUploading(false)
    showToast('📷 사진 업로드 완료!', 'ok')
    e.target.value = ''
  }

  async function deletePhoto(id: string) {
    await supabase.from('site_photos').delete().eq('id', id)
    setPhotos(prev => prev.filter(p => p.id !== id))
    showToast('삭제됨')
  }

  function showToast(msg: string, type: 'ok' | 'warn' | '' = '') {
    setToast(msg); setToastType(type)
    setTimeout(() => setToast(''), 2500)
  }

  if (!selectedSite) {
    return <div className="empty-state" style={{ paddingTop: '60px' }}><div className="ei">📷</div><div>현장을 선택하세요</div></div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700 }}>현장 사진 ({photos.length})</div>
        <label style={{ background: 'var(--gold)', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', color: 'var(--br)', fontFamily: 'var(--sans)' }}>
          {uploading ? '업로드 중...' : '📷 사진 추가'}
          <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={uploadPhotos} />
        </label>
      </div>

      {photos.length === 0 ? (
        <div className="empty-state" style={{ paddingTop: '60px' }}>
          <div className="ei">📷</div>
          <div style={{ fontWeight: 700, marginBottom: '8px' }}>등록된 사진이 없습니다</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
          {photos.map(p => (
            <div key={p.id} style={{ aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', position: 'relative', background: 'var(--g1)' }}>
              <img src={p.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} onClick={() => setPreview(p.photo_url)} />
              <button onClick={() => deletePhoto(p.id)}
                style={{ position: 'absolute', top: '3px', right: '3px', background: 'rgba(0,0,0,.6)', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {preview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.9)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setPreview('')}>
          <img src={preview} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        </div>
      )}

      <Toast message={toast} type={toastType} />
    </div>
  )
}
