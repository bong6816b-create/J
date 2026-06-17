'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/components/MainLayoutClient'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

const WORK_SCOPES = ['철근공사', '거푸집공사', '콘크리트공사', '방수공사', '미장공사', '전기공사', '배관공사', '창호공사', '도장공사', '타일공사', '기타']

export default function SubcontractorsPage() {
  const { selectedSite, company } = useApp()
  const supabase = createClient()
  const [subs, setSubs] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    company_name: '',
    representative: '',
    phone: '',
    business_no: '',
    work_scope: WORK_SCOPES[0],
    contract_amount: 0,
    start_date: '',
    end_date: '',
    workers_count: 0,
    note: '',
  })
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'ok' | 'warn' | ''>('')

  useEffect(() => { if (selectedSite) loadSubs() }, [selectedSite])

  async function loadSubs() {
    if (!selectedSite) return
    const { data } = await supabase.from('stock_records').select('*')
      .eq('site_id', selectedSite.id)
      .like('name', '하도급:%')
      .order('created_at', { ascending: false })
    setSubs(data ?? [])
  }

  async function addSub() {
    if (!selectedSite || !form.company_name) { showToast('업체명을 입력하세요', 'warn'); return }
    const { data } = await supabase.from('stock_records').insert({
      site_id: selectedSite.id,
      record_date: form.start_date || new Date().toISOString().slice(0, 10),
      name: `하도급:${form.company_name}`,
      record_type: 'out',
      qty: 1,
      unit: '건',
      unit_price: form.contract_amount,
      note: JSON.stringify(form),
    }).select().single()
    if (data) { setSubs(prev => [data, ...prev]); setShowForm(false); showToast('✅ 하도급 업체 등록 완료', 'ok') }
  }

  function showToast(msg: string, type: 'ok' | 'warn' | '' = '') {
    setToast(msg); setToastType(type); setTimeout(() => setToast(''), 2500)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
        <span style={{ fontSize: '14px', fontWeight: 700 }}>하도급 업체 관리</span>
        <span className="tag tb">계약 관리</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700 }}>등록 업체 ({subs.length}개)</div>
        <button className="btn btn-gold btn-sm" onClick={() => setShowForm(o => !o)}>+ 업체 등록</button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '10px' }}>
          <div className="card-t">하도급 업체 등록</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>업체명 *</label>
              <input className="fi" placeholder="(주)○○건설" value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>대표자</label>
              <input className="fi" placeholder="홍길동" value={form.representative} onChange={e => setForm(f => ({ ...f, representative: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>연락처</label>
              <input className="fi" placeholder="010-0000-0000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>사업자번호</label>
              <input className="fi" placeholder="000-00-00000" value={form.business_no} onChange={e => setForm(f => ({ ...f, business_no: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>공사 범위</label>
              <select className="fi" value={form.work_scope} onChange={e => setForm(f => ({ ...f, work_scope: e.target.value }))}>
                {WORK_SCOPES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>계약금액 (원)</label>
              <input className="fi" type="number" value={form.contract_amount || ''} onChange={e => setForm(f => ({ ...f, contract_amount: Number(e.target.value) }))} />
            </div>
          </div>
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
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>투입 인원</label>
            <input className="fi" type="number" placeholder="0" value={form.workers_count || ''} onChange={e => setForm(f => ({ ...f, workers_count: Number(e.target.value) }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button className="btn btn-gold" onClick={addSub}>등록</button>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>취소</button>
          </div>
        </div>
      )}

      {subs.length === 0 ? (
        <div className="empty-state" style={{ paddingTop: '60px' }}>
          <div className="ei">🏢</div>
          <div style={{ fontWeight: 700 }}>등록된 하도급 업체가 없습니다</div>
        </div>
      ) : (
        subs.map((s, i) => {
          let info: any = {}
          try { info = JSON.parse(s.note) } catch {}
          return (
            <div key={i} className="card" style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>{s.name.replace('하도급:', '')}</div>
                  <div style={{ fontSize: '11px', color: 'var(--tx3)' }}>{info.work_scope}</div>
                </div>
                <span style={{ background: '#CCFBF1', color: 'var(--teal)', fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '20px' }}>
                  ₩{(s.unit_price / 10000).toFixed(0)}만원
                </span>
              </div>
              <div style={{ display: 'flex', gap: '12px', fontSize: '10px', color: 'var(--tx3)' }}>
                {info.representative && <span>👤 {info.representative}</span>}
                {info.phone && <span>📞 {info.phone}</span>}
                {info.workers_count > 0 && <span>👷 {info.workers_count}명</span>}
              </div>
              {info.start_date && (
                <div style={{ fontSize: '10px', color: 'var(--tx3)', marginTop: '3px' }}>
                  {info.start_date} ~ {info.end_date || '미정'}
                </div>
              )}
            </div>
          )
        })
      )}
      <Toast message={toast} type={toastType} />
    </div>
  )
}
