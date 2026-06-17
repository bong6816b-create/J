'use client'
import { useEffect, useState, useRef } from 'react'
import { useApp } from '@/components/MainLayoutClient'
import { createClient } from '@/lib/supabase/client'
import { NATIONALITIES, JOB_TYPES } from '@/lib/utils/constants'
import type { Worker, Attendance } from '@/types'
import Toast from '@/components/Toast'
import QRCode from 'qrcode'

type SubTab = 'att' | 'reg'

export default function WorkersPage() {
  const { selectedSite, selectedDate } = useApp()
  const supabase = createClient()
  const [subTab, setSubTab] = useState<SubTab>('att')
  const [workers, setWorkers] = useState<Worker[]>([])
  const [attendances, setAttendances] = useState<Attendance[]>([])
  const [showRegForm, setShowRegForm] = useState(false)
  const [newWorker, setNewWorker] = useState({ name: '', role: JOB_TYPES[0], nationality: 'ko', daily_rate: 180000, phone: '' })
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'ok' | 'warn' | ''>('')
  const [sigWorker, setSigWorker] = useState<Worker | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [qrWorker, setQrWorker] = useState<Worker | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState('')

  useEffect(() => {
    if (!selectedSite) return
    loadData()
  }, [selectedSite, selectedDate])

  async function loadData() {
    if (!selectedSite) return
    const { data: company } = await supabase.from('companies').select('id').single()
    if (!company) return

    const { data: ws } = await supabase
      .from('workers')
      .select('*')
      .eq('company_id', company.id)
      .order('name')
    setWorkers(ws ?? [])

    const { data: atts } = await supabase
      .from('attendances')
      .select('*, worker:workers(*)')
      .eq('site_id', selectedSite.id)
      .eq('att_date', selectedDate)
    setAttendances((atts ?? []) as Attendance[])
  }

  function isCheckedIn(workerId: string) {
    return attendances.some(a => a.worker_id === workerId)
  }

  async function toggleAttendance(worker: Worker) {
    if (!selectedSite) return
    const existing = attendances.find(a => a.worker_id === worker.id)
    if (existing) {
      await supabase.from('attendances').delete().eq('id', existing.id)
      setAttendances(prev => prev.filter(a => a.worker_id !== worker.id))
      showToast(`${worker.name} 출역 취소`)
    } else {
      const { data } = await supabase.from('attendances').insert({
        worker_id: worker.id,
        site_id: selectedSite.id,
        att_date: selectedDate,
        check_in: new Date().toTimeString().slice(0, 5),
        days: 1,
      }).select('*, worker:workers(*)').single()
      if (data) setAttendances(prev => [...prev, data as Attendance])
      showToast(`✅ ${worker.name} 출역 확인!`, 'ok')
    }
  }

  async function registerWorker() {
    if (!newWorker.name) { showToast('이름을 입력하세요', 'warn'); return }
    const { data: company } = await supabase.from('companies').select('id').single()
    if (!company) return

    const qrCode = `JC-${Date.now()}`
    const { data } = await supabase.from('workers').insert({
      ...newWorker,
      company_id: company.id,
      qr_code: qrCode,
    }).select().single()

    if (data) {
      setWorkers(prev => [...prev, data])
      setNewWorker({ name: '', role: JOB_TYPES[0], nationality: 'ko', daily_rate: 180000, phone: '' })
      setShowRegForm(false)
      showToast(`✅ ${data.name} 등록 완료!`, 'ok')
    }
  }

  async function showQR(worker: Worker) {
    setQrWorker(worker)
    const url = await QRCode.toDataURL(worker.qr_code, { width: 200, margin: 2, color: { dark: '#2C1810', light: '#FFF8EE' } })
    setQrDataUrl(url)
  }

  function showToast(msg: string, type: 'ok' | 'warn' | '' = '') {
    setToast(msg); setToastType(type)
    setTimeout(() => setToast(''), 2500)
  }

  // Signature canvas
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
    const dataUrl = canvasRef.current.toDataURL()
    // Upload signature
    const blob = await (await fetch(dataUrl)).blob()
    const path = `sigs/${selectedSite.id}/${selectedDate}/${sigWorker.id}.png`
    const { data: uploaded } = await supabase.storage.from('site-photos').upload(path, blob, { upsert: true })
    if (uploaded) {
      const { data: url } = supabase.storage.from('site-photos').getPublicUrl(uploaded.path)
      const att = attendances.find(a => a.worker_id === sigWorker.id)
      if (att) {
        await supabase.from('attendances').update({ sig_url: url.publicUrl, signed_at: new Date().toISOString() }).eq('id', att.id)
        setAttendances(prev => prev.map(a => a.worker_id === sigWorker.id ? { ...a, sig_url: url.publicUrl } : a))
      }
    }
    setSigWorker(null)
    showToast('✅ 서명 저장 완료!', 'ok')
  }

  const checkedCount = attendances.length
  const totalCount = workers.length

  if (!selectedSite) {
    return (
      <div className="empty-state" style={{ paddingTop: '60px' }}>
        <div className="ei">👷</div>
        <div style={{ fontWeight: 700 }}>현장을 선택하세요</div>
      </div>
    )
  }

  return (
    <div>
      {/* Sub Tabs */}
      <div style={{ display: 'flex', gap: '5px', marginBottom: '11px' }}>
        {[{ key: 'att', label: '출역 체크' }, { key: 'reg', label: '근로자 관리' }].map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key as SubTab)}
            style={{ background: subTab === t.key ? 'var(--br)' : 'var(--g1)', border: `1.5px solid ${subTab === t.key ? 'var(--br)' : 'var(--cream3)'}`, borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: subTab === t.key ? 700 : 500, color: subTab === t.key ? 'var(--cream)' : 'var(--tx3)', cursor: 'pointer', fontFamily: 'var(--sans)' }}>
            {t.label}
          </button>
        ))}
        <button onClick={() => { setShowRegForm(true); setSubTab('reg') }}
          style={{ marginLeft: 'auto', background: 'var(--gold)', border: 'none', borderRadius: '8px', padding: '7px 12px', fontSize: '12px', fontWeight: 800, color: 'var(--br)', cursor: 'pointer', fontFamily: 'var(--sans)' }}>
          + 인원 등록
        </button>
      </div>

      {/* 출역 체크 */}
      {subTab === 'att' && (
        <>
          {/* QR Zone */}
          <div style={{ background: 'linear-gradient(135deg, var(--br), var(--cara))', borderRadius: '16px', padding: '22px 18px', textAlign: 'center', cursor: 'pointer', marginBottom: '12px', boxShadow: '0 5px 20px rgba(44,24,16,.2)', position: 'relative', overflow: 'hidden' }}
            onClick={() => showToast('📷 QR 스캔 기능 준비 중', 'warn')}>
            <div style={{ width: '54px', height: '54px', background: 'var(--gold)', borderRadius: '13px', margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', boxShadow: '0 3px 12px rgba(245,200,66,.4)' }}>📷</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--cream)', marginBottom: '3px' }}>QR 스캔으로 출역 체크</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,248,238,.65)' }}>등록된 근로자의 QR코드를 스캔하세요</div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div className="card-t" style={{ margin: 0 }}>출역 현황</div>
              <div style={{ fontSize: '12px', fontWeight: 700 }}>
                <span style={{ color: 'var(--grn)' }}>{checkedCount}</span>
                <span style={{ color: 'var(--tx3)' }}>/{totalCount}명</span>
              </div>
            </div>
            {workers.length === 0 ? (
              <div className="empty-state">
                <div className="ei">👷</div>
                인원을 먼저 등록해주세요
                <br /><br />
                <button className="btn btn-gold btn-sm" onClick={() => setSubTab('reg')}>+ 인원 등록</button>
              </div>
            ) : (
              workers.map(w => {
                const checked = isCheckedIn(w.id)
                const att = attendances.find(a => a.worker_id === w.id)
                const flag = NATIONALITIES[w.nationality]?.split(' ')[0] ?? '🏳️'
                return (
                  <div key={w.id} onClick={() => toggleAttendance(w)}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '10px', border: `1.5px solid ${checked ? 'rgba(46,125,82,.25)' : 'transparent'}`, background: checked ? '#F0FFF7' : 'transparent', transition: 'all .18s', cursor: 'pointer', marginBottom: '6px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', background: checked ? '#DCFCE7' : 'var(--g1)', flexShrink: 0 }}>{flag}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                        {w.name}
                        <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '20px', background: '#DBEAFE', color: 'var(--blue)' }}>{w.role}</span>
                        {att?.sig_url && <span style={{ fontSize: '9px', color: 'var(--grn)' }}>✍️</span>}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--tx3)', marginTop: '1px' }}>
                        {checked ? `입실 ${att?.check_in ?? ''}` : '미출역'}
                        {' · '}일당 ₩{w.daily_rate.toLocaleString()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {checked && (
                        <button onClick={e => { e.stopPropagation(); setSigWorker(w) }}
                          style={{ background: 'var(--br)', color: 'var(--cream)', border: 'none', borderRadius: '7px', padding: '4px 9px', fontSize: '10px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
                          서명
                        </button>
                      )}
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', border: `2px solid ${checked ? 'var(--grn)' : 'var(--g2)'}`, background: checked ? 'var(--grn)' : 'transparent', color: checked ? '#fff' : 'transparent', transition: 'all .22s' }}>
                        ✓
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
          <button className="btn btn-main" onClick={() => showToast('⚡ 출역 완료! 일보에 반영됩니다.', 'ok')}>
            ⚡ 출역 완료 · 일보 자동반영
          </button>
        </>
      )}

      {/* 근로자 관리 */}
      {subTab === 'reg' && (
        <>
          {showRegForm && (
            <div className="card">
              <div className="card-t">새 근로자 등록</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>성명</label>
                  <input className="fi" placeholder="홍길동" value={newWorker.name} onChange={e => setNewWorker(w => ({ ...w, name: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>직종</label>
                  <select className="fi" value={newWorker.role} onChange={e => setNewWorker(w => ({ ...w, role: e.target.value }))}>
                    {JOB_TYPES.map(j => <option key={j} value={j}>{j}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>국적</label>
                  <select className="fi" value={newWorker.nationality} onChange={e => setNewWorker(w => ({ ...w, nationality: e.target.value }))}>
                    {Object.entries(NATIONALITIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>일당 (원)</label>
                  <input className="fi" type="number" value={newWorker.daily_rate} onChange={e => setNewWorker(w => ({ ...w, daily_rate: Number(e.target.value) }))} />
                </div>
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>연락처</label>
                <input className="fi" placeholder="010-0000-0000" value={newWorker.phone} onChange={e => setNewWorker(w => ({ ...w, phone: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button className="btn btn-gold" onClick={registerWorker}>✅ 등록</button>
                <button className="btn btn-ghost" onClick={() => setShowRegForm(false)}>취소</button>
              </div>
            </div>
          )}

          {workers.length === 0 ? (
            <div className="empty-state" style={{ paddingTop: '40px' }}>
              <div className="ei">👷</div>
              <div style={{ fontWeight: 700, marginBottom: '8px' }}>등록된 근로자가 없습니다</div>
              <button className="btn btn-gold btn-sm" onClick={() => setShowRegForm(true)}>+ 첫 근로자 등록</button>
            </div>
          ) : (
            <div className="card">
              <div className="card-t">등록된 근로자 ({workers.length}명)</div>
              {workers.map(w => (
                <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid var(--g1)' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--g1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
                    {NATIONALITIES[w.nationality]?.split(' ')[0] ?? '👤'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700 }}>{w.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--tx3)' }}>
                      {w.role} · ₩{w.daily_rate.toLocaleString()}/일
                    </div>
                  </div>
                  <button onClick={() => showQR(w)}
                    style={{ background: 'var(--g1)', border: '1.5px solid var(--cream3)', borderRadius: '8px', padding: '5px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', color: 'var(--tx2)', fontFamily: 'var(--sans)' }}>
                    QR
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Signature Modal */}
      {sigWorker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 95, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--white)', borderRadius: '22px 22px 0 0', padding: '18px 16px 36px', width: '100%', maxWidth: '480px' }}>
            <div style={{ width: '36px', height: '4px', background: 'var(--g2)', borderRadius: '2px', margin: '0 auto 16px' }} />
            <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '3px' }}>전자 서명</div>
            <div style={{ fontSize: '11px', color: 'var(--tx3)', marginBottom: '14px' }}>{sigWorker.name} — 서명란에 서명해주세요</div>
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

      {/* QR Modal */}
      {qrWorker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 95, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
          onClick={() => setQrWorker(null)}>
          <div style={{ background: 'var(--white)', borderRadius: '20px', padding: '24px', width: '280px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>{qrWorker.name}</div>
            <div style={{ fontSize: '11px', color: 'var(--tx3)', marginBottom: '16px' }}>{qrWorker.role}</div>
            {qrDataUrl && <img src={qrDataUrl} alt="QR" style={{ width: '180px', height: '180px', margin: '0 auto 12px', display: 'block' }} />}
            <div style={{ fontSize: '10px', color: 'var(--tx3)', marginBottom: '16px', fontFamily: 'monospace' }}>{qrWorker.qr_code}</div>
            <button className="btn btn-main" onClick={() => setQrWorker(null)}>닫기</button>
          </div>
        </div>
      )}

      <Toast message={toast} type={toastType} />
    </div>
  )
}
