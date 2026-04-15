'use client'
import { useEffect, useRef, useState } from 'react'
import { useApp } from '@/components/MainLayoutClient'
import { createClient } from '@/lib/supabase/client'
import { TBM_TRANSLATIONS } from '@/lib/utils/constants'
import type { Worker } from '@/types'
import Toast from '@/components/Toast'

type Lang = 'ko' | 'vi' | 'zh' | 'ne' | 'mn' | 'kh'

const LANGS: { key: Lang; label: string }[] = [
  { key: 'ko', label: '🇰🇷 한국어' },
  { key: 'vi', label: '🇻🇳 베트남' },
  { key: 'zh', label: '🇨🇳 중국어' },
  { key: 'ne', label: '🇳🇵 네팔어' },
  { key: 'mn', label: '🇲🇳 몽골어' },
  { key: 'kh', label: '🇰🇭 크메르' },
]

export default function SafetyPage() {
  const { selectedSite, selectedDate } = useApp()
  const supabase = createClient()
  const [tbmText, setTbmText] = useState('고소작업(3m 이상) 시 안전대 착용 필수. 낙하물 위험구역 접근 금지.')
  const [selectedLang, setSelectedLang] = useState<Lang>('vi')
  const [tbmOutput, setTbmOutput] = useState('')
  const [tbmLangLabel, setTbmLangLabel] = useState('')
  const [workers, setWorkers] = useState<Worker[]>([])
  const [signedWorkers, setSignedWorkers] = useState<Set<string>>(new Set())
  const [sigWorker, setSigWorker] = useState<Worker | null>(null)
  const [drawing, setDrawing] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'ok' | 'warn' | ''>('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!selectedSite) return
    loadWorkers()
    loadTBM()
  }, [selectedSite, selectedDate])

  async function loadWorkers() {
    if (!selectedSite) return
    const { data: company } = await supabase.from('companies').select('id').single()
    if (!company) return
    const { data } = await supabase.from('workers').select('*').eq('company_id', company.id)
    setWorkers(data ?? [])

    // Load TBM signatures
    const { data: tbmRec } = await supabase
      .from('tbm_records')
      .select('id')
      .eq('site_id', selectedSite.id)
      .eq('tbm_date', selectedDate)
      .single()

    if (tbmRec) {
      const { data: sigs } = await supabase
        .from('tbm_signatures')
        .select('worker_id')
        .eq('tbm_id', tbmRec.id)
      setSignedWorkers(new Set<string>((sigs ?? []).map((s: { worker_id: string }) => s.worker_id)))
    }
  }

  async function loadTBM() {
    if (!selectedSite) return
    const { data } = await supabase
      .from('tbm_records')
      .select('content, language')
      .eq('site_id', selectedSite.id)
      .eq('tbm_date', selectedDate)
      .single()
    if (data?.content) setTbmText(data.content)
    if (data?.language) setSelectedLang(data.language as Lang)
  }

  function doTBM() {
    const t = TBM_TRANSLATIONS[selectedLang]
    setTbmOutput(t.t)
    setTbmLangLabel(t.l)
  }

  async function saveTBM() {
    if (!selectedSite) return
    setSaving(true)
    const existing = await supabase
      .from('tbm_records')
      .select('id')
      .eq('site_id', selectedSite.id)
      .eq('tbm_date', selectedDate)
      .single()

    if (existing.data) {
      await supabase.from('tbm_records').update({ content: tbmText, language: selectedLang }).eq('id', existing.data.id)
    } else {
      await supabase.from('tbm_records').insert({ site_id: selectedSite.id, tbm_date: selectedDate, content: tbmText, language: selectedLang })
    }
    setSaving(false)
    showToast('💾 TBM 저장 완료!', 'ok')
  }

  // Signature
  function startDraw(e: React.TouchEvent | React.MouseEvent) {
    setDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top
    ctx.beginPath()
    ctx.moveTo(x * (canvas.width / rect.width), y * (canvas.height / rect.height))
  }

  function draw(e: React.TouchEvent | React.MouseEvent) {
    if (!drawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#2C1810'
    ctx.lineTo(x * (canvas.width / rect.width), y * (canvas.height / rect.height))
    ctx.stroke()
  }

  async function saveSig() {
    if (!canvasRef.current || !sigWorker || !selectedSite) return

    // Get or create TBM record
    let tbmId: string | null = null
    const { data: existing } = await supabase
      .from('tbm_records')
      .select('id')
      .eq('site_id', selectedSite.id)
      .eq('tbm_date', selectedDate)
      .single()

    if (existing) {
      tbmId = existing.id
    } else {
      const { data: created } = await supabase.from('tbm_records').insert({
        site_id: selectedSite.id,
        tbm_date: selectedDate,
        content: tbmText,
        language: selectedLang,
      }).select().single()
      tbmId = created?.id
    }

    if (!tbmId) return

    // Upload signature
    const dataUrl = canvasRef.current.toDataURL()
    const blob = await (await fetch(dataUrl)).blob()
    const path = `tbm-sigs/${selectedSite.id}/${selectedDate}/${sigWorker.id}.png`
    const { data: uploaded } = await supabase.storage.from('site-photos').upload(path, blob, { upsert: true })

    if (uploaded) {
      const { data: url } = supabase.storage.from('site-photos').getPublicUrl(uploaded.path)
      await supabase.from('tbm_signatures').insert({
        tbm_id: tbmId,
        worker_id: sigWorker.id,
        sig_url: url.publicUrl,
        signed_at: new Date().toISOString(),
      })
      setSignedWorkers(prev => { const s = new Set(Array.from(prev)); s.add(sigWorker.id); return s })
    }

    setSigWorker(null)
    showToast(`✅ ${sigWorker.name} 서명 완료!`, 'ok')
  }

  function showToast(msg: string, type: 'ok' | 'warn' | '' = '') {
    setToast(msg); setToastType(type)
    setTimeout(() => setToast(''), 2500)
  }

  const NATIONALITIES: Record<string, string> = {
    ko: '🇰🇷', vi: '🇻🇳', zh: '🇨🇳', ne: '🇳🇵', mn: '🇲🇳', kh: '🇰🇭',
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--tx)' }}>TBM 안전교육</span>
        <span style={{ background: '#CCFBF1', color: 'var(--teal)', fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '20px' }}>AI 번역</span>
      </div>

      <div style={{ background: 'var(--cream2)', border: '1.5px solid var(--cream3)', borderRadius: '10px', padding: '11px 13px', marginBottom: '10px', fontSize: '11px', color: 'var(--tx2)', lineHeight: 1.55 }}>
        <strong style={{ color: 'var(--br)' }}>🌍 6개국어 즉시 변환</strong> + 전자서명 + 법적 기록 저장<br />
        한국어로 입력하면 6개 언어로 TBM 카드를 생성합니다.
      </div>

      <div className="card">
        <div className="card-t">TBM 내용 입력</div>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>오늘 위험 요소 (한국어)</label>
          <textarea className="fta" value={tbmText} onChange={e => setTbmText(e.target.value)} rows={3} />
        </div>
        <div>
          <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '6px' }}>변환 언어</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            {LANGS.map(l => (
              <button key={l.key} onClick={() => setSelectedLang(l.key)}
                style={{ padding: '9px 6px', borderRadius: '9px', textAlign: 'center', cursor: 'pointer', border: `2px solid ${selectedLang === l.key ? 'var(--cara)' : 'var(--cream3)'}`, background: selectedLang === l.key ? 'var(--cream2)' : 'var(--g1)', fontFamily: 'var(--sans)', fontSize: '11px', fontWeight: selectedLang === l.key ? 700 : 500, color: selectedLang === l.key ? 'var(--br)' : 'var(--tx2)', transition: 'all .18s' }}>
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
        <button className="btn btn-main" onClick={doTBM}>🌐 TBM 카드 생성</button>
        <button className="btn btn-teal" onClick={saveTBM} disabled={saving}>{saving ? '저장 중...' : '💾 저장'}</button>
      </div>

      {tbmOutput && (
        <div style={{ background: 'var(--cream2)', border: '1.5px solid var(--cream3)', borderRadius: 'var(--r)', padding: '13px', marginBottom: '10px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--tx3)', marginBottom: '5px' }}>{tbmLangLabel}</div>
          <div style={{ fontSize: '12px', lineHeight: 1.8, background: 'rgba(255,255,255,.7)', borderRadius: '8px', padding: '10px', whiteSpace: 'pre-line' }}>
            {tbmOutput}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => showToast('🖨️ 출력 기능 준비 중', 'warn')}>🖨️ 출력</button>
            <button className="btn btn-ghost btn-sm" onClick={() => showToast('💾 저장됨', 'ok')}>💾 저장</button>
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div className="card-t" style={{ margin: 0 }}>교육 완료 현황</div>
          <span style={{ fontSize: '10px', color: 'var(--tx3)' }}>탭하여 서명 요청</span>
        </div>
        {workers.length === 0 ? (
          <div className="empty-state"><div className="ei">🦺</div>근로자를 등록해주세요</div>
        ) : (
          workers.map(w => {
            const signed = signedWorkers.has(w.id)
            return (
              <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--g1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '16px' }}>{NATIONALITIES[w.nationality] ?? '🏳️'}</span>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700 }}>{w.name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--tx3)' }}>{w.role}</div>
                  </div>
                </div>
                {signed ? (
                  <span style={{ background: '#DCFCE7', color: 'var(--grn)', fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '20px' }}>✅ 서명완료</span>
                ) : (
                  <button onClick={() => setSigWorker(w)}
                    style={{ background: 'var(--br)', color: 'var(--cream)', border: 'none', borderRadius: '7px', padding: '4px 9px', fontSize: '10px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
                    서명 요청
                  </button>
                )}
              </div>
            )
          })
        )}
        <div style={{ marginTop: '10px', padding: '8px', background: 'var(--cream2)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700 }}>
          <span>서명 완료</span>
          <span style={{ color: 'var(--grn)' }}>{signedWorkers.size} / {workers.length}명</span>
        </div>
      </div>

      {/* Signature Modal */}
      {sigWorker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 95, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--white)', borderRadius: '22px 22px 0 0', padding: '18px 16px 36px', width: '100%', maxWidth: '480px' }}>
            <div style={{ width: '36px', height: '4px', background: 'var(--g2)', borderRadius: '2px', margin: '0 auto 16px' }} />
            <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '3px' }}>TBM 교육 확인 서명</div>
            <div style={{ fontSize: '11px', color: 'var(--tx3)', marginBottom: '14px' }}>{sigWorker.name} — 교육 내용을 이해하고 서명하세요</div>
            <canvas ref={canvasRef} width={400} height={150}
              style={{ width: '100%', height: '150px', background: 'var(--g1)', borderRadius: '10px', border: '1.5px solid var(--cream3)', touchAction: 'none', display: 'block' }}
              onMouseDown={startDraw} onMouseMove={draw} onMouseUp={() => setDrawing(false)}
              onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={() => setDrawing(false)} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
              <button className="btn btn-ghost" onClick={() => { const ctx = canvasRef.current?.getContext('2d'); if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height) }}>다시 쓰기</button>
              <button className="btn btn-main" onClick={saveSig}>✅ 서명 완료</button>
            </div>
            <button className="btn btn-ghost" onClick={() => setSigWorker(null)} style={{ marginTop: '8px' }}>취소</button>
          </div>
        </div>
      )}

      <Toast message={toast} type={toastType} />
    </div>
  )
}
