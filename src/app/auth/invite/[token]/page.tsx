'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

export default function InvitePage() {
  const params = useParams()
  const token = params.token as string
  const [invite, setInvite] = useState<Record<string, string> | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'loading' | 'accept' | 'invalid'>('loading')
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function loadInvite() {
      const { data } = await supabase
        .from('household_members')
        .select('*, households(name)')
        .eq('invite_token', token)
        .eq('invite_accepted', false)
        .single()
      if (data) {
        setInvite(data)
        setEmail(data.invited_email ?? '')
        setStep('accept')
      } else {
        setStep('invalid')
      }
    }
    loadInvite()
  }, [token, supabase])

  async function handleAccept() {
    setLoading(true)
    setError('')
    const { data: { user }, error: authError } = await supabase.auth.signUp({ email, password })
    if (authError) {
      // Try signing in if user exists
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) { setError(signInError.message); setLoading(false); return }
    }
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) { setError('Authentication failed'); setLoading(false); return }

    // Accept invite
    await supabase.from('household_members').update({
      user_id: currentUser.id,
      invite_accepted: true,
      invite_token: null,
    }).eq('invite_token', token)

    // Update preferences to point to household
    await supabase.from('user_preferences').upsert({
      user_id: currentUser.id,
      household_id: invite?.household_id,
      display_name: email.split('@')[0],
    })

    router.push('/dashboard')
  }

  if (step === 'loading') return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Loading invite…</p></div>
  if (step === 'invalid') return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-700 font-medium">This invite link is invalid or has already been used.</p>
        <Link href="/" className="mt-4 inline-block text-brand-600 hover:underline">Go home</Link>
      </div>
    </div>
  )

  const hh = invite?.households as unknown as Record<string, string>

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 w-full max-w-md">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">You&apos;ve been invited</h1>
        <p className="text-gray-500 mb-6">Join <strong>{hh?.name ?? 'a household'}</strong> on Stead</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Create a password" />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button onClick={handleAccept} disabled={loading}
            className="w-full py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
            {loading ? 'Joining…' : 'Accept invite & join'}
          </button>
        </div>
      </div>
    </div>
  )
}
