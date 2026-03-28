import { NextRequest, NextResponse } from 'next/server'
import { createAdminAuditLog } from '@/lib/admin-audit'
import { requireSuperAdminUser } from '@/lib/server-auth'
import { normalizeSiteContent, sanitizeSiteContentInput } from '@/lib/site-content'
import { getSupabaseServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = getSupabaseServerClient()
    const { data: contentItems, error } = await supabase
      .from('content')
      .select('key, value')

    if (error) {
      throw error
    }

    const rawContent: Record<string, string> = {}

    for (const item of contentItems || []) {
      rawContent[item.key] = item.value
    }

    return NextResponse.json({
      content: normalizeSiteContent(rawContent),
    })
  } catch (error) {
    console.error('Error fetching content:', error)
    return NextResponse.json(
      { error: 'Gagal memuat konten' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSuperAdminUser(request)

    if ('response' in session) {
      return session.response
    }

    const body = await request.json()
    const key = typeof body.key === 'string' ? body.key : ''
    const content = sanitizeSiteContentInput({
      [key]: body.value,
    })

    if (!key || !(key in content)) {
      return NextResponse.json(
        { error: 'Kunci dan nilai wajib diisi' },
        { status: 400 },
      )
    }

    const supabase = getSupabaseServerClient()
    const { data: updatedContent, error } = await supabase
      .from('content')
      .upsert(
        {
          key,
          value: content[key as keyof typeof content] as string,
        },
        { onConflict: 'key' },
      )
      .select('id, key, value, created_at, updated_at')
      .single()

    if (error || !updatedContent) {
      throw error || new Error('Gagal memperbarui konten')
    }

    await createAdminAuditLog({
      adminId: session.user.id,
      action: 'CONTENT_UPDATED',
      targetType: 'content',
      metadata: {
        keys: [key],
      },
    })

    return NextResponse.json({ content: updatedContent })
  } catch (error) {
    console.error('Error updating content:', error)
    return NextResponse.json(
      { error: 'Gagal memperbarui konten' },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireSuperAdminUser(request)

    if ('response' in session) {
      return session.response
    }

    const body = await request.json()
    const content = sanitizeSiteContentInput(
      body && typeof body.content === 'object' ? body.content as Record<string, unknown> : undefined,
    )

    const entries = Object.entries(content).map(([key, value]) => ({
      key,
      value,
    }))

    if (entries.length === 0) {
      return NextResponse.json(
        { error: 'Minimal satu field konten yang valid wajib diisi' },
        { status: 400 },
      )
    }

    const supabase = getSupabaseServerClient()
    const { error } = await supabase
      .from('content')
      .upsert(entries, { onConflict: 'key' })

    if (error) {
      throw error
    }

    await createAdminAuditLog({
      adminId: session.user.id,
      action: 'CONTENT_UPDATED',
      targetType: 'content',
      metadata: {
        keys: entries.map((entry) => entry.key),
      },
    })

    return NextResponse.json({
      success: true,
      content: normalizeSiteContent(content),
    })
  } catch (error) {
    console.error('Error updating content:', error)
    return NextResponse.json(
      { error: 'Gagal memperbarui konten' },
      { status: 500 },
    )
  }
}
