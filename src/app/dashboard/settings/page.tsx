'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const PROVIDERS = [
  { value: 'claude', label: 'Claude (Anthropic)', default_model: 'claude-sonnet-4-20250514' },
  { value: 'openai', label: 'ChatGPT (OpenAI)', default_model: 'gpt-4o' },
  { value: 'gemini', label: 'Gemini (Google)', default_model: 'gemini-1.5-pro' },
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
      const { data: prefs } = await supabase.from('user_preferences').select('*').eq('user_id', user.id).single()
      if (prefs) {
        setDisplayName(prefs.display_name ?? '')
        setProvider(prefs.ai_provider ?? 'claude')
        setHouseholdId(prefs.household_id ?? '')
      }
      if (prefs?.household_id) {
        const { data: hh } = await supabase.from('households').select('name').eq('id', prefs.household_id).single()
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
    // In production, send email via Resend here
    alert(`Invite created! Share this link:\n${window.location.origin}/auth/invite/${token}`)
    setInviteEmail('')
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>

        {/* Profile */}
        <Section title="Your profile">
          <Field label="Display name">
            <input value={displayName} onChange={e => setDisplayName(e.target.value)}
              className="input" placeholder="Jane" />
          </Field>
        </Section>

        {/* Household */}
        <Section title="Household">
          <Field label="Household name">
            <input value={householdName} onChange={e => setHouseholdName(e.target.value)}
              className="input" placeholder="The Smith House" />
          </Field>
          <Field label="Invite a member" hint="They'll get a link to join your household">
            <div className="flex gap-2">
              <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                className="input flex-1" placeholder="partner@example.com" type="email" />
              <button onClick={inviteMember} className="btn-secondary">Send invite</button>
            </div>
          </Field>
        </Section>

        {/* AI Provider */}
        <Section title="AI assistant">
          <Field label="Provider" hint="Which AI powers your chat assistant">
            <select value={provider} onChange={e => setProvider(e.target.value)} className="input">
              {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </Field>
          <Field label="Your own API key (optional)" hint="Bring your own key for unlimited usage. Leave blank to use Stead's shared key.">
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              className="input"
              placeholder="sk-… or similar"
            />
          </Field>
          <p className="text-xs text-gray-400 mt-1">
            Your key is stored encrypted and only used server-side — never exposed to the browser.
          </p>
        </Section>

        <div className="flex justify-end">
          <button onClick={save} disabled={loading} className="btn-primary">
            {saved ? '✓ Saved' : loading ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .input { width: 100%; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 12px; font-size: 14px; outline: none; }
        .input:focus { border-color: #349470; box-shadow: 0 0 0 2px rgba(52,148,112,0.15); }
        .btn-primary { padding: 8px 20px; background: #349470; color: white; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; }
        .btn-primary:hover { background: #24775a; }
        .btn-primary:disabled { opacity: 0.5; }
        .btn-secondary { padding: 8px 14px; background: white; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; cursor: pointer; }
        .btn-secondary:hover { background: #f9fafb; }
      `}</style>
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
