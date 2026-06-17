import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { format, differenceInDays, parseISO, startOfMonth } from 'date-fns'
import { ko } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

export default async function SharePage({ params }: { params: { token: string } }) {
  const supabase = createServiceClient()

  // Find site by share_token
  const { data: site } = await supabase
    .from('sites')
    .select('*')
    .eq('share_token', params.token)
    .single()

  if (!site) notFound()

  // Fetch data for the shared view
  const [
    { data: recentLogs },
    { data: ganttItems },
    { data: photos },
    { data: safetyIssues },
    { data: workers },
  ] = await Promise.all([
    supabase.from('daily_logs').select('*').eq('site_id', site.id).order('log_date', { ascending: false }).limit(7),
    supabase.from('gantt_items').select('*').eq('site_id', site.id).order('start_date'),
    supabase.from('site_photos').select('*').eq('site_id', site.id).order('taken_at', { ascending: false }).limit(12),
    supabase.from('safety_issues').select('*').eq('site_id', site.id).eq('status', '처리중').limit(5),
    supabase.from('attendances').select('worker_id').eq('site_id', site.id).gte('att_date', format(startOfMonth(new Date()), 'yyyy-MM-dd')),
  ])

  const today = format(new Date(), 'yyyy-MM-dd')
  const totalDays = site.start_date && site.end_date
    ? differenceInDays(parseISO(site.end_date), parseISO(site.start_date)) + 1
    : 0
  const elapsedDays = site.start_date
    ? Math.max(0, differenceInDays(parseISO(today), parseISO(site.start_date)) + 1)
    : 0
  const siteProgress = totalDays > 0 ? Math.min(100, Math.round((elapsedDays / totalDays) * 100)) : 0

  const avgGanttProgress = ganttItems && ganttItems.length > 0
    ? Math.round(ganttItems.reduce((sum, g) => sum + (g.progress ?? 0), 0) / ganttItems.length)
    : 0

  const monthlyWorkers = new Set(workers?.map(w => w.worker_id) ?? []).size

  return (
    <div style={{ minHeight: '100vh', background: '#FFF8EE', fontFamily: 'var(--sans, "Noto Sans KR", sans-serif)' }}>
      {/* Header */}
      <header style={{ background: '#2C1810', padding: '16px 20px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#F5C842', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', flexShrink: 0 }}>🏗️</div>
          <div>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '20px', color: '#FFF8EE', letterSpacing: '.5px', lineHeight: 1 }}>
              제이<span style={{ color: '#F5C842' }}>건설</span>
            </div>
            <div style={{ fontSize: '9px', color: 'rgba(255,248,238,.5)', letterSpacing: '.3px' }}>발주처 현장 현황 공유</div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: '10px', color: 'rgba(255,248,238,.6)' }}>
            {format(new Date(), 'yyyy.MM.dd HH:mm', { locale: ko })} 기준
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '640px', margin: '0 auto', padding: '16px 14px 40px' }}>
        {/* Site Info Card */}
        <div style={{ background: '#fff', borderRadius: '16px', border: '1.5px solid rgba(44,24,16,.1)', padding: '18px', marginBottom: '12px', boxShadow: '0 2px 12px rgba(44,24,16,.07)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#2C1810', marginBottom: '3px' }}>{site.name}</div>
              {site.address && <div style={{ fontSize: '12px', color: '#6B7280' }}>📍 {site.address}</div>}
              {site.client && <div style={{ fontSize: '12px', color: '#6B7280' }}>🏢 발주: {site.client}</div>}
            </div>
            <span style={{ background: site.status === 'active' ? '#DCFCE7' : '#FEF9C3', color: site.status === 'active' ? '#16A34A' : '#CA8A04', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px', flexShrink: 0 }}>
              {site.status === 'active' ? '진행중' : site.status === 'completed' ? '완료' : '일시중지'}
            </span>
          </div>

          {/* Progress */}
          <div style={{ marginBottom: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280' }}>공사 기간 진행률</span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#0D9488' }}>{siteProgress}%</span>
            </div>
            <div style={{ height: '8px', background: '#F3F4F6', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${siteProgress}%`, background: 'linear-gradient(90deg, #0D9488, #14B8A6)', borderRadius: '4px', transition: 'width .6s ease' }} />
            </div>
            {site.start_date && site.end_date && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '10px', color: '#9CA3AF' }}>
                <span>{site.start_date}</span>
                <span>D-{Math.max(0, differenceInDays(parseISO(site.end_date), parseISO(today)))} 남음</span>
                <span>{site.end_date}</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
          {[
            { icon: '👷', label: '이번달 투입 인원', value: `${monthlyWorkers}명`, color: '#1D4ED8' },
            { icon: '📋', label: '공정 평균 진행률', value: `${avgGanttProgress}%`, color: '#0D9488' },
            { icon: '🚨', label: '처리중 안전이슈', value: `${(safetyIssues ?? []).length}건`, color: (safetyIssues ?? []).length > 0 ? '#DC2626' : '#16A34A' },
            { icon: '💰', label: '계약금액', value: site.contract_amount ? `${(site.contract_amount / 10000).toLocaleString()}만원` : '-', color: '#7C3AED' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: '14px', border: '1.5px solid rgba(44,24,16,.08)', padding: '14px', boxShadow: '0 2px 8px rgba(44,24,16,.05)' }}>
              <div style={{ fontSize: '20px', marginBottom: '6px' }}>{s.icon}</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: s.color, marginBottom: '2px' }}>{s.value}</div>
              <div style={{ fontSize: '10px', color: '#9CA3AF' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Gantt Progress */}
        {ganttItems && ganttItems.length > 0 && (
          <div style={{ background: '#fff', borderRadius: '16px', border: '1.5px solid rgba(44,24,16,.08)', padding: '16px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(44,24,16,.05)' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#2C1810', marginBottom: '12px' }}>📅 공정 현황</div>
            {ganttItems.map((g, i) => {
              const colors = ['#0D9488', '#1D4ED8', '#7C3AED', '#D97706', '#DC2626']
              const color = colors[i % colors.length]
              const isOverdue = g.end_date && g.end_date < today && g.progress < 100
              return (
                <div key={g.id} style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: isOverdue ? '#DC2626' : '#374151' }}>
                      {isOverdue ? '⚠️ ' : ''}{g.name}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: isOverdue ? '#DC2626' : color }}>{g.progress}%</span>
                  </div>
                  <div style={{ height: '7px', background: '#F3F4F6', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${g.progress}%`, background: isOverdue ? '#DC2626' : color, borderRadius: '4px' }} />
                  </div>
                  {g.end_date && (
                    <div style={{ fontSize: '9px', color: '#9CA3AF', marginTop: '2px' }}>
                      {g.start_date} ~ {g.end_date}
                      {g.person ? ` · ${g.person}` : ''}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Recent Daily Logs */}
        {recentLogs && recentLogs.length > 0 && (
          <div style={{ background: '#fff', borderRadius: '16px', border: '1.5px solid rgba(44,24,16,.08)', padding: '16px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(44,24,16,.05)' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#2C1810', marginBottom: '12px' }}>📋 최근 공사일보</div>
            {recentLogs.map(log => (
              <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid #F9FAFB' }}>
                <div style={{ fontSize: '22px' }}>
                  {log.weather === '맑음' ? '☀️' : log.weather === '흐림' ? '⛅' : log.weather === '비' ? '🌧️' : log.weather === '눈' ? '❄️' : '🌤️'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>
                    {format(parseISO(log.log_date), 'M월 d일 (EEE)', { locale: ko })}
                  </div>
                  <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                    한국인 {log.kr_workers}명 · 외국인 {log.fo_workers}명 · 진행률 {log.progress}%
                  </div>
                  {log.note && <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>{log.note}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#0D9488' }}>{log.kr_workers + log.fo_workers}</div>
                  <div style={{ fontSize: '9px', color: '#9CA3AF' }}>명</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Site Photos */}
        {photos && photos.length > 0 && (
          <div style={{ background: '#fff', borderRadius: '16px', border: '1.5px solid rgba(44,24,16,.08)', padding: '16px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(44,24,16,.05)' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#2C1810', marginBottom: '12px' }}>📷 현장 사진</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              {photos.map(p => (
                <div key={p.id} style={{ aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', background: '#F3F4F6' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.photo_url} alt={p.work_type ?? '현장사진'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: '11px', color: '#9CA3AF', paddingTop: '10px' }}>
          이 페이지는 발주처 전용 읽기 전용 공유 링크입니다<br />
          Powered by <strong style={{ color: '#2C1810' }}>제이건설 SaaS</strong>
        </div>
      </main>
    </div>
  )
}
