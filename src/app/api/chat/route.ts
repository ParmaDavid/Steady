import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { callAI, resolveApiKey } from '@/lib/ai'
import { buildSystemPrompt } from '@/lib/prompts/system'
import { format, addDays } from 'date-fns'
import type { AIMessage } from '@/lib/ai/types'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message, history } = await request.json() as {
      message: string
      history: AIMessage[]
    }

    // Load user preferences (AI provider, model, key)
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    const provider = prefs?.ai_provider ?? 'claude'
    const model = prefs?.ai_model ?? ''
    const apiKey = resolveApiKey(provider, prefs?.ai_api_key_enc)

    if (!apiKey) {
      return NextResponse.json({ error: 'No API key configured' }, { status: 500 })
    }

    const householdId = prefs?.household_id
    if (!householdId) {
      return NextResponse.json({ error: 'No household found' }, { status: 400 })
    }

    // Load household context
    const serviceClient = createServiceClient()
    const today = format(new Date(), 'yyyy-MM-dd')
    const in7Days = format(addDays(new Date(), 7), 'yyyy-MM-dd')

    const [
      { data: household },
      { data: members },
      { data: lastWeight },
      { data: lastBP },
      { data: upcomingEvents },
      { data: dueTasks },
      { data: medications },
      { data: vehicles },
    ] = await Promise.all([
      serviceClient.from('households').select('name').eq('id', householdId).single(),
      serviceClient.from('household_members')
        .select('user_id, user_preferences(display_name)')
        .eq('household_id', householdId)
        .eq('invite_accepted', true),
      serviceClient.from('health_logs')
        .select('value_numeric, unit, date')
        .eq('household_id', householdId)
        .eq('user_id', user.id)
        .eq('type', 'weight')
        .order('date', { ascending: false })
        .limit(1),
      serviceClient.from('health_logs')
        .select('value_systolic, value_diastolic, date')
        .eq('household_id', householdId)
        .eq('user_id', user.id)
        .eq('type', 'bp')
        .order('date', { ascending: false })
        .limit(1),
      serviceClient.from('calendar_events')
        .select('title, start_datetime, category')
        .eq('household_id', householdId)
        .gte('start_datetime', today)
        .lte('start_datetime', in7Days)
        .order('start_datetime')
        .limit(10),
      serviceClient.from('household_tasks')
        .select('title, next_due_date')
        .eq('household_id', householdId)
        .lte('next_due_date', today)
        .limit(5),
      serviceClient.from('medications')
        .select('name, dose, frequency')
        .eq('household_id', householdId)
        .eq('user_id', user.id)
        .eq('active', true),
      serviceClient.from('vehicles')
        .select('nickname, make, model')
        .eq('household_id', householdId),
    ])

    // Build system prompt with context
    const memberNames = (members ?? []).map((m: Record<string, unknown>) => {
      const up = m.user_preferences as Record<string, string> | null
      return up?.display_name ?? 'Member'
    })

    const systemPrompt = buildSystemPrompt({
      userName: prefs?.display_name ?? user.email ?? 'there',
      householdName: household?.name ?? 'My Household',
      memberNames,
      recentHealth: {
        lastWeight: lastWeight?.[0] ? {
          value: lastWeight[0].value_numeric,
          unit: lastWeight[0].unit ?? 'lbs',
          date: lastWeight[0].date,
        } : undefined,
        lastBP: lastBP?.[0] ? {
          systolic: lastBP[0].value_systolic,
          diastolic: lastBP[0].value_diastolic,
          date: lastBP[0].date,
        } : undefined,
      },
      upcomingEvents: (upcomingEvents ?? []).map((e: Record<string, string>) => ({
        title: e.title,
        date: format(new Date(e.start_datetime), 'MMM d'),
        category: e.category,
      })),
      dueTasks: (dueTasks ?? []).map((t: Record<string, string>) => ({
        title: t.title,
        due: t.next_due_date,
      })),
      activeMedications: (medications ?? []).map((m: Record<string, string>) => ({
        name: m.name,
        dose: m.dose ?? '',
        frequency: m.frequency ?? '',
      })),
      vehicles: (vehicles ?? []).map((v: Record<string, string>) => ({
        nickname: v.nickname,
        make: v.make ?? '',
        model: v.model ?? '',
      })),
    })

    // Call AI
    const aiResponse = await callAI({
      provider,
      apiKey,
      model,
      systemPrompt,
      messages: [...history, { role: 'user', content: message }],
      maxTokens: 1024,
    })

    let reply = aiResponse.content
    let actionExecuted = false

    // Parse and execute action block
    const actionMatch = reply.match(/<<ACTION>>([\s\S]*?)<<END>>/)
    if (actionMatch) {
      try {
        const action = JSON.parse(actionMatch[1]) as { table: string; data: Record<string, unknown> }
        await executeAction(serviceClient, action, user.id, householdId)
        actionExecuted = true
      } catch (e) {
        console.error('Action parse error:', e)
      }
      reply = reply.replace(/<<ACTION>>[\s\S]*?<<END>>/, '').trim()
    }

    // Save to chat history
    await serviceClient.from('chat_history').insert([
      { household_id: householdId, user_id: user.id, role: 'user', content: message, ai_provider: provider },
      { household_id: householdId, user_id: user.id, role: 'assistant', content: reply, ai_provider: provider },
    ])

    return NextResponse.json({ reply, actionExecuted, provider })

  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function executeAction(
  client: ReturnType<typeof createServiceClient>,
  action: { table: string; data: Record<string, unknown> },
  userId: string,
  householdId: string
) {
  const { table, data } = action
  const allowedTables = [
    'health_logs', 'exercise_logs', 'meals', 'medications',
    'doctor_visits', 'calendar_events', 'household_tasks',
    'household_task_logs', 'vehicle_service_logs', 'vehicle_fuel_logs',
    'recipes', 'meal_plans',
  ]

  if (!allowedTables.includes(table)) {
    throw new Error(`Table ${table} not allowed via chat`)
  }

  const row: Record<string, unknown> = {
    ...data,
    household_id: householdId,
    user_id: userId,
  }

  // Handle vehicle lookup by nickname
  if (table === 'vehicle_service_logs' || table === 'vehicle_fuel_logs') {
    if (data.vehicle_nickname) {
      const { data: vehicle } = await client
        .from('vehicles')
        .select('id')
        .eq('household_id', householdId)
        .ilike('nickname', `%${data.vehicle_nickname}%`)
        .single()
      if (vehicle) row.vehicle_id = vehicle.id
      delete row.vehicle_nickname
    }
    delete row.user_id
  }

  // Handle task log — match task by title
  if (table === 'household_task_logs') {
    if (data.task_title) {
      const { data: task } = await client
        .from('household_tasks')
        .select('id')
        .eq('household_id', householdId)
        .ilike('title', `%${data.task_title}%`)
        .single()
      if (task) {
        row.task_id = task.id
        // Update the task's last_done_date and next_due_date
        const { data: taskFull } = await client
          .from('household_tasks')
          .select('interval_days')
          .eq('id', task.id)
          .single()
        const doneDate = (data.done_date as string) || format(new Date(), 'yyyy-MM-dd')
        const updates: Record<string, unknown> = { last_done_date: doneDate }
        if (taskFull?.interval_days) {
          const nextDue = addDays(new Date(doneDate), taskFull.interval_days)
          updates.next_due_date = format(nextDue, 'yyyy-MM-dd')
        }
        await client.from('household_tasks').update(updates).eq('id', task.id)
      }
      delete row.task_title
    }
  }

  await client.from(table).insert(row)
}
