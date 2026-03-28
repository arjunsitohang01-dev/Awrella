import { NextRequest, NextResponse } from 'next/server'
import { createAdminAuditLog } from '@/lib/admin-audit'
import { getSupabaseServerClient } from '@/lib/supabase'
import { requireAdminUser } from '@/lib/server-auth'

type PhotoOrderInput = {
  id: string
  order: number
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAdminUser(request)

    if ('response' in session) {
      return session.response
    }

    const body = await request.json()
    const photoOrders = Array.isArray(body.photoOrders) ? body.photoOrders as PhotoOrderInput[] : []

    if (photoOrders.length === 0) {
      return NextResponse.json(
        { error: 'Urutan foto wajib dikirim' },
        { status: 400 },
      )
    }

    const supabase = getSupabaseServerClient()
    const seenIds = new Set<string>()

    for (const item of photoOrders) {
      if (!item?.id || !Number.isInteger(item.order)) {
        return NextResponse.json(
          { error: 'Setiap urutan foto wajib memiliki id valid dan nomor urut berupa bilangan bulat' },
          { status: 400 },
        )
      }

      if (seenIds.has(item.id)) {
        return NextResponse.json(
          { error: 'Ada id foto yang duplikat pada permintaan ubah urutan' },
          { status: 400 },
        )
      }

      seenIds.add(item.id)
    }

    const updateResults = await Promise.all(
      photoOrders.map((item) =>
        supabase
          .from('photos')
          .update({ order: item.order })
          .eq('id', item.id)
          .select('id')
          .maybeSingle(),
      ),
    )

    for (const result of updateResults) {
      if (result.error) {
        throw result.error
      }

      if (!result.data) {
        return NextResponse.json(
          { error: 'Satu atau lebih foto tidak ditemukan' },
          { status: 404 },
        )
      }
    }

    await createAdminAuditLog({
      adminId: session.user.id,
      action: 'PHOTO_REORDERED',
      targetType: 'photo',
      metadata: {
        photoOrders,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error reordering photos:', error)
    return NextResponse.json(
      { error: 'Gagal mengubah urutan foto' },
      { status: 500 },
    )
  }
}
