'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/components/MainLayoutClient'
import { createClient } from '@/lib/supabase/client'
import { RISK_DB } from '@/lib/utils/constants'
import { format, subDays } from 'date-fns'
import { ko } from 'date-fns/locale'

interface Stats {
  todayWorkers: number
  activeSites: number
  monthlyCost: number
  openIssues: number
}

interface ChartPoint {
  date: string
  label: string
  workers: number
  cost: number
}

export default function DashboardPage() {
  const { selectedSite, selectedDate, sites } = useApp()
  const supabase = createClient()
  const [stats, setStats] = useState<Stats>({ todayWorkers: 0, activeSites: sites.length, monthlyCost: 0, openIssues: 0 })
  const [chart, setChart] = useState<ChartPoint[]>([])
  const [riskKey, setRiskKey] = useState('')
  const [progress, setProgress] = useState<{ work_type: string; progress: number } | null>(null)

  useEffect(() => {
    if (!selectedSite) return
    loadStats()
    loadChart()
    loadProgress()
  }, [selectedSite, selectedDate])

  async function loadStats() {
    if (!selectedSite) return

    // Today attendance
    const { count: attCount } = await supabase
      .from('attendances')
      .select('*', { count: 'exact', head: true })
      .eq('site_id', selectedSite.id)
      .eq('att_date', selectedDate)

    // Monthly cost
    const month = selectedDate.slice(0, 7)
    const { data: logs } = await supabase
      .from('daily_logs')
      .select('kr_workers, fo_workers')
      .eq('site_id', selectedSite.id)
      .like('log_date', `${month}%`)

    const monthlyCost = (logs ?? []).reduce((sum, l) => sum + (l.kr_workers + l.fo_workers) * 180000, 0)

    // Open issues
    const { count: issueCount } = await supabase
      .from('safety_issues')
      .select('*', { count: 'exact', head: true })
      .eq('site_id', selectedSite.id)
      .neq('status', '완료')

    setStats({
      todayWorkers: attCount ?? 0,
      activeSites: sites.length,
      monthlyCost,
      openIssues: issueCount ?? 0,
    })
  }

  async function loadChart() {
    if (!selectedSite) return
    const points: ChartPoint[] = []
    for (let i = 6; i >= 0; i--) {
      const d = format(subDays(new Date(selectedDate), i), 'yyyy-MM-dd')
      const label = format(subDays(new Date(selectedDate), i), 'M/d', { locale: ko })
      const { data: log } = await supabase
        .from('daily_logs')
        .select('kr_workers, fo_workers')
        .eq('site_id', selectedSite.id)
        .eq('log_date', d)
        .single()
      const workers = (log?.kr_workers ?? 0) + (log?.fo_workers ?? 0)
      points.push({ date: d, label, workers, cost: workers * 180000 })
    }
    setChart(points)
  }

  async function loadProgress() {
    if (!selectedSite) return
    const { data } = await supabase
      .from('daily_logs')
      .select('work_type, progress')
      .eq('site_id', selectedSite.id)
      .eq('log_date', selectedDate)
      .single()
    setProgress(data)
  }

  const riskData = riskKey ? RISK_DB[riskKey] : null
  const maxWorkers = Math.max(...chart.map(c => c.workers), 1)
  const maxCost = Math.max(...chart.map(c => c.cost), 1)

  const fmtMoney = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : `${n}`

  return (
    <div>
      {/* Weather Hero */}
      <div style={{ background: 'var(--br)', borderRadius: 'var(--r)', padding: '14px', marginBottom: '10px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div style={{ fontSize: '36px', flexShrink: 0 }}>🌤️</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '28px', color: 'var(--gold)', lineHeight: 1 }}>
            {selectedDate ? format(new Date(selectedDate), 'M월 d일 (EEE)', { locale: ko }) : '--'}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,248,238,.7)', marginTop: '2px' }}>
            {selectedSite?.name ?? '현장을 선택하세요'}
          </div>
          <div style={{ fontSize: '10px', color: 'rgba(255,248,238,.5)', marginTop: '1px' }}>
            {selectedSite?.address ?? '주소 미입력'}
          </div>
        </div>
      </div>

      {/* AI Risk */}
      <div style={{ background: 'var(--cream2)', border: '1.5px solid var(--cream3)', borderRadius: 'var(--r)', padding: '13px', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ background: 'var(--br)', color: 'var(--gold)', fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px' }}>🤖 AI 위험 예보</div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: riskData ? riskData.c : 'var(--g3)' }}>
            {riskData ? `위험도: ${riskData.lv}` : '공정을 선택하세요'}
          </div>
        </div>
        {riskData ? riskData.items.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: '7px', fontSize: '11px', color: 'var(--tx2)', lineHeight: 1.5, marginBottom: '5px', alignItems: 'flex-start' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0, marginTop: '4px', background: item.c }} />
            {item.t}
          </div>
        )) : (
          <div style={{ display: 'flex', gap: '7px', fontSize: '11px', color: 'var(--tx2)', lineHeight: 1.5, alignItems: 'flex-start' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0, marginTop: '4px', background: 'var(--g2)' }} />
            오늘 공정을 선택하면 실제 위험 요소를 분석합니다.
          </div>
        )}
        <select className="fi" value={riskKey} onChange={e => setRiskKey(e.target.value)}
          style={{ marginTop: '8px', fontSize: '12px' }}>
          <option value="">-- 오늘 주요 공정 선택 --</option>
          <option value="철근">철근 배근 작업</option>
          <option value="거푸집">거푸집 설치/해체</option>
          <option value="콘크리트">콘크리트 타설</option>
          <option value="방수">방수 공사</option>
          <option value="미장">미장/도장 공사</option>
          <option value="전기">전기 배선 공사</option>
          <option value="굴착">굴착/토공 작업</option>
          <option value="고소">고소 작업 (비계)</option>
          <option value="해체">구조물 해체</option>
        </select>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
        {[
          { bar: 'var(--cara)', icon: '👷', bg: '#FFF2DC', val: stats.todayWorkers, lbl: '오늘 출역', sub: '명', valColor: 'var(--br)' },
          { bar: 'var(--teal)', icon: '🏗️', bg: '#CCFBF1', val: stats.activeSites, lbl: '진행 현장', sub: '개', valColor: 'var(--teal)' },
          { bar: 'var(--gold)', icon: '💰', bg: '#FEF9C3', val: fmtMoney(stats.monthlyCost), lbl: '월 누적 비용', sub: '원', valColor: 'var(--gd)' },
          { bar: 'var(--red)', icon: '⚠️', bg: '#FFE4E1', val: stats.openIssues, lbl: '안전/특이 사항', sub: stats.openIssues === 0 ? '양호' : '건', valColor: stats.openIssues === 0 ? 'var(--grn)' : 'var(--red)' },
        ].map((d, i) => (
          <div key={i} style={{ background: 'var(--white)', borderRadius: 'var(--r)', padding: '13px', boxShadow: 'var(--sh)', border: '1px solid rgba(44,24,16,.05)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', borderRadius: 'var(--r) var(--r) 0 0', background: d.bar }} />
            <div style={{ width: '28px', height: '28px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', marginBottom: '6px', marginTop: '2px', background: d.bg }}>{d.icon}</div>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: typeof d.val === 'string' ? '22px' : '30px', lineHeight: 1, marginBottom: '2px', color: d.valColor }}>{d.val}</div>
            <div style={{ fontSize: '10px', color: 'var(--g3)' }}>{d.lbl}</div>
            <div style={{ fontSize: '10px', fontWeight: 600, marginTop: '3px', color: 'var(--tx3)' }}>{d.sub}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      {chart.length > 0 && (
        <div style={{ background: 'var(--white)', borderRadius: 'var(--r)', padding: '14px', boxShadow: 'var(--sh)', marginBottom: '10px', border: '1px solid rgba(44,24,16,.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--tx)' }}>근로자 투입 및 노무비 현황</div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--tx3)' }}>
                <div style={{ width: '10px', height: '3px', borderRadius: '2px', background: 'var(--teal)' }} />인원
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--tx3)' }}>
                <div style={{ width: '10px', height: '3px', borderRadius: '2px', background: 'var(--grn)' }} />노무비
              </div>
            </div>
          </div>
          {/* Simple bar chart */}
          <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: '60px', marginBottom: '4px' }}>
            {chart.map((p, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ width: '100%', background: 'var(--teal)', borderRadius: '3px 3px 0 0', height: `${(p.workers / maxWorkers) * 50}px`, minHeight: p.workers > 0 ? '4px' : '0', opacity: 0.8 }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${chart.length}, 1fr)` }}>
            {chart.map((p, i) => (
              <div key={i} style={{ fontSize: '9px', color: 'var(--g3)', textAlign: 'center' }}>{p.label}</div>
            ))}
          </div>
        </div>
      )}

      {/* Progress */}
      <div className="card">
        <div className="card-t">오늘 공정 진행률</div>
        {progress ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px', fontWeight: 500 }}>
              <span>{progress.work_type}</span>
              <span>{progress.progress}%</span>
            </div>
            <div className="prog-track">
              <div className="prog-fill" style={{ width: `${progress.progress}%`, background: 'linear-gradient(90deg, var(--teal), var(--teal2))' }} />
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <div className="ei">📊</div>
            일보 탭에서 공정을 입력하세요
          </div>
        )}
      </div>

      {/* Savings Banner */}
      {!selectedSite && (
        <div style={{ background: 'linear-gradient(135deg, var(--br), var(--cara))', borderRadius: 'var(--r)', padding: '14px 16px', marginBottom: '10px', position: 'relative', overflow: 'hidden', boxShadow: '0 4px 18px rgba(44,24,16,.22)' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,248,238,.6)', marginBottom: '3px' }}>현장을 먼저 등록하세요</div>
          <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '22px', color: 'var(--gold)', letterSpacing: '.5px', lineHeight: 1.1 }}>현장 없음</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,248,238,.5)', marginTop: '3px' }}>사이드메뉴 → 현장 관리에서 추가하세요</div>
        </div>
      )}
    </div>
  )
}
