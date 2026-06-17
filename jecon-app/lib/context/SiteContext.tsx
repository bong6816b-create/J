'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Site } from '@/types'

interface SiteContextValue {
  sites: Site[]
  currentSite: Site | null
  setCurrentSite: (site: Site | null) => void
  refreshSites: () => Promise<void>
  loading: boolean
}

const SiteContext = createContext<SiteContextValue | null>(null)

export function SiteProvider({ children }: { children: ReactNode }) {
  const [sites, setSites] = useState<Site[]>([])
  const [currentSite, setCurrentSiteState] = useState<Site | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshSites = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setSites(data ?? [])

      // 마지막 선택 현장 복원
      const lastId = typeof window !== 'undefined'
        ? localStorage.getItem('jc-site-id')
        : null
      if (lastId && data) {
        const found = data.find((s) => s.id === lastId)
        if (found) setCurrentSiteState(found)
      }
    } catch (err) {
      console.error('현장 목록 로드 실패:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshSites()
  }, [refreshSites])

  function setCurrentSite(site: Site | null) {
    setCurrentSiteState(site)
    if (site) {
      localStorage.setItem('jc-site-id', site.id)
    } else {
      localStorage.removeItem('jc-site-id')
    }
  }

  return (
    <SiteContext.Provider value={{ sites, currentSite, setCurrentSite, refreshSites, loading }}>
      {children}
    </SiteContext.Provider>
  )
}

export function useSite() {
  const ctx = useContext(SiteContext)
  if (!ctx) throw new Error('useSite must be used within SiteProvider')
  return ctx
}
