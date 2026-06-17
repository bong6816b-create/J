'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/components/MainLayoutClient'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

function generateToken() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function ShareSettingsPage() {
  const { selectedSite, setSelectedSite, sites } = useApp()
  const supabase = createClient()
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'ok' | 'warn' | ''>('')

  useEffect(() => {
    if (selectedSite) setToken(selectedSite.share_token ?? null)
  }, [selectedSite])

  function showToast(msg: string, type: 'ok' | 'warn' | '' = '') {
    setToast(msg); setToastType(type); setTimeout(() => setToast(''), 2500)
  }

  async function generateLink() {
    if (!selectedSite) return
    setLoading(true)
    const newToken = generateToken()
    const { error } = await supabase.from('sites').update({ share_token: newToken }).eq('id', selectedSite.id)
    if (!error) {
      setToken(newToken)
      setSelectedSite({ ...selectedSite, share_token: newToken })
      showToast('✅ 공유 링크 생성 완료', 'ok')
    }
    setLoading(false)
  }

  async function revokeLink() {
    if (!selectedSite || !confirm('공유 링크를 비활성화하면 기존 링크로 접근이 불가능합니다. 계속하시겠습니까?')) return
    setLoading(true)
    const { error } = await supabase.from('sites').update({ share_token: null }).eq('id', selectedSite.id)
    if (!error) {
      setToken(null)
      setSelectedSite({ ...selectedSite, share_token: undefined })
      showToast('공유 링크가 비활성화되었습니다')
    }
    setLoading(false)
  }

  async function copyLink() {
    if (!token) return
    const url = `${window.location.origin}/share/${token}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    showToast('✅ 링크 복사됨', 'ok')
    setTimeout(() => setCopied(false), 2000)
  }

  const shareUrl = token ? (typeof window !== 'undefined' ? `${window.location.origin}/share/${token}` : `/share/${token}`) : null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
        <span style={{ fontSize: '14px', fontWeight: 700 }}>발주처 공유 링크</span>
        <span className="tag tb">읽기 전용</span>
      </div>

      <div style={{ background: 'var(--cream2)', border: '1.5px solid var(--cream3)', borderRadius: '10px', padding: '11px 13px', marginBottom: '14px', fontSize: '11px', color: 'var(--tx2)', lineHeight: 1.6 }}>
        <strong style={{ color: 'var(--br)' }}>📤 발주처 공유 링크</strong>란 로그인 없이 공사 현황을 볼 수 있는 읽기 전용 페이지입니다.<br />
        공정 현황, 일보, 현장사진 등을 발주처에 공유하세요. 민감한 노무·원가 정보는 표시되지 않습니다.
      </div>

      {!selectedSite ? (
        <div className="empty-state" style={{ paddingTop: '60px' }}>
          <div className="ei">📤</div>
          <div style={{ fontWeight: 700 }}>현장을 먼저 선택하세요</div>
        </div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: '10px' }}>
            <div className="card-t">현재 현장: {selectedSite.name}</div>

            {token ? (
              <>
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', marginBottom: '6px' }}>공유 링크 URL</div>
                  <div style={{ background: 'var(--g1)', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: 'var(--tx2)', wordBreak: 'break-all', lineHeight: 1.5, display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <span style={{ flex: 1 }}>{shareUrl}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                  <button className="btn btn-gold" onClick={copyLink}>
                    {copied ? '✓ 복사됨!' : '📋 링크 복사'}
                  </button>
                  <a href={shareUrl ?? '#'} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px', fontSize: '13px', fontWeight: 700, textDecoration: 'none', cursor: 'pointer' }}>
                    🔗 미리보기
                  </a>
                </div>

                <button className="btn btn-ghost" onClick={revokeLink} disabled={loading}
                  style={{ width: '100%', color: 'var(--red)', borderColor: 'rgba(230,59,46,.3)', fontSize: '12px' }}>
                  🔒 링크 비활성화
                </button>
              </>
            ) : (
              <div>
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--tx3)', fontSize: '13px', marginBottom: '14px' }}>
                  아직 공유 링크가 없습니다
                </div>
                <button className="btn btn-main" onClick={generateLink} disabled={loading} style={{ width: '100%' }}>
                  {loading ? '생성 중...' : '🔗 공유 링크 생성'}
                </button>
              </div>
            )}
          </div>

          {/* 다른 현장 링크 현황 */}
          {sites.filter(s => s.share_token).length > 0 && (
            <div className="card">
              <div className="card-t">활성화된 공유 링크</div>
              {sites.filter(s => s.share_token).map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--g1)' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600 }}>{s.name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--tx3)' }}>/share/{s.share_token}</div>
                  </div>
                  <a href={`/share/${s.share_token}`} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '11px', color: 'var(--teal)', fontWeight: 700, textDecoration: 'none' }}>
                    열기 →
                  </a>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <Toast message={toast} type={toastType} />
    </div>
  )
}
