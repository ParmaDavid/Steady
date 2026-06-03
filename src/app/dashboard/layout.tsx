import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardShell from '@/components/dashboard/DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: prefs } = await supabase
    .from('user_preferences')
    .select('display_name, avatar_color, household_id')
    .eq('user_id', user.id)
    .single()

  const { data: household } = prefs?.household_id
    ? await supabase.from('households').select('name, plan').eq('id', prefs.household_id).single()
    : { data: null }

  return (
    <DashboardShell
      userName={prefs?.display_name ?? 'there'}
      avatarColor={prefs?.avatar_color ?? '#349470'}
      householdName={household?.name ?? 'My Household'}
      plan={household?.plan ?? 'free'}
    >
      {children}
    </DashboardShell>
  )
}
