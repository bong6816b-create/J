'use client'
import { useEffect, useRef, useState } from 'react'
import { useApp } from '@/components/MainLayoutClient'
import { createClient } from '@/lib/supabase/client'
import type { Worker } from '@/types'
import Toast from '@/components/Toast'
import { format } from 'date-fns'

export default function ContractsPage() {
  const { selectedSite, selectedDate, company } = useApp()
  const supabase = createClient()
  const [workers, setWorkers] = useState<Worker[]>([])
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null)
  const [contracts, setContracts] = useState<any[]>([])
  const [form, setForm] = useState({
    start_date: selectedDate,
    end_date: '',
    daily_wage: 180000,
    work_hours: '08:00~17:00',
    work_place: '',
    task: '',
    employer: '',
  })
  const [step, setStep] = useState<'select' | 'form' | 'sign'>('select')
  const [drawing, setDrawing] = useState(false)
  const [sigType, setSigType] = useState<'employer' | 'worker'>('employer')
  const empCanvasRef = useRef<HTMLCanvasElement>(null)
  const workerCanvasRef = useRef<HTMLCanvasElement>(null)
  const [empSigDone, setEmpSigDone] = useState(false)
  const [workerSigDone, setWorkerSigDone] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'ok' | 'warn' | ''>('')

  useEffect(() => { loadData() }, [selectedSite])

  async function loadData() {
    if (!company) return
    const { data: ws } = await supabase.from('workers').select('*').eq('company_id', company.id)
    setWorkers(ws ?? [])
    if (selectedSite) {
      const { data: cs } = await supabase.from('contracts').select('*, worker:workers(*)').eq('site_id', selectedSite.id).order('created_at', { ascending: false })
      setContracts(cs ?? [])
    }
  }

  function selectWorker(w: Worker) {
    setSelectedWorker(w)
    setForm(f => ({ ...f, daily_wage: w.daily_rate, work_place: selectedSite?.name ?? '' }))
    setStep('form')
  }

  // Canvas drawing
  function getCanvas() { return sigType === 'employer' ? empCanvasRef.current : workerCanvasRef.current }

  function startDraw(e: React.TouchEvent | React.MouseEvent) {
    setDrawing(true)
    const canvas = getCanvas(); if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top
    ctx.beginPath(); ctx.moveTo(x * (canvas.width / rect.width), y * (canvas.height / rect.height))
  }

  function draw(e: React.TouchEvent | React.MouseEvent) {
    if (!drawing) return
    const canvas = getCanvas(); if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top
    ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.strokeStyle = '#2C1810'
    ctx.lineTo(x * (canvas.width / rect.width), y * (canvas.height / rect.height)); ctx.stroke()
  }

  function clearCanvas() {
    const canvas = getCanvas(); if (!canvas) return
    const ctx = canvas.getContext('2d'); if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (sigType === 'employer') setEmpSigDone(false); else setWorkerSigDone(false)
  }

  function confirmSig() {
    if (sigType === 'employer') { setEmpSigDone(true); setSigType('worker') }
    else { setWorkerSigDone(true) }
  }

  async function saveContract() {
    if (!selectedWorker || !selectedSite) return
    setSaving(true)
    // Upload signatures
    async function uploadSig(canvas: HTMLCanvasElement | null, name: string) {
      if (!canvas) return null
      const blob = await (await fetch(canvas.toDataURL())).blob()
      const path = `contracts/${selectedSite!.id}/${selectedWorker!.id}/${name}.png`
      const { data } = await supabase.storage.from('site-photos').upload(path, blob, { upsert: true })
      if (!data) return null
      const { data: url } = supabase.storage.from('site-photos').getPublicUrl(data.path)
      return url.publicUrl
    }
    const empSig = await uploadSig(empCanvasRef.current, 'employer')
    const workerSig = await uploadSig(workerCanvasRef.current, 'worker')
    const { data } = await supabase.from('contracts').insert({
      worker_id: selectedWorker.id,
      site_id: selectedSite.id,
      ...form,
      emp_sig_url: empSig,
      worker_sig_url: workerSig,
    }).select('*, worker:workers(*)').single()
    if (data) setContracts(prev => [data, ...prev])
    setSaving(false)
    setStep('select')
    setSelectedWorker(null)
    setEmpSigDone(false); setWorkerSigDone(false)
    setSigType('employer')
    showToast('✅ 근로계약서 저장 완료!', 'ok')
  }

  function showToast(msg: string, type: 'ok' | 'warn' | '' = '') {
    setToast(msg); setToastType(type); setTimeout(() => setToast(''), 2500)
  }

  const NATIONALITIES: Record<string, string> = { ko: '🇰🇷', vi: '🇻🇳', zh: '🇨🇳', ne: '🇳🇵', mn: '🇲🇳', kh: '🇰🇭' }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
        <span style={{ fontSize: '14px', fontWeight: 700 }}>근로계약서</span>
        <span className="tag tb">전자서명</span>
      </div>

      {/* 근로자 선택 */}
      {step === 'select' && (
        <>
          <div style={{ background: 'var(--cream2)', border: '1.5px solid var(--cream3)', borderRadius: '10px', padding: '11px 13px', marginBottom: '10px', fontSize: '11px', color: 'var(--tx2)', lineHeight: 1.55 }}>
            <strong style={{ color: 'var(--br)' }}>📄 전자 근로계약서</strong> — 근로자·사업주 전자서명 후 법적 효력 발생. 서명 이미지 Supabase Storage에 저장.
          </div>

          {/* 기존 계약서 목록 */}
          {contracts.length > 0 && (
            <div className="card" style={{ marginBottom: '10px' }}>
              <div className="card-t">저장된 계약서 ({contracts.length}건)</div>
              {contracts.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 0', borderBottom: i < contracts.length - 1 ? '1px solid var(--g1)' : 'none' }}>
                  <span style={{ fontSize: '18px' }}>{NATIONALITIES[(c.worker as Worker)?.nationality] ?? '👤'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: 700 }}>{(c.worker as Worker)?.name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--tx3)' }}>{c.start_date} ~ {c.end_date || '미정'} · ₩{(c.daily_wage || 0).toLocaleString()}/일</div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {c.emp_sig_url && <span style={{ fontSize: '9px', background: '#DBEAFE', color: 'var(--blue)', padding: '2px 5px', borderRadius: '10px', fontWeight: 700 }}>사업주✍️</span>}
                    {c.worker_sig_url && <span style={{ fontSize: '9px', background: '#DCFCE7', color: 'var(--grn)', padding: '2px 5px', borderRadius: '10px', fontWeight: 700 }}>근로자✍️</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="card">
            <div className="card-t">계약서 작성 — 근로자 선택</div>
            {workers.length === 0 ? (
              <div className="empty-state"><div className="ei">👤</div>근로자를 먼저 등록하세요</div>
            ) : workers.map(w => (
              <div key={w.id} onClick={() => selectWorker(w)}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '10px', border: '1.5px solid var(--cream3)', marginBottom: '6px', cursor: 'pointer', background: 'var(--g1)' }}>
                <span style={{ fontSize: '20px' }}>{NATIONALITIES[w.nationality] ?? '👤'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>{w.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--tx3)' }}>{w.role} · ₩{w.daily_rate.toLocaleString()}/일</div>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--teal)', fontWeight: 700 }}>작성 →</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 계약 내용 입력 */}
      {step === 'form' && selectedWorker && (
        <>
          <div className="card">
            <div className="card-t">계약 내용 — {selectedWorker.name}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>계약 시작일</label>
                <input className="fi" type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>계약 종료일</label>
                <input className="fi" type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>일당 (원)</label>
                <input className="fi" type="number" value={form.daily_wage} onChange={e => setForm(f => ({ ...f, daily_wage: Number(e.target.value) }))} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>근무시간</label>
                <input className="fi" placeholder="08:00~17:00" value={form.work_hours} onChange={e => setForm(f => ({ ...f, work_hours: e.target.value }))} />
              </div>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>근무 장소</label>
              <input className="fi" value={form.work_place} onChange={e => setForm(f => ({ ...f, work_place: e.target.value }))} />
            </div>
            <div style={{ marginBottom: '8px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>담당 업무</label>
              <input className="fi" placeholder="철근 배근 작업" value={form.task} onChange={e => setForm(f => ({ ...f, task: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>사업주명</label>
              <input className="fi" placeholder="홍길동" value={form.employer} onChange={e => setForm(f => ({ ...f, employer: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button className="btn btn-gold" onClick={() => setStep('sign')}>✍️ 서명 단계로</button>
            <button className="btn btn-ghost" onClick={() => setStep('select')}>← 뒤로</button>
          </div>
        </>
      )}

      {/* 전자서명 */}
      {step === 'sign' && selectedWorker && (
        <>
          {/* 서명 탭 선택 */}
          <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
            {([['employer', '사업주 서명'], ['worker', '근로자 서명']] as const).map(([key, label]) => (
              <button key={key} onClick={() => setSigType(key)}
                style={{ flex: 1, background: sigType === key ? 'var(--br)' : 'var(--g1)', border: `1.5px solid ${sigType === key ? 'var(--br)' : 'var(--cream3)'}`, borderRadius: '8px', padding: '8px', fontSize: '12px', fontWeight: 700, color: sigType === key ? 'var(--cream)' : 'var(--tx3)', cursor: 'pointer', fontFamily: 'var(--sans)', position: 'relative' }}>
                {label}
                {((key === 'employer' && empSigDone) || (key === 'worker' && workerSigDone)) &&
                  <span style={{ position: 'absolute', top: '3px', right: '6px', color: 'var(--grn)', fontSize: '14px' }}>✓</span>}
              </button>
            ))}
          </div>

          <div className="card">
            <div className="card-t">{sigType === 'employer' ? '사업주' : `근로자 (${selectedWorker.name})`} 서명란</div>
            <canvas
              ref={sigType === 'employer' ? empCanvasRef : workerCanvasRef}
              width={400} height={150}
              style={{ width: '100%', height: '150px', background: 'var(--g1)', borderRadius: '10px', border: '1.5px solid var(--cream3)', touchAction: 'none', display: 'block' }}
              onMouseDown={startDraw} onMouseMove={draw} onMouseUp={() => setDrawing(false)}
              onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={() => setDrawing(false)}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
              <button className="btn btn-ghost" onClick={clearCanvas}>다시 쓰기</button>
              <button className="btn btn-teal" onClick={confirmSig}>
                {sigType === 'employer' ? (empSigDone ? '✓ 완료' : '확인') : (workerSigDone ? '✓ 완료' : '확인')}
              </button>
            </div>
          </div>

          <div style={{ background: 'var(--cream2)', border: '1.5px solid var(--cream3)', borderRadius: '8px', padding: '10px', marginBottom: '10px', fontSize: '11px', color: 'var(--tx2)' }}>
            사업주 서명 {empSigDone ? '✅' : '⬜'} · 근로자 서명 {workerSigDone ? '✅' : '⬜'}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button className="btn btn-main" onClick={saveContract} disabled={saving || !empSigDone || !workerSigDone}>
              {saving ? '저장 중...' : '💾 계약서 저장'}
            </button>
            <button className="btn btn-ghost" onClick={() => setStep('form')}>← 뒤로</button>
          </div>
        </>
      )}

      <Toast message={toast} type={toastType} />
    </div>
  )
}
