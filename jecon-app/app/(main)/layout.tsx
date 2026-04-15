import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MainLayoutClient from '@/components/MainLayoutClient'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch company
  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  // Fetch sites
  const { data: sites } = await supabase
    .from('sites')
    .select('*')
    .eq('company_id', company?.id ?? '')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  return (
    <MainLayoutClient
      user={{ email: user.email!, name: user.user_metadata?.full_name ?? '' }}
      company={company}
      sites={sites ?? []}
    >
      {children}
    </MainLayoutClient>
  )
}
