import { NextRequest, NextResponse } from 'next/server'
import { createAdminAuditLog } from '@/lib/admin-audit'
import { getSupabaseServerClient, mapMusicRowToResponse } from '@/lib/supabase'
import { normalizeSpotifyMusicType, parseSpotifyResource } from '@/lib/spotify'
import { requireAdminUser, requireAuthenticatedUser } from '@/lib/server-auth'

// GET all music items
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuthenticatedUser(request)

    if ('response' in session) {
      return session.response
    }

    const supabase = getSupabaseServerClient()
    const { data: musicItems, error } = await supabase
      .from('music')
      .select('id, title, spotify_url, type, featured, order, created_at, updated_at')
      .order('order', { ascending: true })

    if (error) {
      throw error
    }

    return NextResponse.json({ musicItems: (musicItems || []).map(mapMusicRowToResponse) })
  } catch (error) {
    console.error('Error fetching music:', error)
    return NextResponse.json(
      { error: 'Gagal memuat musik' },
      { status: 500 }
    )
  }
}

// POST create new music item
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminUser(request)

    if ('response' in session) {
      return session.response
    }

    const body = await request.json()
    const { title, spotifyUrl, type, order, featured } = body
    const supabase = getSupabaseServerClient()
    const normalizedTitle = typeof title === 'string' ? title.trim() : ''

    // Validate input
    if (!normalizedTitle || !spotifyUrl || !type) {
      return NextResponse.json(
        { error: 'Judul, URL Spotify, dan tipe wajib diisi' },
        { status: 400 }
      )
    }

    const normalizedType = normalizeSpotifyMusicType(type)
    if (!normalizedType) {
      return NextResponse.json(
        { error: 'Tipe harus berupa "track" atau "playlist"' },
        { status: 400 }
      )
    }

    const parsedSpotify = parseSpotifyResource(spotifyUrl, normalizedType)
    if (!parsedSpotify) {
      return NextResponse.json(
        { error: 'URL Spotify tidak valid. Gunakan link track atau playlist Spotify.' },
        { status: 400 }
      )
    }

    // Get max order if not provided
    let musicOrder = order
    if (musicOrder === undefined) {
      const { data: maxOrderMusic, error: maxOrderError } = await supabase
        .from('music')
        .select('order')
        .order('order', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (maxOrderError) {
        throw maxOrderError
      }
      musicOrder = maxOrderMusic ? maxOrderMusic.order + 1 : 0
    }

    if (featured) {
      const { error: resetFeaturedError } = await supabase
        .from('music')
        .update({ featured: false })
        .eq('featured', true)

      if (resetFeaturedError) {
        throw resetFeaturedError
      }
    }

    // Create music item
    const { data: music, error: createMusicError } = await supabase
      .from('music')
      .insert({
        title: normalizedTitle,
        spotify_url: parsedSpotify.embedUrl,
        type: parsedSpotify.type,
        order: musicOrder,
        featured: featured || false,
      })
      .select('id, title, spotify_url, type, featured, order, created_at, updated_at')
      .single()

    if (createMusicError || !music) {
      throw createMusicError || new Error('Gagal membuat musik')
    }

    await createAdminAuditLog({
      adminId: session.user.id,
      action: 'MUSIC_CREATED',
      targetType: 'music',
      targetId: music.id,
      metadata: {
        type: music.type,
        featured: music.featured,
        title: music.title,
      },
    })

    return NextResponse.json({ music: mapMusicRowToResponse(music) }, { status: 201 })
  } catch (error) {
    console.error('Error creating music:', error)
    return NextResponse.json(
      { error: 'Gagal membuat musik' },
      { status: 500 }
    )
  }
}
