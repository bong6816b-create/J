'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/components/MainLayoutClient'
import { createClient } from '@/lib/supabase/client'
import { format, endOfMonth, parseISO, eachDayOfInterval } from 'date-fns'
import { ko } from 'date-fns/locale'
import { calcInsurance } from '@/lib/utils/insurance'

interface MonthStat {
  totalWorkers: number
  krWorkers: number
  foWorkers: number
  totalWage: number
  totalDeduction: number
  netWage: number
  workDays: number
  safetyIssues: number
  accidents: number
  workStops: number
  materialCost: number
  equipCost: number
  ganttAvgProgress: number
  attendanceByDay: Record<string, number>
}

export default function ReportPage() {
  const { selectedSite } = useApp()
  const supabase = createClient()

  const [yearMonth, setYearMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [stat, setStat] = useState<MonthStat | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { if (selectedSite) loadReport() }, [selectedSite, yearMonth])

  async function loadReport() {
    if (!selectedSite) return
    setLoading(true)

    const start = `${yearMonth}-01`
    const end = format(endOfMonth(parseISO(`${yearMonth}-01`)), 'yyyy-MM-dd')

    const [
      { data: logs },
      { data: attendances },
      { data: workers },
      { data: safetyIssues },
      { data: stockRecs },
      { data: ganttItems },
    ] = await Promise.all([
      supabase.from('daily_logs').select('*').eq('site_id', selectedSite.id).gte('log_date', start).lte('log_date', end),
      supabase.from('attendances').select('*, worker:workers(daily_rate)').eq('site_id', selectedSite.id).gte('att_date', start).lte('att_date', end),
      supabase.from('workers').select('id, daily_rate').eq('company_id', selectedSite.company_id ?? ''),
      supabase.from('safety_issues').select('*').eq('site_id', selectedSite.id).gte('created_at', start).lte('created_at', end + 'T23:59:59'),
      supabase.from('stock_records').select('*').eq('site_id', selectedSite.id).gte('record_date', start).lte('record_date', end),
      supabase.from('gantt_items').select('progress').eq('site_id', selectedSite.id),
    ])

    const workerMap = new Map((workers ?? []).map(w => [w.id, w.daily_rate ?? 0]))
    const uniqueWorkers = new Set((attendances ?? []).map(a => a.worker_id))

    let totalWage = 0
    let totalDeduction = 0;
    (attendances ?? []).forEach(a => {
      const rate = (a.worker as any)?.daily_rate ?? workerMap.get(a.worker_id) ?? 0
      const gross = rate * (a.days ?? 1)
      const ins = calcInsurance(gross, 'daily')
      totalWage += ins.gross
      totalDeduction += ins.total
    })

    const attByDay: Record<string, number> = {}
    ;(attendances ?? []).forEach(a => {
      attByDay[a.att_date] = (attByDay[a.att_date] ?? 0) + 1
    })

    // Stock records breakdown
    const matRecs = (stockRecs ?? []).filter(r => !r.name.startsWith('장비점검:') && !r.name.startsWith('안전관리비:') && !r.name.startsWith('하도급:') && r.record_type === 'out')
    const equipRecs = (stockRecs ?? []).filter(r => r.name.startsWith('장비점검:'))
    const materialCost = matRecs.reduce((s, r) => s + (r.unit_price * (r.qty ?? 1)), 0)
    const equipCost = equipRecs.reduce((s, r) => s + (r.unit_price * (r.qty ?? 1)), 0)

    const avgProgress = ganttItems && ganttItems.length > 0
      ? Math.round(ganttItems.reduce((s, g) => s + (g.progress ?? 0), 0) / ganttItems.length)
      : 0

    setStat({
      totalWorkers: uniqueWorkers.size,
      krWorkers: (logs ?? []).reduce((s, l) => s + (l.kr_workers ?? 0), 0),
      foWorkers: (logs ?? []).reduce((s, l) => s + (l.fo_workers ?? 0), 0),
      totalWage,
      totalDeduction,
      netWage: totalWage - totalDeduction,
      workDays: (logs ?? []).length,
      safetyIssues: (safetyIssues ?? []).filter(s => !['사고', '작업중지'].includes(s.issue_type ?? '')).length,
      accidents: (safetyIssues ?? []).filter(s => s.issue_type === '사고').length,
      workStops: (safetyIssues ?? []).filter(s => s.issue_type === '작업중지').length,
      materialCost,
      equipCost,
      ganttAvgProgress: avgProgress,
      attendanceByDay: attByDay,
    })
    setLoading(false)
  }

  function fmt(n: number) { return n.toLocaleString('ko-KR') }

  // Generate month options (last 12 months)
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    return format(d, 'yyyy-MM')
  })

  const daysInMonth = stat ? eachDayOfInterval({
    start: parseISO(`${yearMonth}-01`),
    end: endOfMonth(parseISO(`${yearMonth}-01`)),
  }) : []

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
        <span style={{ fontSize: '14px', fontWeight: 700 }}>월별 결산 리포트</span>
        <span className="tag tg">집계</span>
      </div>

      {/* Month Selector */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', alignItems: 'center' }}>
        <select className="fi" value={yearMonth} onChange={e => setYearMonth(e.target.value)} style={{ flex: 1 }}>
          {monthOptions.map(m => (
            <option key={m} value={m}>
              {format(parseISO(`${m}-01`), 'yyyy년 M월', { locale: ko })}
            </option>
          ))}
        </select>
        <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>🖨️ 인쇄</button>
      </div>

      {!selectedSite ? (
        <div className="empty-state" style={{ paddingTop: '60px' }}>
          <div className="ei">📊</div>
          <div style={{ fontWeight: 700 }}>현장을 선택하세요</div>
        </div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--tx3)', fontSize: '13px' }}>집계 중...</div>
      ) : stat && (
        <>
          {/* Header Info */}
          <div className="card" style={{ marginBottom: '10px', background: 'var(--br)' }}>
            <div style={{ color: 'var(--cream2)', fontSize: '11px', marginBottom: '4px' }}>
              {format(parseISO(`${yearMonth}-01`), 'yyyy년 M월', { locale: ko })} 결산 리포트
            </div>
            <div style={{ color: 'var(--cream)', fontSize: '16px', fontWeight: 800 }}>{selectedSite.name}</div>
            <div style={{ color: 'rgba(255,248,238,.5)', fontSize: '10px', marginTop: '3px' }}>
              {selectedSite.client ? `발주처: ${selectedSite.client}` : ''}
            </div>
          </div>

          {/* 노무비 요약 */}
          <div className="card" style={{ marginBottom: '10px' }}>
            <div className="card-t">💰 노무비 요약</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              {[
                { label: '투입 인원', value: `${stat.totalWorkers}명` },
                { label: '공사 일수', value: `${stat.workDays}일` },
                { label: '연인원 (한국)', value: `${stat.krWorkers}인` },
                { label: '연인원 (외국)', value: `${stat.foWorkers}인` },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--g1)', borderRadius: '10px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--tx3)', marginBottom: '3px' }}>{s.label}</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--br)' }}>{s.value}</div>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid var(--g1)', paddingTop: '10px' }}>
              {[
                { label: '총 지급액 (세전)', value: `₩${fmt(stat.totalWage)}`, highlight: true },
                { label: '4대보험·소득세 공제', value: `-₩${fmt(stat.totalDeduction)}`, red: true },
                { label: '실지급액 (세후)', value: `₩${fmt(stat.netWage)}`, gold: true },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--g1)' }}>
                  <span style={{ fontSize: '12px', color: 'var(--tx2)' }}>{r.label}</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: r.gold ? 'var(--gd)' : r.red ? 'var(--red)' : 'var(--br)' }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 원가 요약 */}
          {(stat.materialCost > 0 || stat.equipCost > 0) && (
            <div className="card" style={{ marginBottom: '10px' }}>
              <div className="card-t">🏗️ 원가 요약</div>
              {[
                { label: '자재비', value: stat.materialCost },
                { label: '장비비', value: stat.equipCost },
                { label: '노무비', value: stat.totalWage },
                { label: '합계', value: stat.materialCost + stat.equipCost + stat.totalWage, bold: true },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--g1)' }}>
                  <span style={{ fontSize: '12px', color: r.bold ? 'var(--br)' : 'var(--tx2)', fontWeight: r.bold ? 700 : 400 }}>{r.label}</span>
                  <span style={{ fontSize: '13px', fontWeight: r.bold ? 800 : 600, color: r.bold ? 'var(--gd)' : 'var(--br)' }}>₩{fmt(r.value)}</span>
                </div>
              ))}
            </div>
          )}

          {/* 안전 요약 */}
          <div className="card" style={{ marginBottom: '10px' }}>
            <div className="card-t">🦺 안전 현황</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {[
                { label: '안전이슈', value: stat.safetyIssues, color: stat.safetyIssues > 0 ? 'var(--red)' : 'var(--grn)' },
                { label: '사고', value: stat.accidents, color: stat.accidents > 0 ? 'var(--red)' : 'var(--grn)' },
                { label: '작업중지', value: stat.workStops, color: stat.workStops > 0 ? '#F59E0B' : 'var(--grn)' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center', background: 'var(--g1)', borderRadius: '10px', padding: '12px 8px' }}>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '10px', color: 'var(--tx3)', marginTop: '2px' }}>{s.label}</div>
                </div>
              ))}
            </div>
            {(stat.accidents > 0 || stat.workStops > 0) && (
              <div style={{ background: '#FFE4E1', borderRadius: '8px', padding: '8px 10px', marginTop: '8px', fontSize: '11px', color: 'var(--red)', fontWeight: 600 }}>
                ⚠️ 이번 달 사고·작업중지 기록이 있습니다. 관련 서류를 보관하세요.
              </div>
            )}
          </div>

          {/* 공정 현황 */}
          <div className="card" style={{ marginBottom: '10px' }}>
            <div className="card-t">📅 공정 진행률</div>
            <div style={{ textAlign: 'center', padding: '10px 0 6px' }}>
              <div style={{ fontSize: '40px', fontFamily: 'Bebas Neue, sans-serif', color: 'var(--teal)', lineHeight: 1 }}>{stat.ganttAvgProgress}%</div>
              <div style={{ fontSize: '11px', color: 'var(--tx3)', marginTop: '4px' }}>전체 공정 평균 진행률</div>
            </div>
            <div style={{ height: '10px', background: 'var(--g1)', borderRadius: '5px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${stat.ganttAvgProgress}%`, background: 'linear-gradient(90deg, var(--teal), #14B8A6)', borderRadius: '5px' }} />
            </div>
          </div>

          {/* 출역 히트맵 */}
          <div className="card" style={{ marginBottom: '10px' }}>
            <div className="card-t">👷 출역 현황 (일별)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
              {['일','월','화','수','목','금','토'].map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: '9px', color: 'var(--g3)', fontWeight: 700, padding: '2px 0' }}>{d}</div>
              ))}
              {/* padding cells for first week */}
              {Array.from({ length: daysInMonth[0]?.getDay() ?? 0 }, (_, i) => (
                <div key={`pad-${i}`} />
              ))}
              {daysInMonth.map(day => {
                const key = format(day, 'yyyy-MM-dd')
                const count = stat.attendanceByDay[key] ?? 0
                const intensity = count === 0 ? 0 : Math.min(1, count / 20)
                return (
                  <div key={key} title={`${format(day, 'M/d')}: ${count}명`}
                    style={{
                      aspectRatio: '1',
                      borderRadius: '4px',
                      background: count === 0 ? 'var(--g1)' : `rgba(13,148,136,${0.2 + intensity * 0.8})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '9px', fontWeight: 700,
                      color: intensity > 0.5 ? '#fff' : count > 0 ? 'var(--teal)' : 'var(--g3)',
                    }}>
                    {format(day, 'd')}
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '10px', color: 'var(--tx3)' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--g1)' }} />없음
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(13,148,136,.3)' }} />1~5명
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(13,148,136,.7)' }} />6~15명
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(13,148,136,1)' }} />16명+
            </div>
          </div>
        </>
      )}
    </div>
  )
}
