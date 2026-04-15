'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/components/MainLayoutClient'
import { createClient } from '@/lib/supabase/client'
import type { SafetyIssue } from '@/types'
import Toast from '@/components/Toast'

const ISSUE_TYPES = ['안전사고', '아차사고', '하자 발생', '민원 접수', '안전 위반', '기타']

export default function IssuesPage() {
  const { selectedSite, selectedDate } = useApp()
  const supabase = createClient()
  const [issues, setIssues] = useState<SafetyIssue[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ issue_type: ISSUE_TYPES[0], issue_date: selectedDate, location: '', description: '', status: '미처리', assigned_to: '' })
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'ok' | 'warn' | ''>('')

  useEffect(() => { if (selectedSite) loadIssues() }, [selectedSite])

  async function loadIssues() {
    if (!selectedSite) return
    const { data } = await supabase.from('safety_issues').select('*').eq('site_id', selectedSite.id).order('created_at', { ascending: false })
    setIssues(data ?? [])
  }

  async function addIssue() {
    if (!selectedSite || !form.description) { showToast('이슈 내용을 입력하세요', 'warn'); return }
    const { data } = await supabase.from('safety_issues').insert({ ...form, site_id: selectedSite.id }).select().single()
    if (data) { setIssues(prev => [data, ...prev]); setShowForm(false); showToast('이슈 등록 완료', 'ok') }
  }

  function showToast(msg: string, type: 'ok' | 'warn' | '' = '') {
    setToast(msg); setToastType(type); setTimeout(() => setToast(''), 2500)
  }

  const statusColors: Record<string, { bg: string; color: string }> = {
    '미처리': { bg: '#FFE4E1', color: 'var(--red)' },
    '처리중': { bg: '#FEF9C3', color: 'var(--gd)' },
    '완료': { bg: '#DCFCE7', color: 'var(--grn)' },
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '14px', fontWeight: 700 }}>안전/하자 이슈 관리</span>
          <span className="tag tr">이슈 추적</span>
        </div>
        <button className="btn btn-main btn-sm" onClick={() => setShowForm(o => !o)}>+ 새 이슈</button>
      </div>

      {showForm && (
        <div className="card">
          <div className="card-t">새 이슈 등록</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>이슈 유형</label>
              <select className="fi" value={form.issue_type} onChange={e => setForm(f => ({ ...f, issue_type: e.target.value }))}>
                {ISSUE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>발생일</label>
              <input className="fi" type="date" value={form.issue_date} onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))} />
            </div>
          </div>
          <div style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>발생 위치</label>
            <input className="fi" placeholder="3층 철근 배근 구역" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
          </div>
          <div style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>이슈 내용</label>
            <textarea className="fta" placeholder="발생 경위, 상황 등을 상세히 입력하세요..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>처리 상태</label>
              <select className="fi" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {['미처리', '처리중', '완료'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>담당자</label>
              <input className="fi" placeholder="홍길동" value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button className="btn btn-red" onClick={addIssue}>이슈 등록</button>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>취소</button>
          </div>
        </div>
      )}

      {issues.length === 0 ? (
        <div className="empty-state" style={{ paddingTop: '60px' }}>
          <div className="ei">✅</div>
          <div style={{ fontWeight: 700 }}>등록된 이슈가 없습니다</div>
          <div style={{ marginTop: '4px', color: 'var(--grn)' }}>안전한 현장입니다!</div>
        </div>
      ) : (
        issues.map(issue => {
          const sc = statusColors[issue.status] ?? statusColors['미처리']
          return (
            <div key={issue.id} className="card" style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700 }}>{issue.issue_type}</div>
                <span style={{ background: sc.bg, color: sc.color, fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '20px' }}>{issue.status}</span>
              </div>
              {issue.location && <div style={{ fontSize: '11px', color: 'var(--tx3)', marginBottom: '4px' }}>📍 {issue.location}</div>}
              <div style={{ fontSize: '12px', color: 'var(--tx2)', marginBottom: '6px', lineHeight: 1.5 }}>{issue.description}</div>
              <div style={{ display: 'flex', gap: '12px', fontSize: '10px', color: 'var(--tx3)' }}>
                {issue.issue_date && <span>📅 {issue.issue_date}</span>}
                {issue.assigned_to && <span>👤 {issue.assigned_to}</span>}
              </div>
            </div>
          )
        })
      )}
      <Toast message={toast} type={toastType} />
    </div>
  )
}
