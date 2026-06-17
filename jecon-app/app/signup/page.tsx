'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [form, setForm] = useState({ email: '', password: '', name: '', company: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  function update(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: signupError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.name, company_name: form.company },
      },
    })

    if (signupError) {
      setError(signupError.message)
    } else if (data.user) {
      // Create company record
      await supabase.from('companies').insert({
        name: form.company || `${form.name}의 회사`,
        owner_id: data.user.id,
      })
      setDone(true)
    }
    setLoading(false)
  }

  if (done) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--br)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ textAlign: 'center', color: 'var(--cream)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '28px', marginBottom: '8px' }}>
            가입 완료!
          </div>
          <p style={{ fontSize: '13px', color: 'rgba(255,248,238,.7)', marginBottom: '24px' }}>
            이메일을 확인하여 계정을 인증해주세요
          </p>
          <Link href="/login" className="btn btn-gold" style={{ display: 'inline-flex', width: 'auto', padding: '12px 28px' }}>
            로그인하기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--br)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{ width: '56px', height: '56px', background: 'var(--gold)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', margin: '0 auto 10px', boxShadow: '0 4px 20px rgba(245,200,66,.4)' }}>
          🏗️
        </div>
        <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '30px', color: 'var(--cream)', letterSpacing: '1px' }}>
          제이<span style={{ color: 'var(--gold)' }}>건설</span>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: '400px', background: 'var(--white)', borderRadius: '20px', padding: '28px 24px', boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--tx)', marginBottom: '4px' }}>회원가입</h1>
        <p style={{ fontSize: '12px', color: 'var(--tx3)', marginBottom: '20px' }}>새 계정을 만드세요</p>

        {error && (
          <div style={{ background: '#FFE4E1', border: '1.5px solid rgba(230,59,46,.2)', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: 'var(--red)', marginBottom: '14px' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSignup}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>이름</label>
            <input className="fi" type="text" placeholder="홍길동" value={form.name} onChange={update('name')} required />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>회사명</label>
            <input className="fi" type="text" placeholder="제이건설" value={form.company} onChange={update('company')} />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>이메일</label>
            <input className="fi" type="email" placeholder="your@email.com" value={form.email} onChange={update('email')} required autoComplete="email" />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>비밀번호 (6자 이상)</label>
            <input className="fi" type="password" placeholder="••••••••" value={form.password} onChange={update('password')} required minLength={6} autoComplete="new-password" />
          </div>
          <button type="submit" className="btn btn-main" disabled={loading} style={{ marginBottom: '12px' }}>
            {loading ? '처리 중...' : '🚀 회원가입'}
          </button>
        </form>

        <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--tx3)' }}>
          이미 계정이 있으신가요?{' '}
          <Link href="/login" style={{ color: 'var(--teal)', fontWeight: 700 }}>로그인</Link>
        </div>
      </div>
    </div>
  )
}
