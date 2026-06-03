import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format, addDays } from 'date-fns'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: prefs } = await supabase
    .from('user_preferences')
    .select('household_id, display_name')
    .eq('user_id', user.id)
    .single()

  const householdId = prefs?.household_id
  const today = format(new Date(), 'yyyy-MM-dd')
  const in7Days = format(addDays(new Date(), 7), 'yyyy-MM-dd')

  const [
    { data: lastWeight },
    { data: lastBP },
    { data: upcomingEvents },
    { data: dueTasks },
    { data: vehicles },
  ] = await Promise.all([
    supabase.from('health_logs').select('value_numeric,unit,date').eq('household_id', householdId).eq('type', 'weight').order('date', { ascending: false }).limit(1),
    supabase.from('health_logs').select('value_systolic,value_diastolic,date').eq('household_id', householdId).eq('type', 'bp').order('date', { ascending: false }).limit(1),
    supabase.from('calendar_events').select('title,start_datetime,category').eq('household_id', householdId).gte('start_datetime', today).lte('start_datetime', in7Days).order('start_datetime').limit(5),
    supabase.from('household_tasks').select('title,next_due_date').eq('household_id', householdId).lte('next_due_date', today).limit(5),
    supabase.from('vehicles').select('nickname,make,model,registration_expiry').eq('household_id', householdId),
  ])

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Good {getTimeOfDay()}, {prefs?.display_name ?? 'there'}</h1>
          <p className="text-gray-500 mt-1">{format(new Date(), 'EEEE, MMMM d')}</p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Weight" value={lastWeight?.[0] ? `${lastWeight[0].value_numeric} ${lastWeight[0].unit ?? 'lbs'}` : '—'} sub={lastWeight?.[0]?.date ? format(new Date(lastWeight[0].date), 'MMM d') : 'No data'} href="/dashboard/health" />
          <StatCard label="Blood pressure" value={lastBP?.[0] ? `${lastBP[0].value_systolic}/${lastBP[0].value_diastolic}` : '—'} sub={lastBP?.[0]?.date ? format(new Date(lastBP[0].date), 'MMM d') : 'No data'} href="/dashboard/health" />
          <StatCard label="Tasks due" value={String(dueTasks?.length ?? 0)} sub={dueTasks?.length ? 'needs attention' : 'all clear'} href="/dashboard/home" />
          <StatCard label="Vehicles" value={String(vehicles?.length ?? 0)} sub="tracked" href="/dashboard/vehicles" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Upcoming events */}
          <Section title="This week" href="/dashboard/calendar">
            {upcomingEvents?.length ? upcomingEvents.map((e: Record<string, string>) => (
              <div key={e.title + e.start_datetime} className="flex gap-3 py-2 border-b border-gray-100 last:border-0">
                <span className="text-xs text-gray-400 w-12 shrink-0 mt-0.5">{format(new Date(e.start_datetime), 'MMM d')}</span>
                <span className="text-sm text-gray-800">{e.title}</span>
              </div>
            )) : <p className="text-sm text-gray-400 py-4 text-center">No events this week</p>}
          </Section>

          {/* Overdue tasks */}
          <Section title="Tasks due" href="/dashboard/home">
            {dueTasks?.length ? dueTasks.map((t: Record<string, string>) => (
              <div key={t.title} className="flex gap-3 py-2 border-b border-gray-100 last:border-0">
                <span className="text-xs text-red-400 w-12 shrink-0 mt-0.5">{t.next_due_date ? format(new Date(t.next_due_date), 'MMM d') : 'Due'}</span>
                <span className="text-sm text-gray-800">{t.title}</span>
              </div>
            )) : <p className="text-sm text-gray-400 py-4 text-center">No overdue tasks 🎉</p>}
          </Section>
        </div>

        {/* Chat CTA */}
        <div className="mt-4 bg-brand-50 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="font-medium text-brand-800">Log something?</p>
            <p className="text-sm text-brand-600 mt-0.5">Just tell the assistant — it handles the rest.</p>
          </div>
          <Link href="/dashboard/chat" className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
            Open chat
          </Link>
        </div>
      </div>
    </div>
  )
}

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function StatCard({ label, value, sub, href }: { label: string; value: string; sub: string; href: string }) {
  return (
    <Link href={href} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </Link>
  )
}

function Section({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-sm font-medium text-gray-700">{title}</h2>
        <Link href={href} className="text-xs text-brand-600 hover:underline">View all</Link>
      </div>
      {children}
    </div>
  )
}
