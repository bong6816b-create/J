'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/components/MainLayoutClient'
import { createClient } from '@/lib/supabase/client'
import type { GanttItem } from '@/types'
import Toast from '@/components/Toast'
import { differenceInDays, parseISO, format, addDays } from 'date-fns'
import { ko } from 'date-fns/locale'

const BAR_COLORS = [
  '#0D9488', '#2E7D52', '#1D4ED8', '#7B4A2D', '#D4A820',
  '#E63B2E', '#8B5CF6', '#EC4899', '#F59E0B', '#14B8A6',
]

export default function GanttPage() {
  const { selectedSite } = useApp()
  const supabase = createClient()
  const [items, setItems] = useState<GanttItem[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', start_date: '', end_date: '', progress: 0, person: '' })
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'ok' | 'warn' | ''>('')

  useEffect(() => { if (selectedSite) loadItems() }, [selectedSite])

  async function loadItems() {
    if (!selectedSite) return
    const { data } = await supabase.from('gantt_items').select('*').eq('site_id', selectedSite.id).order('start_date')
    setItems(data ?? [])
  }

  async function addItem() {
    if (!selectedSite || !form.name || !form.start_date || !form.end_date) {
      showToast('공정명, 시작일, 종료일을 입력하세요', 'warn'); return
    }
    const { data } = await supabase.from('gantt_items').insert({ ...form, site_id: selectedSite.id }).select().single()
    if (data) { setItems(prev => [...prev, data].sort((a, b) => (a.start_date ?? '').localeCompare(b.start_date ?? ''))); setShowForm(false); showToast('✅ 공정 추가 완료', 'ok') }
  }

  async function updateProgress(id: string, progress: number) {
    await supabase.from('gantt_items').update({ progress }).eq('id', id)
    setItems(prev => prev.map(item => item.id === id ? { ...item, progress } : item))
  }

  async function deleteItem(id: string) {
    await supabase.from('gantt_items').delete().eq('id', id)
    setItems(prev => prev.filter(item => item.id !== id))
    showToast('삭제됨')
  }

  function showToast(msg: string, type: 'ok' | 'warn' | '' = '') {
    setToast(msg); setToastType(type); setTimeout(() => setToast(''), 2500)
  }

  // Calculate Gantt chart dimensions
  const allDates = items.flatMap(i => [i.start_date, i.end_date]).filter(Boolean) as string[]
  const chartStart = allDates.length > 0 ? allDates.reduce((a, b) => a < b ? a : b) : format(new Date(), 'yyyy-MM-dd')
  const chartEnd = allDates.length > 0 ? allDates.reduce((a, b) => a > b ? a : b) : format(addDays(new Date(), 30), 'yyyy-MM-dd')
  const totalDays = Math.max(differenceInDays(parseISO(chartEnd), parseISO(chartStart)) + 1, 30)
  const today = format(new Date(), 'yyyy-MM-dd')
  const todayOffset = differenceInDays(parseISO(today), parseISO(chartStart))

  // Generate week labels
  const weekLabels: { label: string; offset: number }[] = []
  for (let d = 0; d < totalDays; d += 7) {
    const date = addDays(parseISO(chartStart), d)
    weekLabels.push({ label: format(date, 'M/d', { locale: ko }), offset: d })
  }

  const ROW_H = 36
  const LABEL_W = 90
  const CHART_W = Math.max(totalDays * 12, 300)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
        <span style={{ fontSize: '14px', fontWeight: 700 }}>공정표</span>
        <span className="tag tg">간트차트</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ fontSize: '12px', color: 'var(--tx3)' }}>
          {items.length}개 공정 · {chartStart} ~ {chartEnd}
        </div>
        <button className="btn btn-gold btn-sm" onClick={() => setShowForm(o => !o)}>+ 공정 추가</button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '10px' }}>
          <div className="card-t">공정 추가</div>
          <div style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>공정명</label>
            <input className="fi" placeholder="기초 콘크리트 타설" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>시작일</label>
              <input className="fi" type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>종료일</label>
              <input className="fi" type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>진행률 (%)</label>
              <input className="fi" type="number" min={0} max={100} value={form.progress} onChange={e => setForm(f => ({ ...f, progress: Number(e.target.value) }))} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>담당자</label>
              <input className="fi" placeholder="홍길동" value={form.person} onChange={e => setForm(f => ({ ...f, person: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button className="btn btn-gold" onClick={addItem}>추가</button>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>취소</button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="empty-state" style={{ paddingTop: '60px' }}>
          <div className="ei">📅</div>
          <div style={{ fontWeight: 700, marginBottom: '8px' }}>등록된 공정이 없습니다</div>
          <button className="btn btn-gold btn-sm" onClick={() => setShowForm(true)}>+ 첫 공정 추가</button>
        </div>
      ) : (
        <div className="card" style={{ padding: '10px', overflowX: 'auto' }}>
          <div style={{ minWidth: `${LABEL_W + CHART_W}px` }}>
            {/* Header */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--cream3)', paddingBottom: '4px', marginBottom: '4px' }}>
              <div style={{ width: `${LABEL_W}px`, flexShrink: 0, fontSize: '10px', fontWeight: 700, color: 'var(--tx3)' }}>공정명</div>
              <div style={{ flex: 1, position: 'relative', height: '16px' }}>
                {weekLabels.map((w, i) => (
                  <div key={i} style={{ position: 'absolute', left: `${(w.offset / totalDays) * 100}%`, fontSize: '9px', color: 'var(--g3)', whiteSpace: 'nowrap' }}>{w.label}</div>
                ))}
              </div>
            </div>

            {/* Rows */}
            {items.map((item, idx) => {
              if (!item.start_date || !item.end_date) return null
              const startOffset = Math.max(differenceInDays(parseISO(item.start_date), parseISO(chartStart)), 0)
              const duration = Math.max(differenceInDays(parseISO(item.end_date), parseISO(item.start_date)) + 1, 1)
              const leftPct = (startOffset / totalDays) * 100
              const widthPct = (duration / totalDays) * 100
              const color = BAR_COLORS[idx % BAR_COLORS.length]
              const isOverdue = item.end_date < today && item.progress < 100

              return (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', height: `${ROW_H}px`, borderBottom: '1px solid rgba(44,24,16,.04)' }}>
                  <div style={{ width: `${LABEL_W}px`, flexShrink: 0, paddingRight: '6px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                    <div style={{ fontSize: '9px', color: 'var(--tx3)' }}>{item.progress}% {item.person ? `· ${item.person}` : ''}</div>
                  </div>
                  <div style={{ flex: 1, position: 'relative', height: '22px' }}>
                    {/* Today line */}
                    {todayOffset >= 0 && todayOffset <= totalDays && (
                      <div style={{ position: 'absolute', left: `${(todayOffset / totalDays) * 100}%`, top: 0, bottom: 0, width: '1.5px', background: 'var(--red)', zIndex: 2 }} />
                    )}
                    {/* Bar background */}
                    <div style={{ position: 'absolute', left: `${leftPct}%`, width: `${widthPct}%`, height: '18px', top: '2px', borderRadius: '4px', background: isOverdue ? 'rgba(230,59,46,.2)' : `${color}22`, border: `1.5px solid ${isOverdue ? 'var(--red)' : color}`, overflow: 'hidden' }}>
                      {/* Progress fill */}
                      <div style={{ height: '100%', width: `${item.progress}%`, background: isOverdue ? 'var(--red)' : color, opacity: 0.7, borderRadius: '3px' }} />
                    </div>
                    {/* Duration label */}
                    <div style={{ position: 'absolute', left: `${leftPct + widthPct / 2}%`, top: '2px', transform: 'translateX(-50%)', fontSize: '9px', fontWeight: 700, color: '#fff', lineHeight: '18px', zIndex: 3, whiteSpace: 'nowrap', mixBlendMode: 'difference' }}>
                      {duration}일
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--g1)', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--tx3)' }}>
              <div style={{ width: '14px', height: '2px', background: 'var(--red)' }} />오늘
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--tx3)' }}>
              <div style={{ width: '14px', height: '10px', background: 'rgba(230,59,46,.15)', border: '1.5px solid var(--red)', borderRadius: '2px' }} />지연
            </div>
          </div>
        </div>
      )}

      {/* Progress update for each item */}
      {items.length > 0 && (
        <div className="card" style={{ marginTop: '10px' }}>
          <div className="card-t">진행률 업데이트</div>
          {items.map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', borderBottom: '1px solid var(--g1)' }}>
              <div style={{ flex: 1, fontSize: '12px', fontWeight: 600 }}>{item.name}</div>
              <input type="range" min={0} max={100} value={item.progress}
                onChange={e => updateProgress(item.id, Number(e.target.value))}
                style={{ width: '80px' }} />
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--teal)', minWidth: '30px' }}>{item.progress}%</span>
              <button onClick={() => deleteItem(item.id)}
                style={{ background: 'none', border: '1px solid rgba(230,59,46,.3)', borderRadius: '5px', padding: '2px 6px', fontSize: '10px', cursor: 'pointer', color: 'var(--red)' }}>삭제</button>
            </div>
          ))}
        </div>
      )}

      <Toast message={toast} type={toastType} />
    </div>
  )
}
