'use client'
import { useState, useCallback, createContext, useContext, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Site, Company } from '@/types'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

// ── App Context ──────────────────────────────────────────────
interface AppCtx {
  selectedSite: Site | null
  setSelectedSite: (s: Site | null) => void
  selectedDate: string
  setSelectedDate: (d: string) => void
  sites: Site[]
  company: Company | null
}

export const AppContext = createContext<AppCtx>({
  selectedSite: null,
  setSelectedSite: () => {},
  selectedDate: format(new Date(), 'yyyy-MM-dd'),
  setSelectedDate: () => {},
  sites: [],
  company: null,
})

export function useApp() { return useContext(AppContext) }

// ── Bottom Nav Config ─────────────────────────────────────────
const NAV = [
  { href: '/dashboard', icon: '🏠', label: '홈' },
  { href: '/daily', icon: '📋', label: '일보' },
  { href: '/workers', icon: '👷', label: '출역' },
  { href: '/safety', icon: '🦺', label: '안전' },
  { href: '/cost', icon: '💰', label: '노무비' },
]

const MENU_SECTIONS = [
  {
    label: '현장 관리',
    items: [
      { href: '/dashboard', icon: '🏠', label: '대시보드' },
      { href: '/daily', icon: '📋', label: '공사일보' },
      { href: '/workers', icon: '👷', label: '근로자·출역' },
    ],
  },
  {
    label: '안전 관리',
    items: [
      { href: '/safety', icon: '🦺', label: 'TBM 안전교육' },
      { href: '/risk', icon: '⚠️', label: '위험성 평가서' },
      { href: '/issues', icon: '🚨', label: '안전/하자 이슈' },
    ],
  },
  {
    label: '노무·원가',
    items: [
      { href: '/cost', icon: '💰', label: '노무비 계산' },
      { href: '/payroll', icon: '📊', label: '노무비 집계표' },
      { href: '/invoice', icon: '📄', label: '청구 내역서' },
    ],
  },
  {
    label: '현장 운영',
    items: [
      { href: '/photos', icon: '📷', label: '현장사진' },
      { href: '/equipment', icon: '🏗️', label: '장비 관리' },
      { href: '/materials', icon: '🧱', label: '자재 수불부' },
      { href: '/sites', icon: '📍', label: '현장 관리' },
    ],
  },
]

// ── Calendar Modal ────────────────────────────────────────────
function CalendarModal({ date, onChange, onClose }: {
  date: string
  onChange: (d: string) => void
  onClose: () => void
}) {
  const [view, setView] = useState(() => {
    const d = new Date(date)
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  const today = format(new Date(), 'yyyy-MM-dd')
  const days = ['일', '월', '화', '수', '목', '금', '토']

  function getDates() {
    const first = new Date(view.year, view.month, 1)
    const last = new Date(view.year, view.month + 1, 0)
    const cells: (number | null)[] = Array(first.getDay()).fill(null)
    for (let d = 1; d <= last.getDate(); d++) cells.push(d)
    return cells
  }

  function pick(d: number) {
    const s = `${view.year}-${String(view.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    onChange(s)
    onClose()
  }

  return (
    <div className="modal-bg on" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 90, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(3px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--white)', borderRadius: '22px 22px 0 0', width: '100%', maxWidth: '480px', overflow: 'hidden' }}>
        <div style={{ background: 'var(--teal)', padding: '18px 20px 14px' }}>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,.7)', marginBottom: '2px' }}>{view.year}년</div>
          <div style={{ fontSize: '32px', fontWeight: 900, color: '#fff' }}>
            {format(new Date(date), 'M월 d일 (EEE)', { locale: ko })}
          </div>
        </div>
        <div style={{ padding: '14px 16px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <button onClick={() => setView(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 })}
              style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--tx2)', padding: '4px 10px', borderRadius: '8px' }}>‹</button>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--tx)' }}>{view.year}년 {view.month + 1}월</span>
            <button onClick={() => setView(v => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 })}
              style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--tx2)', padding: '4px 10px', borderRadius: '8px' }}>›</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
            {days.map(d => <div key={d} style={{ textAlign: 'center', fontSize: '10px', fontWeight: 700, color: 'var(--g3)', padding: '5px 0' }}>{d}</div>)}
            {getDates().map((d, i) => {
              if (!d) return <div key={`e-${i}`} />
              const s = `${view.year}-${String(view.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
              const isSel = s === date
              const isToday = s === today
              return (
                <div key={d} onClick={() => pick(d)}
                  style={{
                    textAlign: 'center', fontSize: '13px', cursor: 'pointer', borderRadius: '50%',
                    width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto', transition: 'all .12s',
                    background: isSel ? 'var(--br)' : isToday ? 'var(--teal)' : 'transparent',
                    color: (isSel || isToday) ? '#fff' : 'var(--tx)',
                    fontWeight: (isSel || isToday) ? 700 : 400,
                  }}>
                  {d}
                </div>
              )
            })}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px 20px', borderTop: '1px solid var(--g1)' }}>
          <button onClick={() => { onChange(today); onClose() }}
            style={{ background: 'none', border: 'none', fontSize: '14px', fontWeight: 700, cursor: 'pointer', padding: '8px 12px', borderRadius: '8px', color: 'var(--teal)', fontFamily: 'var(--sans)' }}>오늘</button>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '14px', fontWeight: 700, cursor: 'pointer', padding: '8px 12px', borderRadius: '8px', color: 'var(--tx3)', fontFamily: 'var(--sans)' }}>닫기</button>
        </div>
      </div>
    </div>
  )
}

// ── Main Layout Client ────────────────────────────────────────
interface Props {
  children: React.ReactNode
  user: { email: string; name: string }
  company: Company | null
  sites: Site[]
}

export default function MainLayoutClient({ children, user, company, sites }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const [selectedSite, setSelectedSite] = useState<Site | null>(sites[0] ?? null)
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [menuOpen, setMenuOpen] = useState(false)
  const [sitePickerOpen, setSitePickerOpen] = useState(false)
  const [calOpen, setCalOpen] = useState(false)
  const [siteSearch, setSiteSearch] = useState('')

  const filteredSites = sites.filter(s => s.name.includes(siteSearch))

  const dateLabel = format(new Date(selectedDate), 'M/d (EEE)', { locale: ko })

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <AppContext.Provider value={{ selectedSite, setSelectedSite, selectedDate, setSelectedDate, sites, company }}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        {/* ── HEADER ── */}
        <header style={{ flexShrink: 0, height: '56px', background: 'var(--br)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', zIndex: 60, boxShadow: '0 2px 12px rgba(30,15,7,.3)' }}>
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '9px', textDecoration: 'none' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', boxShadow: '0 2px 8px rgba(245,200,66,.4)' }}>🏗️</div>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '22px', color: 'var(--cream)', letterSpacing: '.5px', lineHeight: 1 }}>
              제이<span style={{ color: 'var(--gold)' }}>건설</span>
            </div>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ background: 'rgba(255,248,238,.1)', border: '1px solid rgba(255,248,238,.18)', borderRadius: '8px', padding: '5px 9px', fontSize: '11px', color: 'var(--cream2)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              🌤️ {company?.name ?? '회사 미설정'}
            </div>
            <button onClick={() => setMenuOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--cream)', fontSize: '20px', cursor: 'pointer', padding: '4px' }}>☰</button>
          </div>
        </header>

        {/* ── SITE BAR ── */}
        <div style={{ flexShrink: 0, background: 'var(--white)', borderBottom: '1px solid rgba(44,24,16,.1)', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 50, position: 'relative' }}>
          {/* Site Picker */}
          <div style={{ flex: 1, position: 'relative' }}>
            <div onClick={() => setSitePickerOpen(o => !o)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--g1)', border: '1.5px solid var(--cream3)', borderRadius: '9px', padding: '8px 11px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: selectedSite ? 'var(--tx)' : 'var(--tx3)', userSelect: 'none' }}>
              <span style={{ flex: 1 }}>{selectedSite?.name ?? '-- 현장 선택 --'}</span>
              <span style={{ color: 'var(--g3)', fontSize: '11px', transition: 'transform .2s', transform: sitePickerOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
            </div>
            {sitePickerOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--white)', border: '1.5px solid var(--cream3)', borderRadius: '11px', boxShadow: '0 8px 24px rgba(44,24,16,.15)', zIndex: 100, overflow: 'hidden' }}>
                <div style={{ padding: '8px 8px 4px' }}>
                  <input className="fi" placeholder="🔍 현장 검색..." value={siteSearch} onChange={e => setSiteSearch(e.target.value)}
                    style={{ width: '100%', background: 'var(--g1)', borderRadius: '8px', padding: '8px 10px', fontSize: '12px' }} />
                </div>
                <div style={{ maxHeight: '180px', overflowY: 'auto', padding: '4px 6px 8px' }}>
                  {filteredSites.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '14px', fontSize: '12px', color: 'var(--tx3)' }}>현장이 없습니다</div>
                  ) : filteredSites.map(s => (
                    <div key={s.id} onClick={() => { setSelectedSite(s); setSitePickerOpen(false); setSiteSearch('') }}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 8px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', background: selectedSite?.id === s.id ? 'var(--cream2)' : 'transparent' }}>
                      <span style={{ color: 'var(--teal)', fontSize: '13px', width: '16px' }}>{selectedSite?.id === s.id ? '✓' : ''}</span>
                      <div>
                        <div style={{ fontSize: '13px', color: 'var(--tx)', fontWeight: 500 }}>{s.name}</div>
                        <div style={{ fontSize: '10px', color: 'var(--tx3)' }}>{s.client ?? ''}</div>
                      </div>
                    </div>
                  ))}
                  <div onClick={() => { setSitePickerOpen(false); router.push('/sites') }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 8px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', color: 'var(--teal)', fontWeight: 700, borderTop: '1px solid var(--g1)', marginTop: '4px' }}>
                    + 현장 등록
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* Date Picker */}
          <button onClick={() => setCalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'var(--br)', color: 'var(--cream)', border: 'none', borderRadius: '9px', padding: '8px 11px', fontSize: '12px', fontWeight: 600, fontFamily: 'var(--sans)', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
            📅 {dateLabel}
          </button>
        </div>

        {/* ── MAIN CONTENT ── */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' }} className="no-scrollbar">
          <div style={{ padding: '12px 12px 20px', minHeight: '100%' }}>
            {children}
          </div>
        </div>

        {/* ── BOTTOM NAV ── */}
        <nav style={{ flexShrink: 0, background: 'var(--white)', borderTop: '1px solid rgba(44,24,16,.08)', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', height: '62px', boxShadow: '0 -3px 14px rgba(44,24,16,.08)' }}>
          {NAV.map(n => {
            const active = pathname === n.href || (n.href !== '/dashboard' && pathname.startsWith(n.href))
            return (
              <Link key={n.href} href={n.href}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', textDecoration: 'none', padding: '6px 2px', position: 'relative', borderTop: active ? '3px solid var(--gd)' : '3px solid transparent' }}>
                <span style={{ fontSize: '20px', transform: active ? 'scale(1.18) translateY(-2px)' : 'none', transition: 'transform .22s cubic-bezier(.34,1.56,.64,1)' }}>{n.icon}</span>
                <span style={{ fontSize: '9px', fontWeight: active ? 700 : 500, color: active ? 'var(--br)' : 'var(--g3)', transition: 'all .15s' }}>{n.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* ── SIDE MENU OVERLAY ── */}
        {menuOpen && (
          <div onClick={() => setMenuOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 70, backdropFilter: 'blur(2px)' }} />
        )}

        {/* ── SIDE MENU ── */}
        <aside style={{ position: 'fixed', top: 0, right: menuOpen ? 0 : '-290px', bottom: 0, width: '290px', background: 'var(--white)', zIndex: 80, transition: 'right .26s ease', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: 'var(--br)', padding: '16px 16px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ color: 'var(--cream)', fontSize: '14px', fontWeight: 600 }}>
              <div>{user.name || user.email}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,248,238,.5)', marginTop: '2px' }}>{company?.name ?? ''}</div>
            </div>
            <button onClick={() => setMenuOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--cream)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
          </div>

          {MENU_SECTIONS.map(sec => (
            <div key={sec.label} style={{ padding: '6px 0', borderBottom: '1px solid var(--g1)' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--g3)', letterSpacing: '.5px', padding: '8px 16px 3px', textTransform: 'uppercase' }}>{sec.label}</div>
              {sec.items.map(item => {
                const active = pathname === item.href
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', textDecoration: 'none', fontSize: '13px', fontWeight: active ? 700 : 500, color: active ? 'var(--br)' : 'var(--tx2)', background: active ? 'var(--cream2)' : 'transparent' }}>
                    <span style={{ fontSize: '16px', width: '20px', textAlign: 'center' }}>{item.icon}</span>
                    {item.label}
                  </Link>
                )
              })}
            </div>
          ))}

          <div style={{ marginTop: 'auto', padding: '16px' }}>
            <button onClick={logout} className="btn btn-ghost" style={{ fontSize: '12px' }}>
              🚪 로그아웃
            </button>
          </div>
        </aside>

        {/* ── Calendar Modal ── */}
        {calOpen && (
          <CalendarModal date={selectedDate} onChange={setSelectedDate} onClose={() => setCalOpen(false)} />
        )}

        {/* Click outside to close site picker */}
        {sitePickerOpen && (
          <div onClick={() => setSitePickerOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
        )}
      </div>
    </AppContext.Provider>
  )
}
