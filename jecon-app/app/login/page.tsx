'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
    } else {
      router.push('/dashboard')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--br)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ width: '64px', height: '64px', background: 'var(--gold)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', margin: '0 auto 12px', boxShadow: '0 4px 20px rgba(245,200,66,.4)' }}>
          🏗️
        </div>
        <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '36px', color: 'var(--cream)', letterSpacing: '1px', lineHeight: 1 }}>
          제이<span style={{ color: 'var(--gold)' }}>건설</span>
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(255,248,238,.5)', marginTop: '6px' }}>
          현장 관리의 새로운 기준
        </div>
      </div>

      {/* Login Card */}
      <div style={{ width: '100%', maxWidth: '400px', background: 'var(--white)', borderRadius: '20px', padding: '28px 24px', boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--tx)', marginBottom: '4px' }}>로그인</h1>
        <p style={{ fontSize: '12px', color: 'var(--tx3)', marginBottom: '20px' }}>계정에 로그인하세요</p>

        {error && (
          <div style={{ background: '#FFE4E1', border: '1.5px solid rgba(230,59,46,.2)', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: 'var(--red)', marginBottom: '14px' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>이메일</label>
            <input
              className="fi"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>비밀번호</label>
            <input
              className="fi"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            className="btn btn-main"
            disabled={loading}
            style={{ marginBottom: '12px' }}
          >
            {loading ? '로그인 중...' : '🔐 로그인'}
          </button>
        </form>

        <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--tx3)' }}>
          계정이 없으신가요?{' '}
          <Link href="/signup" style={{ color: 'var(--teal)', fontWeight: 700 }}>
            회원가입
          </Link>
        </div>
      </div>

      <div style={{ marginTop: '24px', fontSize: '11px', color: 'rgba(255,248,238,.3)', textAlign: 'center' }}>
        © 2025 제이건설 · 소규모 건설현장 관리 솔루션
      </div>
    </div>
  )
}
