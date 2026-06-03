'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"

const PROVIDERS = [
  { value: 'claude', label: 'Claude (Anthropic)' },
  { value: 'openai', label: 'ChatGPT (OpenAI)' },
  { value: 'gemini', label: 'Gemini (Google)' },
]

export default function SettingsPage() {
  const supabase = createClient()
  const [displayName, setDisplayName] = useState('')
  const [householdName, setHouseholdName] = useState('')
  const [provider, setProvider] = useState('claude')
  const [apiKey, setApiKey] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [householdId, setHouseholdId] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single()
      if (prefs) {
        setDisplayName(prefs.display_name ?? '')
        setProvider(prefs.ai_provider ?? 'claude')
        setHouseholdId(prefs.household_id ?? '')
      }
      if (prefs?.household_id) {
        const { data: hh } = await supabase
          .from('households')
          .select('name')
          .eq('id', prefs.household_id)
          .single()
        if (hh) setHouseholdName(hh.name)
      }
    }
    load()
  }, [supabase])

  async function save() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('user_preferences').update({
      display_name: displayName,
      ai_provider: provider,
      ...(apiKey ? { ai_api_key_enc: apiKey } : {}),
    }).eq('user_id', user.id)
    if (householdId) {
      await supabase.from('households').update({ name: householdName }).eq('id', householdId)
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setLoading(false)
  }

  async function inviteMember() {
    if (!inviteEmail || !householdId) return
    const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
    await supabase.from('household_members').insert({
      household_id: householdId,
      invited_email: inviteEmail,
      invite_token: token,
      role: 'member',
      invite_accepted: false,
    })
    alert(`Invite created! Share this link:\n${window.location.origin}/auth/invite/${token}`)
    setInviteEmail('')
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>

        <Section title="Your profile">
          <Field label="Display name">
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className={inputClass}
              placeholder="Jane"
            />
          </Field>
        </Section>

        <Section title="Household">
          <Field label="Household name">
            <input
              value={householdName}
              onChange={e => setHouseholdName(e.target.value)}
              className={inputClass}
              placeholder="The Smith House"
            />
          </Field>
          <Field label="Invite a member" hint="They will get a link to join your household">
            <div className="flex gap-2">
              <input
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className={inputClass + ' flex-1'}
                placeholder="partner@example.com"
                type="email"
              />
              <button
                onClick={inviteMember}
                className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors whitespace-nowrap"
              >
                Send invite
              </button>
            </div>
          </Field>
        </Section>

        <Section title="AI assistant">
          <Field label="Provider" hint="Which AI powers your chat assistant">
            <select
              value={provider}
              onChange={e => setProvider(e.target.value)}
              className={inputClass}
            >
              {PROVIDERS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </Field>
          <Field
            label="Your own API key (optional)"
            hint="Bring your own key for unlimited usage. Leave blank to use Stead's shared key."
          >
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              className={inputClass}
              placeholder="sk-... or similar"
            />
          </Field>
          <p className="text-xs text-gray-400 mt-1">
            Your key is stored encrypted and only used server-side.
          </p>
        </Section>

        <div className="flex justify-end">
          <button
            onClick={save}
            disabled={loading}
            className="px-5 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {saved ? '✓ Saved' : loading ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1.5">{hint}</p>}
      {children}
    </div>
  )
}
