'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/components/MainLayoutClient'
import { createClient } from '@/lib/supabase/client'
import { WORK_TYPES, WEATHER_OPTIONS, JOB_TYPES, NATIONALITIES } from '@/lib/utils/constants'
import type { DailyLog, Material, EquipmentUsage, Attendance } from '@/types'
import Toast from '@/components/Toast'

type Tab = 'all' | 'work' | 'worker' | 'material' | 'equip' | 'photo'

export default function DailyPage() {
  const { selectedSite, selectedDate } = useApp()
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('all')
  const [log, setLog] = useState<Partial<DailyLog>>({})
  const [materials, setMaterials] = useState<Partial<Material>[]>([])
  const [equips, setEquips] = useState<Partial<EquipmentUsage>[]>([])
  const [attendances, setAttendances] = useState<Partial<Attendance>[]>([])
  const [newMat, setNewMat] = useState({ name: '', spec: '', qty: 0, unit: '', unit_price: 0 })
  const [newEq, setNewEq] = useState({ name: '', spec: '', qty: 1, hours: 8, unit_price: 0 })
  const [showMatForm, setShowMatForm] = useState(false)
  const [showEqForm, setShowEqForm] = useState(false)
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'ok' | 'warn' | ''>('')
  const [saving, setSaving] = useState(false)
  const [photos, setPhotos] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!selectedSite) return
    loadData()
  }, [selectedSite, selectedDate])

  async function loadData() {
    if (!selectedSite) return
    const { data: logData } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('site_id', selectedSite.id)
      .eq('log_date', selectedDate)
      .single()
    if (logData) {
      setLog(logData)
      // Load related data
      const { data: mats } = await supabase.from('materials').select('*').eq('log_id', logData.id)
      const { data: eqs } = await supabase.from('equipment_usage').select('*').eq('log_id', logData.id)
      const { data: photos_data } = await supabase.from('site_photos').select('*').eq('log_id', logData.id)
      setMaterials(mats ?? [])
      setEquips(eqs ?? [])
      setPhotos((photos_data ?? []).map((p: any) => p.photo_url))
    } else {
      setLog({ site_id: selectedSite.id, log_date: selectedDate, weather: '🌤️ 구름조금', work_type: WORK_TYPES[0], progress: 0, kr_workers: 0, fo_workers: 0 })
      setMaterials([])
      setEquips([])
      setPhotos([])
    }

    // Load attendances for count
    const { data: atts } = await supabase
      .from('attendances')
      .select('*, worker:workers(*)')
      .eq('site_id', selectedSite.id)
      .eq('att_date', selectedDate)
    setAttendances(atts ?? [])
  }

  async function saveLog() {
    if (!selectedSite) { showToast('⚠️ 현장을 먼저 선택하세요', 'warn'); return }
    setSaving(true)
    const kr = attendances.filter((a: any) => a.worker?.nationality === 'ko').length
    const fo = attendances.filter((a: any) => a.worker?.nationality !== 'ko').length

    const payload = {
      ...log,
      site_id: selectedSite.id,
      log_date: selectedDate,
      kr_workers: kr || log.kr_workers || 0,
      fo_workers: fo || log.fo_workers || 0,
    }

    let logId = log.id
    if (log.id) {
      await supabase.from('daily_logs').update(payload).eq('id', log.id)
    } else {
      const { data } = await supabase.from('daily_logs').insert(payload).select().single()
      logId = data?.id
      setLog(prev => ({ ...prev, id: logId }))
    }

    // Save materials
    if (logId) {
      await supabase.from('materials').delete().eq('log_id', logId)
      if (materials.length > 0) {
        await supabase.from('materials').insert(materials.map(m => ({ ...m, log_id: logId })))
      }
      await supabase.from('equipment_usage').delete().eq('log_id', logId)
      if (equips.length > 0) {
        await supabase.from('equipment_usage').insert(equips.map(e => ({ ...e, log_id: logId })))
      }
    }

    setSaving(false)
    showToast('✅ 일보 저장 완료!', 'ok')
  }

  function showToast(msg: string, type: 'ok' | 'warn' = 'ok') {
    setToast(msg); setToastType(type)
    setTimeout(() => setToast(''), 2500)
  }

  function addMat() {
    if (!newMat.name) return
    setMaterials(prev => [...prev, { ...newMat, id: `new-${Date.now()}` }])
    setNewMat({ name: '', spec: '', qty: 0, unit: '', unit_price: 0 })
    setShowMatForm(false)
    showToast('자재 추가됨')
  }

  function addEq() {
    if (!newEq.name) return
    setEquips(prev => [...prev, { ...newEq, id: `new-${Date.now()}` }])
    setNewEq({ name: '', spec: '', qty: 1, hours: 8, unit_price: 0 })
    setShowEqForm(false)
    showToast('장비 추가됨')
  }

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || !selectedSite) return
    setUploading(true)
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()
      const path = `${selectedSite.id}/${selectedDate}/${Date.now()}.${ext}`
      const { data } = await supabase.storage.from('site-photos').upload(path, file)
      if (data) {
        const { data: url } = supabase.storage.from('site-photos').getPublicUrl(data.path)
        setPhotos(prev => [...prev, url.publicUrl])
        // Save to DB if we have a log id
        if (log.id) {
          await supabase.from('site_photos').insert({ log_id: log.id, site_id: selectedSite.id, photo_url: url.publicUrl, taken_at: new Date().toISOString() })
        }
      }
    }
    setUploading(false)
    showToast('📷 사진 업로드 완료!')
    e.target.value = ''
  }

  const totalMat = materials.reduce((s, m) => s + (m.qty ?? 0) * (m.unit_price ?? 0), 0)
  const totalEq = equips.reduce((s, e) => s + (e.qty ?? 0) * (e.hours ?? 0) * (e.unit_price ?? 0), 0)
  const krWorkers = attendances.filter((a: any) => a.worker?.nationality === 'ko').length
  const foWorkers = attendances.filter((a: any) => a.worker?.nationality !== 'ko').length

  const TABS: { key: Tab; label: string }[] = [
    { key: 'all', label: '전체 입력' },
    { key: 'work', label: '작업/특이사항' },
    { key: 'worker', label: '근로자' },
    { key: 'material', label: '자재' },
    { key: 'equip', label: '장비' },
    { key: 'photo', label: '현장사진' },
  ]

  if (!selectedSite) {
    return (
      <div className="empty-state" style={{ paddingTop: '60px' }}>
        <div className="ei">📋</div>
        <div style={{ fontWeight: 700, marginBottom: '8px' }}>현장을 선택하세요</div>
        <div>상단에서 현장을 선택하면 일보를 입력할 수 있습니다</div>
      </div>
    )
  }

  return (
    <div>
      {/* Sub Tabs */}
      <div style={{ display: 'flex', gap: '5px', marginBottom: '11px', overflowX: 'auto', paddingBottom: '2px' }} className="no-scrollbar">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ background: tab === t.key ? 'var(--br)' : 'var(--g1)', border: `1.5px solid ${tab === t.key ? 'var(--br)' : 'var(--cream3)'}`, borderRadius: '8px', padding: '7px 12px', fontSize: '12px', fontWeight: tab === t.key ? 700 : 500, color: tab === t.key ? 'var(--cream)' : 'var(--tx3)', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'var(--sans)', transition: 'all .15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* 전체 입력 */}
      {(tab === 'all' || tab === 'work') && (
        <>
          <div className="card">
            <div className="card-t">기본 정보</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>현장명</label>
                <input className="fi" value={selectedSite.name} readOnly />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>작성일</label>
                <input className="fi" type="date" value={log.log_date ?? selectedDate} readOnly />
              </div>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>날씨</label>
              <select className="fi" value={log.weather ?? ''} onChange={e => setLog(l => ({ ...l, weather: e.target.value }))}>
                {WEATHER_OPTIONS.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
          </div>

          <div className="card">
            <div className="card-t">오늘 작업</div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>주요 공종</label>
              <select className="fi" value={log.work_type ?? ''} onChange={e => setLog(l => ({ ...l, work_type: e.target.value }))}>
                {WORK_TYPES.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>진행률 (%)</label>
              <input className="fi" type="number" min={0} max={100} value={log.progress ?? 0}
                onChange={e => setLog(l => ({ ...l, progress: Number(e.target.value) }))} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>작업 내용 및 특이사항</label>
              <textarea className="fta" placeholder="오늘 작업 내용, 특이사항, 안전 이슈 등을 입력하세요..."
                value={log.note ?? ''} onChange={e => setLog(l => ({ ...l, note: e.target.value }))} />
            </div>
          </div>

          <div className="card">
            <div className="card-t">출역 현황 <span style={{ fontSize: '10px', color: 'var(--teal)', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>출역탭 자동반영</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {[
                { label: '내국인', val: krWorkers || log.kr_workers || 0 },
                { label: '외국인', val: foWorkers || log.fo_workers || 0 },
                { label: '합계', val: (krWorkers || log.kr_workers || 0) + (foWorkers || log.fo_workers || 0) },
              ].map((item, i) => (
                <div key={i}>
                  <input className="fi" value={item.val} readOnly
                    style={{ textAlign: 'center', fontFamily: 'Bebas Neue, sans-serif', fontSize: '24px', padding: '7px', color: i === 2 ? 'var(--br)' : undefined }} />
                  <div style={{ fontSize: '10px', color: 'var(--tx3)', textAlign: 'center', marginTop: '2px' }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          <button className="btn btn-main" onClick={saveLog} disabled={saving} style={{ marginBottom: '8px' }}>
            {saving ? '저장 중...' : '💾 일보 저장'}
          </button>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
            <button className="btn btn-ghost" onClick={() => showToast('📄 PDF 생성 기능 준비 중', 'warn')}>📄 PDF 생성</button>
            <button className="btn btn-ghost" onClick={() => showToast('📧 이메일 발송 기능 준비 중', 'warn')}>📧 발주처 발송</button>
          </div>
        </>
      )}

      {/* 자재 */}
      {tab === 'material' && (
        <div className="card">
          <div className="card-t">
            자재 투입현황
            <span onClick={() => setShowMatForm(o => !o)}
              style={{ fontSize: '11px', color: 'var(--teal)', fontWeight: 600, textTransform: 'none', letterSpacing: 0, cursor: 'pointer', padding: '2px 8px', borderRadius: '6px', background: 'var(--cream2)' }}>
              + 행 추가
            </span>
          </div>
          {showMatForm && (
            <div style={{ background: 'var(--cream2)', border: '1.5px solid var(--cream3)', borderRadius: '10px', padding: '12px', marginBottom: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>자재명</label>
                  <input className="fi" placeholder="레미콘" value={newMat.name} onChange={e => setNewMat(m => ({ ...m, name: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>규격</label>
                  <input className="fi" placeholder="25-21-15" value={newMat.spec} onChange={e => setNewMat(m => ({ ...m, spec: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>수량</label>
                  <input className="fi" type="number" placeholder="10" value={newMat.qty || ''} onChange={e => setNewMat(m => ({ ...m, qty: Number(e.target.value) }))} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>단위</label>
                  <input className="fi" placeholder="m³" value={newMat.unit} onChange={e => setNewMat(m => ({ ...m, unit: e.target.value }))} />
                </div>
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>단가 (원)</label>
                <input className="fi" type="number" placeholder="150000" value={newMat.unit_price || ''} onChange={e => setNewMat(m => ({ ...m, unit_price: Number(e.target.value) }))} />
              </div>
              <button className="btn btn-gold" onClick={addMat}>추가</button>
            </div>
          )}
          {materials.length === 0 ? (
            <div className="empty-state"><div className="ei">🧱</div>자재를 추가해주세요</div>
          ) : (
            <table className="tbl">
              <thead><tr><th>자재명</th><th>규격</th><th>수량</th><th>단가</th><th>금액</th><th></th></tr></thead>
              <tbody>
                {materials.map((m, i) => (
                  <tr key={i}>
                    <td>{m.name}</td>
                    <td>{m.spec}</td>
                    <td>{m.qty}{m.unit}</td>
                    <td>₩{(m.unit_price ?? 0).toLocaleString()}</td>
                    <td style={{ fontWeight: 700, color: 'var(--gd)' }}>₩{((m.qty ?? 0) * (m.unit_price ?? 0)).toLocaleString()}</td>
                    <td><button onClick={() => setMaterials(prev => prev.filter((_, j) => j !== i))}
                      style={{ background: 'none', border: '1px solid rgba(230,59,46,.3)', borderRadius: '5px', padding: '3px 7px', fontSize: '11px', cursor: 'pointer', color: 'var(--red)' }}>삭제</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, padding: '8px 0 0', borderTop: '1px solid var(--g1)', marginTop: '8px' }}>
            <span>자재비 합계</span>
            <span style={{ color: 'var(--gd)', fontFamily: 'monospace' }}>₩{totalMat.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* 장비 */}
      {tab === 'equip' && (
        <div className="card">
          <div className="card-t">
            장비 투입현황
            <span onClick={() => setShowEqForm(o => !o)}
              style={{ fontSize: '11px', color: 'var(--teal)', fontWeight: 600, textTransform: 'none', letterSpacing: 0, cursor: 'pointer', padding: '2px 8px', borderRadius: '6px', background: 'var(--cream2)' }}>
              + 행 추가
            </span>
          </div>
          {showEqForm && (
            <div style={{ background: 'var(--cream2)', border: '1.5px solid var(--cream3)', borderRadius: '10px', padding: '12px', marginBottom: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>장비명</label>
                  <input className="fi" placeholder="타워크레인" value={newEq.name} onChange={e => setNewEq(m => ({ ...m, name: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>규격</label>
                  <input className="fi" placeholder="3T" value={newEq.spec} onChange={e => setNewEq(m => ({ ...m, spec: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>대수</label>
                  <input className="fi" type="number" value={newEq.qty} onChange={e => setNewEq(m => ({ ...m, qty: Number(e.target.value) }))} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>작업시간(h)</label>
                  <input className="fi" type="number" value={newEq.hours} onChange={e => setNewEq(m => ({ ...m, hours: Number(e.target.value) }))} />
                </div>
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>단가 (원/일)</label>
                <input className="fi" type="number" placeholder="300000" value={newEq.unit_price || ''} onChange={e => setNewEq(m => ({ ...m, unit_price: Number(e.target.value) }))} />
              </div>
              <button className="btn btn-gold" onClick={addEq}>추가</button>
            </div>
          )}
          {equips.length === 0 ? (
            <div className="empty-state"><div className="ei">🏗️</div>장비를 추가해주세요</div>
          ) : (
            <table className="tbl">
              <thead><tr><th>장비명</th><th>규격</th><th>대수</th><th>시간</th><th>금액</th><th></th></tr></thead>
              <tbody>
                {equips.map((e, i) => (
                  <tr key={i}>
                    <td>{e.name}</td>
                    <td>{e.spec}</td>
                    <td>{e.qty}대</td>
                    <td>{e.hours}h</td>
                    <td style={{ fontWeight: 700, color: 'var(--gd)' }}>₩{((e.qty ?? 0) * (e.hours ?? 0) * (e.unit_price ?? 0)).toLocaleString()}</td>
                    <td><button onClick={() => setEquips(prev => prev.filter((_, j) => j !== i))}
                      style={{ background: 'none', border: '1px solid rgba(230,59,46,.3)', borderRadius: '5px', padding: '3px 7px', fontSize: '11px', cursor: 'pointer', color: 'var(--red)' }}>삭제</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, padding: '8px 0 0', borderTop: '1px solid var(--g1)', marginTop: '8px' }}>
            <span>장비비 합계</span>
            <span style={{ color: 'var(--gd)', fontFamily: 'monospace' }}>₩{totalEq.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* 현장사진 */}
      {tab === 'photo' && (
        <div className="card">
          <div className="card-t">현장 사진 관리</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '10px' }}>
            {photos.map((url, i) => (
              <div key={i} style={{ aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', background: 'var(--g1)', position: 'relative' }}>
                <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                  style={{ position: 'absolute', top: '3px', right: '3px', background: 'rgba(0,0,0,.6)', color: '#fff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>
            ))}
            <label style={{ aspectRatio: '1', borderRadius: '8px', background: 'var(--g1)', border: '1.5px solid var(--cream3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', color: 'var(--g3)' }}>
              ＋
              <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={uploadPhoto} />
            </label>
          </div>
          <button className="btn btn-ghost btn-sm" disabled={uploading} onClick={() => {}}>
            {uploading ? '업로드 중...' : '📷 사진 추가'}
          </button>
        </div>
      )}

      <Toast message={toast} type={toastType} />
    </div>
  )
}
