'use client'

import { Cormorant_Garamond } from 'next/font/google'
import { useAppStore } from '@/lib/store'
import AdminDashboardScreen from '@/components/admin-dashboard'
import AvatarCropDialog from '@/components/avatar-crop-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useEffect, useRef, useState } from 'react'
import { Image as PhotoGlyph, Music, MessageSquare, LogOut, LayoutDashboard, Image as ImageIcon, Disc, Sparkles, Eye, EyeOff, Camera, KeyRound, UserRound, ChevronLeft, ChevronRight } from 'lucide-react'
import { DEFAULT_SITE_CONTENT, normalizeSiteContent, SiteContentMap } from '@/lib/site-content'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

// Color classes for mini notes
const noteColors = {
  CREAM: 'bg-[#F6EFCF]',
  BLUE: 'bg-[#DCEAF6]',
  BLUSH: 'bg-[#F4D9DE]',
  SAGE: 'bg-[#E2EEDB]',
}

type CommentItem = {
  id: string | number
  content: string
  noteColor: keyof typeof noteColors
  userName: string
  createdAt: string
}

type PhotoItem = {
  id: string | number
  imageUrl: string
  caption: string | null
  order?: number
  featured?: boolean
}

type MusicItem = {
  id: string | number
  title: string
  spotifyUrl: string
  type: string
  featured: boolean
  order?: number
}

type SiteContentProps = {
  siteContent: SiteContentMap
}

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

const landingFeatureCardMeta = [
  { icon: PhotoGlyph, tone: 'bg-[#FFF7F8]' },
  { icon: Music, tone: 'bg-[#F3F8FF]' },
  { icon: MessageSquare, tone: 'bg-[#F6FBF4]' },
] as const

const memberMoodPills = [
  'album yang personal',
  'musik yang menenangkan',
  'catatan yang lembut',
]

const authShowcaseAccent = {
  login: 'bg-[#FFF7F8]',
  signup: 'bg-[#F9F6FF]',
} as const

type AuthMode = keyof typeof authShowcaseAccent

type AuthShellProps = {
  mode: AuthMode
  siteContent: SiteContentMap
  children: React.ReactNode
  footer: React.ReactNode
}

async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'Permintaan gagal')
  }

  return data as T
}

async function uploadImageFile(
  kind: 'avatar' | 'photo',
  file: File,
  onProgress?: (value: number) => void,
) {
  const formData = new FormData()
  formData.append('kind', kind)
  formData.append('file', file)

  return await new Promise<{
    publicUrl: string
    objectPath: string
  }>((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.open('POST', '/api/uploads/image')
    xhr.responseType = 'json'

    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable || !onProgress) {
        return
      }

      onProgress(Math.round((event.loaded / event.total) * 100))
    })

    xhr.addEventListener('load', () => {
      const data = xhr.response ?? {}

      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100)
        resolve(data)
        return
      }

      reject(new Error(data.error || 'Gagal mengunggah gambar'))
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Gagal mengunggah gambar'))
    })

    xhr.send(formData)
  })
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }

      reject(new Error('Gagal membaca file gambar'))
    }

    reader.onerror = () => {
      reject(new Error('Gagal membaca file gambar'))
    }

    reader.readAsDataURL(file)
  })
}

function AuthShell({ mode, siteContent, children, footer }: AuthShellProps) {
  const content = mode === 'login'
    ? {
        eyebrow: siteContent.public_login_eyebrow,
        showcaseTitle: siteContent.public_login_showcase_title,
        showcaseDescription: siteContent.public_login_showcase_description,
        quote: siteContent.public_login_showcase_quote,
        imageUrl: siteContent.public_login_image_url,
        imageAlt: siteContent.public_login_image_alt,
        cardTitle: siteContent.public_login_form_title,
        cardDescription: siteContent.public_login_form_description,
        accent: authShowcaseAccent.login,
      }
    : {
        eyebrow: siteContent.public_signup_eyebrow,
        showcaseTitle: siteContent.public_signup_showcase_title,
        showcaseDescription: siteContent.public_signup_showcase_description,
        quote: siteContent.public_signup_showcase_quote,
        imageUrl: siteContent.public_signup_image_url,
        imageAlt: siteContent.public_signup_image_alt,
        cardTitle: siteContent.public_signup_form_title,
        cardDescription: siteContent.public_signup_form_description,
        accent: authShowcaseAccent.signup,
      }

  const authHighlights = [
    {
      icon: PhotoGlyph,
      title: siteContent.public_auth_highlight_photo_title,
      description: siteContent.public_auth_highlight_photo_description,
    },
    {
      icon: Music,
      title: siteContent.public_auth_highlight_music_title,
      description: siteContent.public_auth_highlight_music_description,
    },
    {
      icon: MessageSquare,
      title: siteContent.public_auth_highlight_message_title,
      description: siteContent.public_auth_highlight_message_description,
    },
  ]

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F7F4EF] px-4 py-8 sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="landing-glow absolute left-[-7rem] top-[-5rem] h-72 w-72 rounded-full bg-[#E8BFCB]/50 blur-3xl" />
        <div className="landing-drift absolute right-[-4rem] top-[10%] h-80 w-80 rounded-full bg-[#DCEAF6]/65 blur-3xl" />
        <div className="landing-glow absolute bottom-[-6rem] right-[18%] h-72 w-72 rounded-full bg-[#E2EEDB]/55 blur-3xl" />
        <div className="landing-grid absolute inset-0 opacity-30" />
      </div>

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.02fr_0.98fr]">
        <section className="hidden lg:block">
          <div className="relative">
            <div className="landing-float-delayed absolute -left-4 top-12 w-64 rounded-[1.7rem] border border-[#EADCCF] bg-[#FFFDF9]/92 p-4 shadow-[0_22px_60px_-32px_rgba(47,42,42,0.35)] backdrop-blur">
              <p className="text-xs uppercase tracking-[0.24em] text-[#8B7676]">{content.eyebrow}</p>
              <p className={`${cormorant.className} mt-3 text-2xl leading-tight text-[#2F2A2A]`}>
                {content.showcaseTitle}
              </p>
              <p className="mt-3 text-sm leading-6 text-[#6E6666]">
                {content.showcaseDescription}
              </p>
            </div>

            <div className="landing-float-slow absolute -right-2 bottom-10 w-56 rounded-[1.7rem] border border-[#DCEAF6] bg-[#F8FBFF]/92 p-4 shadow-[0_22px_60px_-32px_rgba(47,42,42,0.35)] backdrop-blur">
              <p className="text-xs uppercase tracking-[0.24em] text-[#6E8091]">Suasana</p>
              <p className="mt-3 text-sm leading-6 text-[#6E6666]">{content.quote}</p>
            </div>

            <div className="overflow-hidden rounded-[2.5rem] border border-[#EADCCF] bg-[#FFFDF9]/92 p-4 shadow-[0_34px_90px_-45px_rgba(47,42,42,0.48)] backdrop-blur">
              <div className="overflow-hidden rounded-[2rem]">
                {content.imageUrl ? (
                  <img
                    src={content.imageUrl}
                    alt={content.imageAlt}
                    className="h-[42rem] w-full object-cover object-center"
                  />
                ) : (
                  <div className="flex h-[42rem] items-center justify-center bg-[#F7F4EF] px-8 text-center text-sm leading-7 text-[#6E6666]">
                    Foto untuk halaman ini belum ditambahkan.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="relative">
          <Card className="overflow-hidden rounded-[2.4rem] border-[#EADCCF] bg-[#FFFDF9]/95 shadow-[0_32px_90px_-45px_rgba(47,42,42,0.48)] backdrop-blur">
            <div className={`border-b border-[#EADCCF] ${content.accent} px-6 py-6 sm:px-8`}>
              <p className="text-xs uppercase tracking-[0.28em] text-[#8B7676]">{content.eyebrow}</p>
              <h1 className={`${cormorant.className} mt-4 text-4xl leading-tight text-[#2F2A2A] sm:text-5xl`}>
                {content.cardTitle}
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-[#6E6666] sm:text-base">
                {content.cardDescription}
              </p>
            </div>

            <CardContent className="space-y-8 px-6 py-6 sm:px-8 sm:py-8">
              <div className="grid gap-3 sm:grid-cols-3">
                {authHighlights.map((item) => (
                  <div key={item.title} className="rounded-[1.5rem] border border-[#EADCCF] bg-[#FFFCF8] p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFFDF9] shadow-sm">
                      <item.icon className="h-4 w-4 text-[#2F2A2A]" />
                    </div>
                    <p className="mt-4 text-sm font-medium text-[#2F2A2A]">{item.title}</p>
                    <p className="mt-2 text-xs leading-6 text-[#6E6666]">{item.description}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-6">{children}</div>

              <div className="border-t border-[#EADCCF] pt-5 text-center">{footer}</div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}

function LandingPage({ siteContent }: SiteContentProps) {
  const { setCurrentView } = useAppStore()
  const landingFeatureCards = [
    {
      ...landingFeatureCardMeta[0],
      title: siteContent.landing_feature_photo_title,
      description: siteContent.landing_feature_photo_description,
    },
    {
      ...landingFeatureCardMeta[1],
      title: siteContent.landing_feature_music_title,
      description: siteContent.landing_feature_music_description,
    },
    {
      ...landingFeatureCardMeta[2],
      title: siteContent.landing_feature_message_title,
      description: siteContent.landing_feature_message_description,
    },
  ]
  const landingMoodNotes = siteContent.landing_mood_notes
    .split('\n')
    .map((note) => note.trim())
    .filter(Boolean)
  const landingLetterParagraphs = siteContent.landing_letter_paragraphs
    .split('\n')
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
  const landingEditorialPhotos = [
    {
      imageUrl: siteContent.landing_editorial_image_one_url,
      alt: siteContent.landing_editorial_image_one_alt,
      caption: siteContent.landing_editorial_image_one_caption,
    },
    {
      imageUrl: siteContent.landing_editorial_image_two_url,
      alt: siteContent.landing_editorial_image_two_alt,
      caption: siteContent.landing_editorial_image_two_caption,
    },
  ]
  const landingVisualNotes = [
    {
      title: siteContent.landing_visual_note_one_title,
      description: siteContent.landing_visual_note_one_description,
    },
    {
      title: siteContent.landing_visual_note_two_title,
      description: siteContent.landing_visual_note_two_description,
    },
    {
      title: siteContent.landing_visual_note_three_title,
      description: siteContent.landing_visual_note_three_description,
    },
  ]

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F7F4EF]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="landing-glow absolute left-[-8rem] top-[-4rem] h-72 w-72 rounded-full bg-[#E8BFCB]/55 blur-3xl" />
        <div className="landing-drift absolute right-[-5rem] top-[12%] h-80 w-80 rounded-full bg-[#DCEAF6]/70 blur-3xl" />
        <div className="landing-glow absolute bottom-[-7rem] left-[20%] h-72 w-72 rounded-full bg-[#E2EEDB]/60 blur-3xl" />
        <div className="landing-grid absolute inset-0 opacity-40" />
      </div>

      <main className="relative z-10 flex-1 px-4 py-10 sm:px-6 lg:px-10">
        <div className="mx-auto grid min-h-[calc(100vh-8rem)] max-w-6xl items-center gap-10 lg:grid-cols-[1.02fr_0.98fr]">
          <section className="space-y-8">
            <div className="space-y-5 animate-in fade-in slide-in-from-left-4 duration-700">
              <div className="space-y-4">
                <p className="text-sm uppercase tracking-[0.32em] text-[#8B7676]">
                  {siteContent.landing_eyebrow}
                </p>
                <h1 className={`${cormorant.className} max-w-xl text-5xl leading-[0.95] tracking-[-0.04em] text-[#2F2A2A] sm:text-6xl lg:text-7xl`}>
                  {siteContent.brand_name}
                </h1>
                <p className="max-w-xl text-2xl font-light leading-snug text-[#5C5252] sm:text-3xl">
                  {siteContent.landing_tagline}
                </p>
                <p className="max-w-xl text-base leading-8 text-[#6E6666] sm:text-lg">
                  {siteContent.landing_description}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <Button
                size="lg"
                onClick={() => setCurrentView('login')}
                className="rounded-full bg-[#2F2A2A] px-8 py-6 text-base text-[#FFFDF9] shadow-[0_18px_45px_-20px_rgba(47,42,42,0.55)] hover:bg-[#2F2A2A]/92"
              >
                {siteContent.landing_primary_cta}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setCurrentView('signup')}
                className="rounded-full border border-[#D9C7C0] bg-[#FFFDF9]/80 px-8 py-6 text-base text-[#2F2A2A] shadow-sm hover:bg-[#FFF7F8]"
              >
                {siteContent.landing_secondary_cta}
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <div className="rounded-[1.75rem] border border-[#EADCCF] bg-[#FFFDF9]/90 p-5 shadow-sm">
                <p className="text-xs uppercase tracking-[0.24em] text-[#8B7676]">{siteContent.landing_preview_photo_title}</p>
                <p className="mt-3 text-lg font-serif text-[#2F2A2A]">{siteContent.landing_preview_photo_heading}</p>
                <p className="mt-2 text-sm leading-6 text-[#6E6666]">
                  {siteContent.landing_preview_photo_description}
                </p>
              </div>
              <div className="rounded-[1.75rem] border border-[#EADCCF] bg-[#FFFDF9]/90 p-5 shadow-sm">
                <p className="text-xs uppercase tracking-[0.24em] text-[#8B7676]">{siteContent.landing_preview_music_title}</p>
                <p className="mt-3 text-lg font-serif text-[#2F2A2A]">{siteContent.landing_preview_music_heading}</p>
                <p className="mt-2 text-sm leading-6 text-[#6E6666]">
                  {siteContent.landing_preview_music_description}
                </p>
              </div>
              <div className="rounded-[1.75rem] border border-[#EADCCF] bg-[#FFFDF9]/90 p-5 shadow-sm">
                <p className="text-xs uppercase tracking-[0.24em] text-[#8B7676]">{siteContent.landing_preview_message_title}</p>
                <p className="mt-3 text-lg font-serif text-[#2F2A2A]">{siteContent.landing_preview_message_heading}</p>
                <p className="mt-2 text-sm leading-6 text-[#6E6666]">
                  {siteContent.landing_preview_message_description}
                </p>
              </div>
            </div>
          </section>

          <section className="relative flex justify-center lg:justify-end">
            <div className="relative w-full max-w-[34rem]">
              <div className="landing-float-slow absolute -left-6 top-20 w-44 rounded-[1.6rem] border border-[#EADCCF] bg-[#FFFDF9]/90 p-4 shadow-[0_22px_50px_-28px_rgba(47,42,42,0.35)] backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F4D9DE]">
                    <PhotoGlyph className="h-5 w-5 text-[#2F2A2A]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#2F2A2A]">{siteContent.landing_float_photo_title}</p>
                    <p className="text-xs text-[#6E6666]">{siteContent.landing_float_photo_description}</p>
                  </div>
                </div>
              </div>

              <div className="landing-float-delayed absolute -right-4 top-10 w-52 rounded-[1.6rem] border border-[#DCEAF6] bg-[#F9FCFF]/90 p-4 shadow-[0_22px_50px_-28px_rgba(47,42,42,0.35)] backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#DCEAF6]">
                    <Music className="h-5 w-5 text-[#2F2A2A]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#2F2A2A]">{siteContent.landing_float_music_title}</p>
                    <p className="text-xs text-[#6E6666]">{siteContent.landing_float_music_description}</p>
                  </div>
                </div>
              </div>

              <div className="landing-float-slow absolute bottom-6 right-8 w-56 rounded-[1.6rem] border border-[#DCE5D7] bg-[#F9FCF7]/92 p-4 shadow-[0_22px_50px_-28px_rgba(47,42,42,0.35)] backdrop-blur">
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-[#E2EEDB]">
                    <MessageSquare className="h-4 w-4 text-[#2F2A2A]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#2F2A2A]">{siteContent.landing_float_note_title}</p>
                    <p className="mt-1 text-xs leading-5 text-[#6E6666]">
                      {siteContent.landing_float_note_description}
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative rounded-[2.4rem] border border-[#EADCCF] bg-[#FFF8F7]/85 p-3 shadow-[0_34px_90px_-38px_rgba(47,42,42,0.5)] backdrop-blur-sm">
                <div className="landing-glow absolute inset-6 rounded-[2rem] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.65),_rgba(255,255,255,0))]" />
                <div className="relative overflow-hidden rounded-[2rem] border border-[#F5E6DE] bg-[#EADCCF]">
                  {siteContent.landing_hero_image_url ? (
                    <>
                      <img
                        src={siteContent.landing_hero_image_url}
                        alt={siteContent.landing_hero_image_alt}
                        className="h-[28rem] w-full object-cover object-center sm:h-[38rem]"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#2F2A2A]/78 via-[#2F2A2A]/35 to-transparent px-6 pb-7 pt-20 text-[#FFFDF9]">
                        <p className="text-xs uppercase tracking-[0.3em] text-[#F6D8E0]">
                          {siteContent.landing_hero_overlay_eyebrow}
                        </p>
                        <p className={`${cormorant.className} mt-4 max-w-sm text-3xl leading-tight`}>
                          {siteContent.landing_hero_overlay_title}
                        </p>
                        <p className="mt-3 max-w-sm text-sm leading-6 text-[#F8F1F1]">
                          {siteContent.landing_hero_overlay_description}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="flex h-[28rem] items-center justify-center px-8 text-center text-sm leading-7 text-[#6E6666] sm:h-[38rem]">
                      Foto utama landing belum ditambahkan.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="mx-auto mt-2 max-w-6xl pb-10">
          <div className="grid gap-4 md:grid-cols-3">
            {landingFeatureCards.map((item) => (
              <div
                key={item.title}
                className={`rounded-[2rem] border border-[#EADCCF] ${item.tone} p-6 shadow-sm transition-transform duration-300 hover:-translate-y-1`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFFDF9] shadow-sm">
                  <item.icon className="h-5 w-5 text-[#2F2A2A]" />
                </div>
                <h2 className={`${cormorant.className} mt-5 text-2xl text-[#2F2A2A]`}>{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-[#6E6666]">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl pb-20">
          <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
            <div className="rounded-[2.25rem] border border-[#EADCCF] bg-[#FFFDF9]/92 p-7 shadow-[0_28px_70px_-42px_rgba(47,42,42,0.45)] backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F4D9DE]">
                  <Sparkles className="h-5 w-5 text-[#2F2A2A]" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-[#8B7676]">{siteContent.landing_editorial_eyebrow}</p>
                  <p className={`${cormorant.className} mt-1 text-2xl text-[#2F2A2A]`}>{siteContent.landing_editorial_heading}</p>
                </div>
              </div>

              <p className={`${cormorant.className} mt-7 max-w-md text-4xl leading-tight text-[#2F2A2A] sm:text-5xl`}>
                {siteContent.landing_editorial_title}
              </p>

              <p className="mt-6 max-w-lg text-sm leading-8 text-[#6E6666] sm:text-base">
                {siteContent.landing_editorial_description}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {landingMoodNotes.map((note) => (
                  <span
                    key={note}
                    className="rounded-full border border-[#EADCCF] bg-[#FFF7F8] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[#7E5E66]"
                  >
                    {note}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-6">
                {landingEditorialPhotos.map((photo, index) => (
                  <div
                    key={`${photo.imageUrl}-${index}`}
                    className={`overflow-hidden rounded-[2rem] border border-[#EADCCF] bg-[#FFFDF9] p-3 shadow-[0_24px_60px_-38px_rgba(47,42,42,0.4)] ${
                      index === 1 ? 'landing-float-delayed md:ml-8' : 'landing-float-slow'
                    }`}
                  >
                    <div className="overflow-hidden rounded-[1.45rem]">
                      {photo.imageUrl ? (
                        <img
                          src={photo.imageUrl}
                          alt={photo.alt}
                          className="h-72 w-full object-cover sm:h-80"
                        />
                      ) : (
                        <div className="flex h-72 items-center justify-center bg-[#F7F4EF] px-6 text-center text-sm leading-7 text-[#6E6666] sm:h-80">
                          Foto editorial belum ditambahkan.
                        </div>
                      )}
                    </div>
                    <p className="px-2 pb-2 pt-4 text-sm text-[#6E6666]">{photo.caption}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-6">
                <div className="rounded-[2rem] border border-[#EADCCF] bg-[linear-gradient(135deg,_rgba(255,247,248,0.96),_rgba(255,253,249,0.96))] p-7 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.26em] text-[#8B7676]">{siteContent.landing_moodboard_eyebrow}</p>
                  <p className={`${cormorant.className} mt-4 text-3xl leading-tight text-[#2F2A2A]`}>
                    {siteContent.landing_moodboard_title}
                  </p>
                  <p className="mt-4 text-sm leading-7 text-[#6E6666]">
                    {siteContent.landing_moodboard_description}
                  </p>
                </div>

                <div className="landing-float-slow rounded-[2rem] border border-[#DCEAF6] bg-[#F6FAFF] p-7 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.26em] text-[#6E8091]">{siteContent.landing_visual_notes_eyebrow}</p>
                  <div className="mt-5 space-y-4">
                    {landingVisualNotes.map((note) => (
                      <div key={note.title} className="rounded-[1.4rem] bg-[#FFFDF9] p-4">
                        <p className="text-sm font-medium text-[#2F2A2A]">{note.title}</p>
                        <p className="mt-2 text-sm leading-6 text-[#6E6666]">
                          {note.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl pb-24">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[2.3rem] border border-[#EADCCF] bg-[#FFFDF9]/95 p-8 shadow-[0_30px_70px_-42px_rgba(47,42,42,0.45)]">
              <p className="text-xs uppercase tracking-[0.28em] text-[#8B7676]">{siteContent.landing_letter_eyebrow}</p>
              <h2 className={`${cormorant.className} mt-4 max-w-lg text-4xl leading-tight text-[#2F2A2A] sm:text-5xl`}>
                {siteContent.landing_letter_title}
              </h2>

              <div className="mt-8 space-y-5 text-sm leading-8 text-[#6E6666] sm:text-base">
                {landingLetterParagraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>

              <div className="mt-8 rounded-[1.7rem] bg-[#FFF7F8] p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-[#8B7676]">{siteContent.landing_tone_label}</p>
                <p className={`${cormorant.className} mt-3 text-2xl text-[#2F2A2A]`}>
                  {siteContent.landing_tone_text}
                </p>
              </div>
            </div>

            <div className="grid gap-6">
              <div className="landing-float-delayed rounded-[2.1rem] border border-[#EADCCF] bg-[#FFF8F1] p-7 shadow-sm">
                <p className="text-xs uppercase tracking-[0.26em] text-[#9A7869]">{siteContent.landing_discover_eyebrow}</p>
                <div className="mt-5 space-y-4">
                  <div className="rounded-[1.4rem] bg-[#FFFDF9] p-4">
                    <p className="text-sm font-medium text-[#2F2A2A]">{siteContent.landing_discover_item_one_title}</p>
                    <p className="mt-2 text-sm leading-6 text-[#6E6666]">
                      {siteContent.landing_discover_item_one_description}
                    </p>
                  </div>
                  <div className="rounded-[1.4rem] bg-[#FFFDF9] p-4">
                    <p className="text-sm font-medium text-[#2F2A2A]">{siteContent.landing_discover_item_two_title}</p>
                    <p className="mt-2 text-sm leading-6 text-[#6E6666]">
                      {siteContent.landing_discover_item_two_description}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[2.1rem] border border-[#DCEAF6] bg-[#F8FBFF] p-7 shadow-sm">
                <p className="text-xs uppercase tracking-[0.26em] text-[#6E8091]">{siteContent.landing_ritual_eyebrow}</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[1.4rem] bg-[#FFFDF9] p-4">
                    <p className={`${cormorant.className} text-2xl text-[#2F2A2A]`}>01</p>
                    <p className="mt-2 text-sm font-medium text-[#2F2A2A]">{siteContent.landing_ritual_one_title}</p>
                    <p className="mt-2 text-sm leading-6 text-[#6E6666]">{siteContent.landing_ritual_one_description}</p>
                  </div>
                  <div className="rounded-[1.4rem] bg-[#FFFDF9] p-4">
                    <p className={`${cormorant.className} text-2xl text-[#2F2A2A]`}>02</p>
                    <p className="mt-2 text-sm font-medium text-[#2F2A2A]">{siteContent.landing_ritual_two_title}</p>
                    <p className="mt-2 text-sm leading-6 text-[#6E6666]">{siteContent.landing_ritual_two_description}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 py-6 text-center text-sm text-[#6E6666]">
        <p>{siteContent.footer_text}</p>
      </footer>
    </div>
  )
}

function LoginPage({ siteContent }: SiteContentProps) {
  const { setCurrentView, setUser } = useAppStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login gagal')
      }

      setUser(data.user)
      setCurrentView('home')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login gagal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      mode="login"
      siteContent={siteContent}
      footer={
        <div className="space-y-2">
          <p className="text-sm text-[#6E6666]">
            Belum punya akun?{' '}
            <button
              onClick={() => setCurrentView('signup')}
              className="font-medium text-[#2F2A2A] hover:underline"
            >
              Daftar
            </button>
          </p>
          <button
            onClick={() => setCurrentView('landing')}
            className="text-sm text-[#6E6666] hover:text-[#2F2A2A]"
          >
            Kembali ke beranda
          </button>
        </div>
      }
    >
      <form onSubmit={handleLogin} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-[#2F2A2A]">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="nama@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-12 rounded-2xl border-[#EADCCF] bg-[#FFFCF8] focus:ring-[#E8BFCB]"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-[#2F2A2A]">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-12 rounded-2xl border-[#EADCCF] bg-[#FFFCF8] pr-10 focus:ring-[#E8BFCB]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6E6666] hover:text-[#2F2A2A]"
              aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error && (
          <Alert className="rounded-2xl border-[#E8BFCB]/50 bg-[#F4D9DE]/35">
            <AlertDescription className="text-[#2F2A2A]">{error}</AlertDescription>
          </Alert>
        )}

        <Button
          type="submit"
          className="h-12 w-full rounded-2xl bg-[#2F2A2A] text-[#FFFDF9] hover:bg-[#2F2A2A]/92"
          disabled={loading}
        >
          {loading ? 'Sedang masuk...' : 'Masuk'}
        </Button>
      </form>
    </AuthShell>
  )
}

function SignupPage({ siteContent }: SiteContentProps) {
  const { setCurrentView, setUser } = useAppStore()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Password dan konfirmasi password harus sama')
      return
    }

    if (password.length < 6) {
      setError('Password minimal 6 karakter')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Pendaftaran gagal')
      }

      setUser(data.user)
      setCurrentView('home')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pendaftaran gagal')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setError('')
    setGoogleLoading(true)
    try {
      const supabase = getSupabaseBrowserClient()
      const redirectTo = `${window.location.origin}/auth/google/callback`
      const { data, error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            prompt: 'select_account',
          },
        },
      })

      if (googleError) {
        throw googleError
      }

      if (data?.url) {
        window.location.href = data.url
      }
    } catch (err) {
      setGoogleLoading(false)
      setError(err instanceof Error ? err.message : 'Pendaftaran dengan Google gagal')
    }
  }

  return (
    <AuthShell
      mode="signup"
      siteContent={siteContent}
      footer={
        <div className="space-y-2">
          <p className="text-sm text-[#6E6666]">
            Sudah punya akun?{' '}
            <button
              onClick={() => setCurrentView('login')}
              className="font-medium text-[#2F2A2A] hover:underline"
            >
              Masuk
            </button>
          </p>
          <button
            onClick={() => setCurrentView('landing')}
            className="text-sm text-[#6E6666] hover:text-[#2F2A2A]"
          >
            Kembali ke beranda
          </button>
        </div>
      }
    >
      <form onSubmit={handleSignup} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-[#2F2A2A]">Nama</Label>
          <Input
            id="name"
            type="text"
            placeholder="Nama kamu"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="h-12 rounded-2xl border-[#EADCCF] bg-[#FFFCF8] focus:ring-[#E8BFCB]"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-[#2F2A2A]">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="nama@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-12 rounded-2xl border-[#EADCCF] bg-[#FFFCF8] focus:ring-[#E8BFCB]"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-[#2F2A2A]">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-12 rounded-2xl border-[#EADCCF] bg-[#FFFCF8] pr-10 focus:ring-[#E8BFCB]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6E6666] hover:text-[#2F2A2A]"
              aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-[#2F2A2A]">Konfirmasi Password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="h-12 rounded-2xl border-[#EADCCF] bg-[#FFFCF8] pr-10 focus:ring-[#E8BFCB]"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6E6666] hover:text-[#2F2A2A]"
              aria-label={showConfirmPassword ? 'Sembunyikan konfirmasi password' : 'Tampilkan konfirmasi password'}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error && (
          <Alert className="rounded-2xl border-[#E8BFCB]/50 bg-[#F4D9DE]/35">
            <AlertDescription className="text-[#2F2A2A]">{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-3">
          <Button
            type="submit"
            className="h-12 w-full rounded-2xl bg-[#2F2A2A] text-[#FFFDF9] hover:bg-[#2F2A2A]/92"
            disabled={loading}
          >
            {loading ? 'Sedang membuat akun...' : 'Daftar'}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignup}
            className="h-12 w-full rounded-2xl border-[#EADCCF] bg-[#FFFDF9] text-[#2F2A2A] hover:bg-[#FFF7F8]"
            disabled={googleLoading}
          >
            {googleLoading ? 'Menghubungkan Google...' : 'Daftar dengan Google'}
          </Button>
        </div>
      </form>
    </AuthShell>
  )
}

function AmbientBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="landing-glow absolute left-[-7rem] top-[-5rem] h-72 w-72 rounded-full bg-[#E8BFCB]/45 blur-3xl" />
      <div className="landing-drift absolute right-[-4rem] top-[12%] h-80 w-80 rounded-full bg-[#DCEAF6]/60 blur-3xl" />
      <div className="landing-glow absolute bottom-[-7rem] left-[18%] h-72 w-72 rounded-full bg-[#E2EEDB]/50 blur-3xl" />
      <div className="landing-grid absolute inset-0 opacity-25" />
    </div>
  )
}

function canCurrentUserSendMessages(
  user: {
    role: string
    approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED'
    isActive?: boolean
  } | null,
) {
  if (!user) {
    return false
  }

  if (user.role !== 'USER') {
    return true
  }

  return user.isActive !== false && user.approvalStatus === 'APPROVED'
}

function getMessageAccessNotice(
  user: {
    role: string
    approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED'
    isActive?: boolean
  } | null,
) {
  if (!user || user.role !== 'USER') {
    return ''
  }

  if (user.isActive === false) {
    return 'Akun kamu sedang dinonaktifkan admin.'
  }

  if (user.approvalStatus === 'REJECTED') {
    return 'Akun kamu ditolak admin dan belum bisa mengirim pesan.'
  }

  if (user.approvalStatus !== 'APPROVED') {
    return 'Akun kamu masih menunggu persetujuan admin. Setelah diterima, kamu baru bisa mengirim pesan.'
  }

  return ''
}

function Header({ siteContent = DEFAULT_SITE_CONTENT }: Partial<SiteContentProps>) {
  const { currentView, user, setCurrentView, logout, isAdmin, isSuperAdmin } = useAppStore()

  const setView = (view: 'home' | 'gallery' | 'music' | 'messages' | 'profile' | 'admin') => {
    setCurrentView(view)

    if (typeof window === 'undefined') {
      return
    }

    const nextUrl = view === 'admin' ? '/?view=admin' : '/'
    window.history.replaceState(null, '', nextUrl)
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      })
    } catch (error) {
      console.error('Failed to clear session cookie:', error)
    } finally {
      logout()
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', '/')
      }
    }
  }

  return (
    <header className="sticky top-0 z-50 px-4 pt-4 sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 rounded-[2rem] border border-[#EADCCF] bg-[#FFFDF9]/88 px-4 py-3 shadow-[0_18px_45px_-28px_rgba(47,42,42,0.35)] backdrop-blur">
        <div className="flex min-w-0 items-center gap-4">
          <button
            onClick={() => setView('home')}
            className="min-w-0 text-left"
          >
            <p className={`${cormorant.className} text-3xl leading-none text-[#2F2A2A] transition hover:opacity-70`}>
              {siteContent.brand_name}
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.26em] text-[#8B7676]">
              ruang pribadi
            </p>
          </button>
        </div>

        <nav className="flex flex-wrap items-center gap-2">
          {([
            { view: 'home', label: 'Beranda' },
            { view: 'gallery', label: 'Galeri' },
            { view: 'music', label: 'Musik' },
            { view: 'messages', label: 'Pesan' },
          ] as const).map((item) => (
            <button
              key={item.view}
              onClick={() => setView(item.view)}
              data-active={currentView === item.view}
              className={`nav-pill rounded-full px-4 py-2 text-sm ${
                currentView === item.view
                  ? 'bg-[#2F2A2A] text-[#FFFDF9]'
                  : 'text-[#6E6666] hover:bg-[#FFF7F8] hover:text-[#2F2A2A]'
              }`}
            >
              {item.label}
            </button>
          ))}
          {(isAdmin() || isSuperAdmin()) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView('admin')}
              className="rounded-full text-[#6E6666] hover:bg-[#EADCCF]/50 hover:text-[#2F2A2A]"
            >
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Admin
            </Button>
          )}

          <Separator orientation="vertical" className="hidden h-6 bg-[#EADCCF] md:block" />
          <div className="flex items-center gap-2 rounded-full border border-[#EADCCF] bg-[#FFFCF8] px-2 py-1">
            <button
              type="button"
              onClick={() => setView('profile')}
              className={`flex items-center gap-2 rounded-full px-2 py-1 transition ${
                currentView === 'profile'
                  ? 'bg-[#FFF7F8]'
                  : 'hover:bg-[#FFF7F8]'
              }`}
            >
              <Avatar className="h-9 w-9 bg-[#E8BFCB]/30">
                <AvatarImage src={user?.avatarUrl || undefined} alt={user?.name || user?.email} />
                <AvatarFallback className="text-[#2F2A2A] font-medium">
                  {user?.name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-medium text-[#2F2A2A]">{user?.name || 'Pengguna Awrella'}</p>
                <p className="text-xs text-[#6E6666]">profil & akun</p>
              </div>
            </button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void handleLogout()}
              className="rounded-full text-[#6E6666] hover:bg-[#F4D9DE]/30 hover:text-[#2F2A2A]"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:ml-2 sm:inline">Keluar</span>
            </Button>
          </div>
        </nav>
      </div>
    </header>
  )
}

function useMessageWall(limit = 12) {
  const { user } = useAppStore()
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [comments, setComments] = useState<CommentItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [commentsReady, setCommentsReady] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const canSendMessages = canCurrentUserSendMessages(user)
  const messageAccessNotice = getMessageAccessNotice(user)

  const loadComments = async () => {
    try {
      const endpoint = limit > 0 ? `/api/comments?limit=${limit}` : '/api/comments'
      const response = await fetch(endpoint)
      if (!response.ok) {
        throw new Error('Gagal memuat komentar')
      }

      const data = await response.json()
      const apiComments = Array.isArray(data.comments) ? data.comments : []
      setComments(apiComments)
      setTotalCount(typeof data.totalCount === 'number' ? data.totalCount : apiComments.length)
      setLoadError('')
    } catch (error) {
      console.error('Error loading comments:', error)
      setComments([])
      setTotalCount(0)
      setLoadError('Pesan belum bisa dimuat sekarang. Coba beberapa saat lagi.')
    } finally {
      setCommentsReady(true)
    }
  }

  useEffect(() => {
    setCommentsReady(false)
    void loadComments()
  }, [limit])

  const handleSubmitComment = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!comment.trim() || comment.length > 150 || !user || !canSendMessages) {
      return
    }

    setLoading(true)
    setSubmitError('')

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: comment.trim(),
          noteColor: ['CREAM', 'BLUE', 'BLUSH', 'SAGE'][Math.floor(Math.random() * 4)],
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Gagal mengirim komentar')
      }

      setComment('')
      await loadComments()
    } catch (error) {
      console.error('Error posting comment:', error)
      setSubmitError(error instanceof Error ? error.message : 'Gagal mengirim komentar')
    } finally {
      setLoading(false)
    }
  }

  return {
    comment,
    comments,
    handleSubmitComment,
    loading,
    canSendMessages,
    commentsReady,
    loadError,
    messageAccessNotice,
    setComment,
    submitError,
    totalCount,
  }
}

function useMusicLibrary() {
  const [musicItems, setMusicItems] = useState<MusicItem[]>([])
  const [musicReady, setMusicReady] = useState(false)
  const [musicError, setMusicError] = useState<string | null>(null)

  useEffect(() => {
    const loadMusic = async () => {
      try {
        const response = await fetch('/api/music', { cache: 'no-store' })
        if (!response.ok) {
          throw new Error('Gagal memuat musik')
        }

        const data = await response.json()
        const apiMusic = Array.isArray(data.musicItems) ? data.musicItems : []
        setMusicItems(apiMusic)
        setMusicError(null)
      } catch (error) {
        console.error('Error loading music:', error)
        setMusicItems([])
        setMusicError('Koleksi musik belum bisa dimuat sekarang.')
      } finally {
        setMusicReady(true)
      }
    }

    void loadMusic()

    const handleMusicUpdated = () => {
      void loadMusic()
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'awrella-music-updated-at') {
        void loadMusic()
      }
    }

    window.addEventListener('awrella-music-updated', handleMusicUpdated)
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener('awrella-music-updated', handleMusicUpdated)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  return {
    musicItems,
    musicReady,
    musicError,
  }
}

function HomePage({ siteContent }: SiteContentProps) {
  const { user, setCurrentView } = useAppStore()
  const {
    comment,
    comments,
    handleSubmitComment,
    loading,
    canSendMessages,
    commentsReady,
    loadError,
    messageAccessNotice,
    setComment,
    submitError,
    totalCount,
  } = useMessageWall(6)
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [photoTotalCount, setPhotoTotalCount] = useState(0)
  const [photosReady, setPhotosReady] = useState(false)
  const { musicItems, musicReady, musicError } = useMusicLibrary()
  const musicCarouselRef = useRef<HTMLDivElement | null>(null)
  const [activeMusicIndex, setActiveMusicIndex] = useState(0)
  const musicSwipeStep = 252
  const featuredMusic = musicItems.find((item) => item.featured) || musicItems[0]
  const homeMusicItems = featuredMusic
    ? [featuredMusic, ...musicItems.filter((item) => String(item.id) !== String(featuredMusic.id))]
    : musicItems
  const activeMusicItem = homeMusicItems[activeMusicIndex] || homeMusicItems[0] || null
  const featuredPhoto = photos[0] ?? null
  const recentPhotos = photos.slice(1, 5)
  const favoriteItems = siteContent.favorites_items
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)

  const loadPhotos = async () => {
    try {
      const response = await fetch('/api/photos?limit=5')
      if (!response.ok) {
        throw new Error('Gagal memuat foto')
      }

      const data = await response.json()
      const apiPhotos = Array.isArray(data.photos) ? data.photos : []
      setPhotos(apiPhotos)
      setPhotoTotalCount(typeof data.totalCount === 'number' ? data.totalCount : apiPhotos.length)
    } catch (err) {
      console.error('Error loading photos:', err)
      setPhotos([])
      setPhotoTotalCount(0)
    } finally {
      setPhotosReady(true)
    }
  }

  useEffect(() => {
    void loadPhotos()
  }, [])

  useEffect(() => {
    if (activeMusicIndex >= homeMusicItems.length) {
      setActiveMusicIndex(0)
    }
  }, [activeMusicIndex, homeMusicItems.length])

  const scrollMusicCarouselTo = (nextIndex: number) => {
    const container = musicCarouselRef.current
    if (!container || homeMusicItems.length === 0) {
      return
    }

    const boundedIndex = Math.max(0, Math.min(nextIndex, homeMusicItems.length - 1))
    setActiveMusicIndex(boundedIndex)
    container.scrollTo({
      left: boundedIndex * musicSwipeStep,
      behavior: 'smooth',
    })
  }

  const handleMusicCarouselScroll = () => {
    const container = musicCarouselRef.current
    if (!container) {
      return
    }

    const nextIndex = Math.round(container.scrollLeft / musicSwipeStep)
    if (nextIndex !== activeMusicIndex) {
      setActiveMusicIndex(Math.max(0, Math.min(nextIndex, homeMusicItems.length - 1)))
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F7F4EF]">
      <AmbientBackdrop />
      <Header siteContent={siteContent} />

      <main className="relative z-10 flex-1 px-4 pb-20 pt-8 sm:px-6 lg:px-10">
        <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-6 rounded-[2.5rem] border border-[#EADCCF] bg-[#FFFDF9]/92 p-7 shadow-[0_30px_80px_-44px_rgba(47,42,42,0.45)] backdrop-blur">
            <p className="text-xs uppercase tracking-[0.28em] text-[#8B7676]">
              Halo, {user?.name || user?.email?.split('@')[0] || 'teman kecil'}
            </p>
            <div className="space-y-4">
              <h1 className={`${cormorant.className} max-w-2xl text-5xl leading-[0.95] text-[#2F2A2A] sm:text-6xl`}>
                {siteContent.home_title}
              </h1>
              <p className="max-w-2xl text-base leading-8 text-[#6E6666] sm:text-lg">
                {siteContent.home_description}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {memberMoodPills.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-[#EADCCF] bg-[#FFF7F8] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[#7E5E66]"
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Foto tersimpan', value: photoTotalCount },
                { label: 'Nada favorit', value: musicReady ? musicItems.length : 0 },
                { label: 'Pesan hangat', value: totalCount },
              ].map((item) => (
                <div key={item.label} className="rounded-[1.7rem] border border-[#EADCCF] bg-[#FFFCF8] p-5">
                  <p className="text-xs uppercase tracking-[0.22em] text-[#8B7676]">{item.label}</p>
                  <p className={`${cormorant.className} mt-3 text-4xl text-[#2F2A2A]`}>{item.value}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={() => setCurrentView('gallery')}
                className="rounded-full bg-[#2F2A2A] px-7 py-6 text-[#FFFDF9] hover:bg-[#2F2A2A]/92"
              >
                Masuk ke galeri
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentView('music')}
                className="rounded-full border-[#EADCCF] bg-[#FFFDF9] px-7 py-6 text-[#2F2A2A] hover:bg-[#FFF7F8]"
              >
                Dengarkan koleksi musik
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="landing-float-delayed absolute -left-3 top-10 w-52 rounded-[1.7rem] border border-[#EADCCF] bg-[#FFFDF9]/92 p-4 shadow-[0_22px_60px_-32px_rgba(47,42,42,0.35)] backdrop-blur">
              <p className="text-xs uppercase tracking-[0.22em] text-[#8B7676]">Tentang ruang ini</p>
              <p className="mt-3 text-sm leading-6 text-[#6E6666]">
                Halaman dalam dibuat lebih tenang, seperti masuk ke kamar pribadi yang penuh kenangan kecil.
              </p>
            </div>

            <div className="overflow-hidden rounded-[2.5rem] border border-[#EADCCF] bg-[#FFFDF9]/92 p-4 shadow-[0_32px_90px_-45px_rgba(47,42,42,0.48)] backdrop-blur">
              <div className="overflow-hidden rounded-[2rem]">
                {siteContent.landing_hero_image_url ? (
                  <img
                    src={siteContent.landing_hero_image_url}
                    alt={siteContent.landing_hero_image_alt}
                    className="h-[34rem] w-full object-cover object-center"
                  />
                ) : (
                  <div className="flex h-[34rem] items-center justify-center bg-[#F7F4EF] px-8 text-center text-sm leading-7 text-[#6E6666]">
                    Foto profil utama belum ditambahkan.
                  </div>
                )}
              </div>
              <div className="grid gap-4 px-2 pb-2 pt-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[#8B7676]">{siteContent.about_title}</p>
                  <p className={`${cormorant.className} mt-3 text-3xl leading-tight text-[#2F2A2A]`}>
                    Ruang yang disusun untuk rasa yang lembut dan personal.
                  </p>
                </div>
                <div className="rounded-[1.7rem] bg-[#FFF7F8] p-5">
                  <p className="text-sm leading-7 text-[#6E6666]">{siteContent.about_description}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-8 grid max-w-6xl gap-6 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="rounded-[2.3rem] border border-[#EADCCF] bg-[#FFFDF9]/92 p-7 shadow-sm">
            <p className="text-xs uppercase tracking-[0.24em] text-[#8B7676]">Favorit</p>
            <h2 className={`${cormorant.className} mt-3 text-4xl text-[#2F2A2A]`}>{siteContent.favorites_title}</h2>
            <div className="mt-6 grid gap-3">
              {favoriteItems.map((item, index) => (
                <div
                  key={`${item}-${index}`}
                  className="rounded-[1.6rem] bg-[#F7F4EF] px-5 py-4 text-sm leading-7 text-[#2F2A2A]"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2.3rem] border border-[#DCEAF6] bg-[#F8FBFF]/92 p-7 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#2F2A2A]" />
                <p className="text-xs uppercase tracking-[0.24em] text-[#6E8091]">Nada hari ini</p>
              </div>
              {homeMusicItems.length > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => scrollMusicCarouselTo(activeMusicIndex - 1)}
                    disabled={activeMusicIndex === 0}
                    className="h-10 w-10 rounded-full border-[#DCEAF6] bg-[#FFFDF9] text-[#2F2A2A] hover:bg-[#EEF5FD] disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => scrollMusicCarouselTo(activeMusicIndex + 1)}
                    disabled={activeMusicIndex >= homeMusicItems.length - 1}
                    className="h-10 w-10 rounded-full border-[#DCEAF6] bg-[#FFFDF9] text-[#2F2A2A] hover:bg-[#EEF5FD] disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <h2 className={`${cormorant.className} mt-3 text-4xl text-[#2F2A2A]`}>{siteContent.featured_music_title}</h2>
            <div className="mt-6 rounded-[1.9rem] border border-[#EADCCF] bg-[#FFFDF9] p-5">
              <div className="aspect-video overflow-hidden rounded-[1.4rem] bg-[#2F2A2A]">
                {activeMusicItem ? (
                  <iframe
                    src={activeMusicItem.spotifyUrl}
                    className="h-full w-full"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                  />
                ) : musicError ? (
                  <div className="flex h-full w-full items-center justify-center px-6 text-center text-sm leading-7 text-[#FFFDF9]">
                    {musicError}
                  </div>
                ) : !musicReady ? (
                  <div className="flex h-full w-full items-center justify-center px-6 text-center text-sm leading-7 text-[#FFFDF9]">
                    Koleksi musik sedang disiapkan.
                  </div>
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-[#FFFDF9]">
                    Belum ada musik pilihan
                  </div>
                )}
              </div>
              <div className="mt-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-[#2F2A2A]">
                    {activeMusicItem?.title || (musicError ? 'Koleksi musik belum siap' : 'Tambahkan daftar putar unggulan')}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[#6E8091]">
                    {activeMusicItem ? (activeMusicItem.type === 'playlist' ? 'daftar putar' : 'lagu unggulan') : 'koleksi spotify'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {homeMusicItems.length > 1 && (
                    <div className="flex items-center gap-2">
                      {homeMusicItems.map((item, index) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => scrollMusicCarouselTo(index)}
                          aria-label={`Pindah ke musik ${index + 1}`}
                          className={`h-2.5 rounded-full transition-all duration-300 ${
                            index === activeMusicIndex ? 'w-7 bg-[#E8BFCB]' : 'w-2.5 bg-[#D7E6F4]'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                  {activeMusicItem?.featured && (
                    <Badge className="bg-[#E8BFCB] text-[#2F2A2A]">Unggulan</Badge>
                  )}
                </div>
              </div>
              {homeMusicItems.length > 1 && (
                <div
                  ref={musicCarouselRef}
                  onScroll={handleMusicCarouselScroll}
                  className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {homeMusicItems.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => scrollMusicCarouselTo(index)}
                      className={`min-w-[15rem] snap-start rounded-[1.35rem] border px-4 py-4 text-left transition-all duration-300 ${
                        index === activeMusicIndex
                          ? 'border-[#E8BFCB] bg-[#FFF7F8] shadow-[0_18px_34px_-24px_rgba(47,42,42,0.5)]'
                          : 'border-[#DCEAF6] bg-[#F4F9FF] hover:border-[#BFD4EA]'
                      }`}
                    >
                      <p className="text-xs uppercase tracking-[0.18em] text-[#6E8091]">
                        {item.type === 'playlist' ? 'daftar putar' : 'lagu'}
                      </p>
                      <p className={`${cormorant.className} mt-2 text-2xl leading-tight text-[#2F2A2A]`}>
                        {item.title}
                      </p>
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <span className="text-xs text-[#6E6666]">
                          {index + 1} / {homeMusicItems.length}
                        </span>
                        {item.featured && <Badge className="bg-[#E8BFCB] text-[#2F2A2A]">Unggulan</Badge>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {homeMusicItems.length > 1 && (
                <p className="mt-4 text-xs uppercase tracking-[0.2em] text-[#6E8091]">
                  Swipe untuk berpindah lagu • {activeMusicIndex + 1} dari {homeMusicItems.length}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="mx-auto mt-8 max-w-6xl rounded-[2.4rem] border border-[#EADCCF] bg-[#FFFDF9]/92 p-7 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#8B7676]">{siteContent.recent_photos_title}</p>
              <h2 className={`${cormorant.className} mt-3 text-4xl text-[#2F2A2A]`}>Album visual yang terasa dekat</h2>
            </div>
            <Button
              variant="outline"
              onClick={() => setCurrentView('gallery')}
              className="rounded-full border-[#EADCCF] bg-[#FFFDF9] text-[#2F2A2A] hover:bg-[#FFF7F8]"
            >
              {siteContent.recent_photos_cta}
            </Button>
          </div>

          <div className="mt-7 grid items-start gap-4 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
            {featuredPhoto ? (
              <div className="w-full max-w-[24rem] overflow-hidden rounded-[2rem] border border-[#EADCCF] bg-[#FFFDF9] p-3 shadow-sm">
                <div className="overflow-hidden rounded-[1.4rem] bg-[#EADCCF]">
                  <img
                    src={featuredPhoto.imageUrl}
                    alt={featuredPhoto.caption || 'Foto utama'}
                    loading="eager"
                    decoding="async"
                    className="aspect-[4/5] w-full object-cover"
                  />
                </div>
                <div className="px-2 pb-2 pt-4 text-sm text-[#6E6666]">
                  {featuredPhoto.caption || 'Foto terbaru akan tampil di sini.'}
                </div>
              </div>
            ) : (
              <div className="flex aspect-[4/5] w-full max-w-[24rem] items-center justify-center rounded-[2rem] border border-dashed border-[#EADCCF] bg-[#FFFCF8] p-8 text-center">
                <div className="max-w-sm space-y-3">
                  <p className="text-xs uppercase tracking-[0.22em] text-[#8B7676]">
                    {photosReady ? 'Belum ada foto' : 'Menyiapkan galeri'}
                  </p>
                  <p className={`${cormorant.className} text-3xl text-[#2F2A2A]`}>
                    {photosReady ? 'Album visual akan muncul setelah foto pertama diunggah.' : 'Foto-foto terbaru sedang dimuat.'}
                  </p>
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              {recentPhotos.length > 0 ? (
                recentPhotos.map((photo) => (
                  <button
                    key={photo.id}
                    type="button"
                    className="group overflow-hidden rounded-[1.8rem] border border-[#EADCCF] bg-[#FFFDF9] p-2.5 text-left shadow-sm transition-transform duration-300 hover:-translate-y-1"
                    onClick={() => setCurrentView('gallery')}
                  >
                    <div className="overflow-hidden rounded-[1.2rem]">
                      <img
                        src={photo.imageUrl}
                        alt={photo.caption || 'Foto'}
                        loading="lazy"
                        decoding="async"
                        className="aspect-[4/5] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    </div>
                    <p className="px-1 pb-1 pt-4 text-sm text-[#6E6666]">{photo.caption || 'Momen kecil yang disimpan'}</p>
                  </button>
                ))
              ) : (
                <div className="rounded-[1.8rem] border border-dashed border-[#EADCCF] bg-[#FFFCF8] p-5 text-sm leading-7 text-[#6E6666] sm:col-span-2">
                  {photosReady
                    ? 'Belum ada susunan foto tambahan. Saat album mulai terisi, preview kecil akan muncul di sini.'
                    : 'Preview foto tambahan sedang disiapkan.'}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mx-auto mt-8 grid max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[2.3rem] border border-[#EADCCF] bg-[#FFFDF9]/92 p-7 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[#8B7676]">{siteContent.message_wall_title}</p>
                <h2 className={`${cormorant.className} mt-3 text-4xl text-[#2F2A2A]`}>Tinggalkan pesan yang lembut</h2>
                <p className="mt-3 max-w-lg text-sm leading-7 text-[#6E6666]">
                  Dinding pesan ini dibuat untuk kata-kata kecil yang hangat. Tidak perlu panjang, cukup yang terasa jujur.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setCurrentView('messages')}
                className="rounded-full border-[#EADCCF] bg-[#FFFDF9] text-[#2F2A2A] hover:bg-[#FFF7F8]"
              >
                Buka halaman pesan
              </Button>
            </div>

            {messageAccessNotice && (
              <Alert className="mt-6 border-[#EADCCF] bg-[#FFF7F8]">
                <AlertDescription className="text-[#2F2A2A]">{messageAccessNotice}</AlertDescription>
              </Alert>
            )}

            {submitError && (
              <Alert className="mt-4 border-[#F4D9DE] bg-[#F4D9DE]/35">
                <AlertDescription className="text-[#2F2A2A]">{submitError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmitComment} className="mt-6 space-y-4">
              <Textarea
                placeholder={siteContent.message_wall_placeholder}
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, 150))}
                maxLength={150}
                disabled={!canSendMessages}
                className="min-h-[150px] rounded-[1.7rem] border-[#EADCCF] bg-[#FFFCF8] resize-none px-5 py-4 focus:ring-[#E8BFCB]"
                rows={4}
              />
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[#8B7676]">{comment.length}/150 karakter</p>
                <Button
                  type="submit"
                  className="rounded-full bg-[#2F2A2A] px-6 py-5 text-[#FFFDF9] hover:bg-[#2F2A2A]/92"
                  disabled={loading || !comment.trim() || !canSendMessages}
                >
                  Kirim pesan
                </Button>
              </div>
            </form>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {comments.length > 0 ? (
              comments.map((item, index) => (
                <div
                  key={item.id}
                  className={`${noteColors[item.noteColor]} ${index % 3 === 1 ? 'sm:translate-y-6' : ''} rounded-[1.8rem] p-5 shadow-sm transition-transform duration-300 hover:-translate-y-1`}
                >
                  <p className="text-sm leading-7 text-[#2F2A2A]">{item.content}</p>
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <span className="text-xs font-medium uppercase tracking-[0.16em] text-[#6E6666]">{item.userName}</span>
                    <span className="text-xs text-[#6E6666]/75">{item.createdAt}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.8rem] border border-dashed border-[#EADCCF] bg-[#FFFCF8] p-5 text-sm leading-7 text-[#6E6666] sm:col-span-2">
                {loadError
                  ? loadError
                  : commentsReady
                    ? 'Belum ada pesan hangat yang tampil. Saat pesan pertama masuk, catatan kecilnya akan muncul di sini.'
                    : 'Pesan-pesan terbaru sedang disiapkan.'}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer siteContent={siteContent} />
    </div>
  )
}

function MessagePage({ siteContent }: SiteContentProps) {
  const {
    comment,
    comments,
    handleSubmitComment,
    loading,
    canSendMessages,
    commentsReady,
    loadError,
    messageAccessNotice,
    setComment,
    submitError,
    totalCount,
  } = useMessageWall(13)
  const { setCurrentView } = useAppStore()
  const featuredMessage = comments[0] ?? null
  const archiveMessages = comments.slice(featuredMessage ? 1 : 0)

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F7F4EF]">
      <AmbientBackdrop />
      <Header siteContent={siteContent} />

      <main className="relative z-10 flex-1 px-4 pb-20 pt-8 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <section className="grid gap-6 lg:grid-cols-[1.03fr_0.97fr]">
            <div className="rounded-[2.4rem] border border-[#EADCCF] bg-[#FFFDF9]/92 p-7 shadow-sm">
              <p className="text-xs uppercase tracking-[0.24em] text-[#8B7676]">{siteContent.message_wall_title}</p>
              <h1 className={`${cormorant.className} mt-3 max-w-3xl text-5xl leading-[0.98] text-[#2F2A2A] sm:text-6xl`}>
                {siteContent.messages_page_heading}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-8 text-[#6E6666] sm:text-base">
                {siteContent.messages_page_description}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <span className="rounded-full border border-[#EADCCF] bg-[#FFF7F8] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[#7E5E66]">
                  {totalCount} pesan tersimpan
                </span>
                <span className="rounded-full border border-[#DCEAF6] bg-[#F6FAFF] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[#6E8091]">
                  menampilkan {comments.length} pesan terbaru
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentView('home')}
                  className="rounded-full border border-[#EADCCF] bg-[#FFFDF9] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[#2F2A2A] transition hover:bg-[#FFF7F8]"
                >
                  kembali ke beranda
                </button>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[2.3rem] border border-[#EADCCF] bg-[#FFFDF9]/92 p-6 shadow-sm">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#2F2A2A]" />
                  <p className="text-xs uppercase tracking-[0.22em] text-[#8B7676]">Pesan pembuka</p>
                </div>
                {featuredMessage ? (
                  <>
                    <p className={`${cormorant.className} mt-4 text-3xl leading-tight text-[#2F2A2A]`}>
                      "{featuredMessage.content}"
                    </p>
                    <div className="mt-5 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.16em] text-[#6E6666]">
                      <span>{featuredMessage.userName}</span>
                      <span>{featuredMessage.createdAt}</span>
                    </div>
                  </>
                ) : (
                  <p className="mt-4 text-sm leading-7 text-[#6E6666]">
                    Belum ada pesan yang masuk. Saat pesan pertama ditulis, catatan itu akan tampil di sini sebagai pembuka suasana.
                  </p>
                )}
              </div>

              <div className="landing-float-slow rounded-[2.3rem] border border-[#DCEAF6] bg-[#F6FAFF]/94 p-6 shadow-sm">
                <p className="text-xs uppercase tracking-[0.22em] text-[#6E8091]">Arah suasana</p>
                <p className={`${cormorant.className} mt-3 text-3xl leading-tight text-[#2F2A2A]`}>
                  Hangat, singkat, dan terasa seperti surat kecil.
                </p>
                <div className="mt-5 grid gap-3 text-sm leading-7 text-[#6E6666]">
                  <p>Tuliskan satu kalimat yang jujur, tidak perlu panjang.</p>
                  <p>Pesan terbaru tampil duluan agar halaman selalu terasa hidup.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-8 grid items-start gap-6 lg:grid-cols-[0.94fr_1.06fr]">
            <div className="rounded-[2.3rem] border border-[#EADCCF] bg-[#FFFDF9]/92 p-7 shadow-sm">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-[#2F2A2A]" />
                <p className="text-xs uppercase tracking-[0.24em] text-[#8B7676]">Tulis pesan</p>
              </div>
              <h2 className={`${cormorant.className} mt-4 text-4xl text-[#2F2A2A]`}>
                Sisakan satu kalimat yang ingin tinggal lebih lama.
              </h2>
              <p className="mt-3 text-sm leading-7 text-[#6E6666]">
                Kamu tidak perlu menulis panjang. Satu kalimat kecil yang tulus sudah cukup untuk membuat halaman ini terasa hidup.
              </p>
              <div className="mt-5 rounded-[1.6rem] border border-[#EADCCF] bg-[#FFF7F8] px-5 py-4 text-sm leading-7 text-[#6E6666]">
                Hindari pesan yang terlalu panjang. Jaga tetap lembut, sederhana, dan personal.
              </div>

              {messageAccessNotice && (
                <Alert className="mt-5 border-[#EADCCF] bg-[#FFF7F8]">
                  <AlertDescription className="text-[#2F2A2A]">{messageAccessNotice}</AlertDescription>
                </Alert>
              )}

              {submitError && (
                <Alert className="mt-5 border-[#F4D9DE] bg-[#F4D9DE]/35">
                  <AlertDescription className="text-[#2F2A2A]">{submitError}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmitComment} className="mt-6 space-y-4">
                <Textarea
                  placeholder={siteContent.message_wall_placeholder}
                  value={comment}
                  onChange={(event) => setComment(event.target.value.slice(0, 150))}
                  maxLength={150}
                  disabled={!canSendMessages}
                  className="min-h-[180px] rounded-[1.7rem] border-[#EADCCF] bg-[#FFFCF8] resize-none px-5 py-4 focus:ring-[#E8BFCB]"
                  rows={5}
                />
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8B7676]">{comment.length}/150 karakter</p>
                  <Button
                    type="submit"
                    className="rounded-full bg-[#2F2A2A] px-6 py-5 text-[#FFFDF9] hover:bg-[#2F2A2A]/92"
                    disabled={loading || !comment.trim() || !canSendMessages}
                  >
                    Kirim pesan
                  </Button>
                </div>
              </form>
            </div>

            <div className="rounded-[2.3rem] border border-[#EADCCF] bg-[#FFFDF9]/92 p-7 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[#8B7676]">Arsip terbaru</p>
                  <h2 className={`${cormorant.className} mt-3 text-4xl text-[#2F2A2A]`}>
                    Catatan kecil yang tersusun rapi dan bergerak pelan.
                  </h2>
                </div>
                <Badge className="w-fit bg-[#E8BFCB] text-[#2F2A2A]">ringan dan terbaru dulu</Badge>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {archiveMessages.length > 0 ? (
                  archiveMessages.map((item, index) => (
                    <div
                      key={item.id}
                      className={`message-note-rise ${noteColors[item.noteColor]} ${
                        index % 4 === 1 ? 'sm:translate-y-8' : index % 4 === 3 ? 'sm:-translate-y-4' : ''
                      } rounded-[1.9rem] p-5 shadow-sm transition-transform duration-500 hover:-translate-y-1.5`}
                      style={{ animationDelay: `${index * 70}ms` }}
                    >
                      <p className="text-sm leading-7 text-[#2F2A2A]">{item.content}</p>
                      <div className="mt-5 flex items-center justify-between gap-3">
                        <span className="text-xs font-medium uppercase tracking-[0.16em] text-[#6E6666]">{item.userName}</span>
                        <span className="text-xs text-[#6E6666]/75">{item.createdAt}</span>
                      </div>
                    </div>
                  ))
                ) : loadError ? (
                  <div className="rounded-[1.9rem] border border-dashed border-[#EADCCF] bg-[#FFFCF8] p-6 text-sm leading-7 text-[#6E6666] sm:col-span-2">
                    {loadError}
                  </div>
                ) : !commentsReady ? (
                  <div className="rounded-[1.9rem] border border-dashed border-[#EADCCF] bg-[#FFFCF8] p-6 text-sm leading-7 text-[#6E6666] sm:col-span-2">
                    Arsip pesan sedang dimuat.
                  </div>
                ) : featuredMessage ? (
                  <div className="rounded-[1.9rem] border border-dashed border-[#EADCCF] bg-[#FFFCF8] p-6 text-sm leading-7 text-[#6E6666] sm:col-span-2">
                    Saat ini baru ada satu pesan pembuka. Pesan berikutnya akan muncul di bagian arsip ini.
                  </div>
                ) : (
                  <div className="rounded-[1.9rem] border border-dashed border-[#EADCCF] bg-[#FFFCF8] p-6 text-sm leading-7 text-[#6E6666] sm:col-span-2">
                    Belum ada pesan. Tinggalkan pesan pertama untuk membuka suasana halaman ini.
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer siteContent={siteContent} />
    </div>
  )
}

function GalleryPage({ siteContent }: SiteContentProps) {
  const { setCurrentView } = useAppStore()
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [galleryReady, setGalleryReady] = useState(false)
  const [galleryError, setGalleryError] = useState<string | null>(null)
  const galleryBatchSize = 16
  const archivePhotos = photos

  useEffect(() => {
    const loadPhotos = async () => {
      try {
        const response = await fetch(`/api/photos?limit=${galleryBatchSize}`)
        if (!response.ok) {
          throw new Error('Gagal memuat foto')
        }

        const data = await response.json()
        const apiPhotos = Array.isArray(data.photos) ? data.photos : []
        setPhotos(apiPhotos)
        setTotalCount(typeof data.totalCount === 'number' ? data.totalCount : apiPhotos.length)
        setGalleryError(null)
      } catch (error) {
        console.error('Error loading gallery photos:', error)
        setPhotos([])
        setTotalCount(0)
        setGalleryError('Galeri belum bisa dimuat sekarang.')
      } finally {
        setGalleryReady(true)
      }
    }

    void loadPhotos()
  }, [])

  const handleLoadMore = async () => {
    if (loadingMore || photos.length >= totalCount) {
      return
    }

    const lastPhoto = photos[photos.length - 1]
    if (!lastPhoto || typeof lastPhoto.order !== 'number') {
      return
    }

    setLoadingMore(true)

    try {
      const params = new URLSearchParams({
        limit: String(galleryBatchSize),
        afterOrder: String(lastPhoto.order),
        afterId: String(lastPhoto.id),
      })
      const response = await fetch(`/api/photos?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Gagal memuat foto berikutnya')
      }

      const data = await response.json()
      const nextPhotos = Array.isArray(data.photos) ? data.photos : []
      const dedupedPhotos = nextPhotos.filter(
        (item) => !photos.some((existingPhoto) => String(existingPhoto.id) === String(item.id))
      )

      setTotalCount(typeof data.totalCount === 'number' ? data.totalCount : photos.length + dedupedPhotos.length)
      if (dedupedPhotos.length > 0) {
        setPhotos((currentPhotos) => [...currentPhotos, ...dedupedPhotos])
      } else {
        setTotalCount(photos.length)
      }
    } catch (error) {
      console.error('Error loading more gallery photos:', error)
    } finally {
      setLoadingMore(false)
    }
  }

  const shownPhotoCount = photos.length
  const hasMorePhotos = galleryReady && totalCount > photos.length

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F7F4EF]">
      <AmbientBackdrop />
      <Header siteContent={siteContent} />

      <main className="relative z-10 flex-1 px-4 pb-20 pt-8 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <section className="rounded-[2.2rem] border border-[#EADCCF] bg-[#FFFDF9]/92 p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[#8B7676]">{siteContent.gallery_title}</p>
                <h1 className={`${cormorant.className} mt-3 text-4xl text-[#2F2A2A] sm:text-5xl`}>
                  {siteContent.gallery_heading}
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-8 text-[#6E6666] sm:text-base">
                  {siteContent.gallery_description}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <span className="rounded-full border border-[#EADCCF] bg-[#FFF7F8] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[#7E5E66]">
                  {galleryReady ? totalCount : 0} foto tersimpan
                </span>
                <span className="rounded-full border border-[#DCEAF6] bg-[#F6FAFF] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[#6E8091]">
                  menampilkan {shownPhotoCount} foto
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentView('home')}
                  className="rounded-full border border-[#EADCCF] bg-[#FFFDF9] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[#2F2A2A] transition hover:bg-[#FFF7F8]"
                >
                  kembali ke beranda
                </button>
              </div>
            </div>
          </section>

          <section className="mt-8 rounded-[2.4rem] border border-[#EADCCF] bg-[#FFFDF9]/92 p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[#8B7676]">Arsip visual</p>
                <h2 className={`${cormorant.className} mt-3 text-4xl text-[#2F2A2A]`}>
                  Foto saja, tersusun padat, tetap ringan.
                </h2>
              </div>
              <Badge className="w-fit bg-[#E8BFCB] text-[#2F2A2A]">batch {galleryBatchSize} foto</Badge>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {archivePhotos.map((photo, index) => (
                <div
                  key={photo.id}
                  className={`${index < 12 ? 'gallery-card-reveal' : ''} group overflow-hidden rounded-[1.55rem] border border-[#EADCCF] bg-[#FFFDF9] p-2.5 shadow-sm transition-transform duration-300 hover:-translate-y-1`}
                  style={{
                    animationDelay: index < 12 ? `${index * 40}ms` : undefined,
                    contentVisibility: 'auto',
                    containIntrinsicSize: '270px 360px',
                  }}
                >
                  <div className="overflow-hidden rounded-[1.2rem] bg-[#F0E5D8]">
                    <img
                      src={photo.imageUrl}
                      alt={photo.caption || 'Foto'}
                      loading={index < 4 ? 'eager' : 'lazy'}
                      decoding="async"
                      className="aspect-[4/5] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  </div>
                </div>
              ))}
            </div>

            {galleryError && archivePhotos.length === 0 && (
              <div className="mt-6 rounded-[1.8rem] border border-dashed border-[#EADCCF] bg-[#FFFCF8] p-6 text-sm leading-7 text-[#6E6666]">
                {galleryError} Coba muat ulang halaman beberapa saat lagi.
              </div>
            )}

            {hasMorePhotos && (
              <div className="mt-6 flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => void handleLoadMore()}
                  disabled={loadingMore}
                  className="rounded-full border-[#EADCCF] bg-[#FFFDF9] px-6 text-[#2F2A2A] hover:bg-[#FFF7F8]"
                >
                  {loadingMore ? 'Memuat foto...' : 'Tampilkan lebih banyak'}
                </Button>
              </div>
            )}

            {galleryReady && archivePhotos.length === 0 && (
              <div className="mt-6 rounded-[1.8rem] border border-dashed border-[#EADCCF] bg-[#FFFCF8] p-6 text-sm leading-7 text-[#6E6666]">
                Belum ada foto di galeri. Saat foto pertama ditambahkan, susunannya akan muncul rapi di sini.
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer siteContent={siteContent} />
    </div>
  )
}

function MusicPage({ siteContent }: SiteContentProps) {
  const { setCurrentView } = useAppStore()
  const { musicItems, musicReady, musicError } = useMusicLibrary()

  const featuredItem = musicItems.find((item) => item.featured) || musicItems[0]
  const secondaryItems = featuredItem ? musicItems.filter((item) => item.id !== featuredItem.id) : []

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F7F4EF]">
      <AmbientBackdrop />
      <Header siteContent={siteContent} />

      <main className="relative z-10 flex-1 px-4 pb-20 pt-8 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <section className="grid gap-6 lg:grid-cols-[0.98fr_1.02fr]">
            <div className="rounded-[2.4rem] border border-[#DCEAF6] bg-[#F8FBFF]/92 p-7 shadow-sm">
              <p className="text-xs uppercase tracking-[0.24em] text-[#6E8091]">{siteContent.music_page_title}</p>
              <h1 className={`${cormorant.className} mt-3 max-w-xl text-5xl leading-[0.98] text-[#2F2A2A] sm:text-6xl`}>
                {siteContent.music_page_heading}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-8 text-[#6E6666] sm:text-base">
                {siteContent.music_page_description}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <span className="rounded-full border border-[#DCEAF6] bg-[#FFFDF9] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[#6E8091]">
                  {musicReady ? musicItems.length : 0} koleksi musik
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentView('home')}
                  className="rounded-full border border-[#EADCCF] bg-[#FFFDF9] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[#2F2A2A] transition hover:bg-[#FFF7F8]"
                >
                  kembali ke beranda
                </button>
              </div>
            </div>

            <div className="rounded-[2.4rem] border border-[#EADCCF] bg-[#FFFDF9]/92 p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#2F2A2A]" />
                <p className="text-xs uppercase tracking-[0.24em] text-[#8B7676]">Pilihan utama</p>
              </div>
              <div className="mt-5 overflow-hidden rounded-[1.9rem] bg-[#2F2A2A]">
                {featuredItem ? (
                  <iframe
                    src={featuredItem.spotifyUrl}
                    className="aspect-video w-full"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                  />
                ) : musicError ? (
                  <div className="flex aspect-video items-center justify-center px-6 text-center text-sm leading-7 text-[#FFFDF9]">
                    {musicError}
                  </div>
                ) : !musicReady ? (
                  <div className="flex aspect-video items-center justify-center px-6 text-center text-sm leading-7 text-[#FFFDF9]">
                    Koleksi musik sedang dimuat.
                  </div>
                ) : (
                  <div className="flex aspect-video items-center justify-center text-sm text-[#FFFDF9]">
                    Belum ada musik pilihan
                  </div>
                )}
              </div>
              <div className="mt-5 flex items-center justify-between gap-4">
                <div>
                  <p className={`${cormorant.className} text-3xl text-[#2F2A2A]`}>
                    {featuredItem?.title || (musicError ? 'Koleksi musik belum siap' : 'Tambahkan musik unggulan')}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[#6E8091]">
                    {featuredItem ? (featuredItem.type === 'playlist' ? 'daftar putar' : 'lagu') : 'koleksi spotify'}
                  </p>
                </div>
                {featuredItem?.featured && <Badge className="bg-[#E8BFCB] text-[#2F2A2A]">Unggulan</Badge>}
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {secondaryItems.map((item) => (
              <div
                key={item.id}
                className="rounded-[2rem] border border-[#EADCCF] bg-[#FFFDF9]/94 p-5 shadow-sm transition-transform duration-300 hover:-translate-y-1"
              >
                <div className="overflow-hidden rounded-[1.5rem] bg-[#2F2A2A]">
                  <iframe
                    src={item.spotifyUrl}
                    className="aspect-video w-full"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                  />
                </div>
                <div className="mt-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className={`${cormorant.className} text-2xl text-[#2F2A2A]`}>{item.title}</h3>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#6E6666]">
                      {item.type === 'playlist' ? 'daftar putar' : 'lagu'}
                    </p>
                  </div>
                  {item.featured && <Badge className="bg-[#E8BFCB] text-[#2F2A2A]">Unggulan</Badge>}
                </div>
              </div>
            ))}

            {secondaryItems.length === 0 && featuredItem && (
              <div className="rounded-[2rem] border border-[#EADCCF] bg-[#FFFDF9]/94 p-6 shadow-sm md:col-span-2 xl:col-span-2">
                <p className="text-sm leading-7 text-[#6E6666]">
                  Belum ada koleksi tambahan. Tambahkan lagu atau daftar putar lain dari dashboard agar rak musik ini terasa lebih penuh.
                </p>
              </div>
            )}

            {musicReady && !musicError && musicItems.length === 0 && (
              <div className="rounded-[2rem] border border-dashed border-[#EADCCF] bg-[#FFFCF8] p-6 text-sm leading-7 text-[#6E6666] md:col-span-2 xl:col-span-3">
                Belum ada koleksi musik. Tambahkan playlist atau lagu dari dashboard super admin agar halaman ini terisi.
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer siteContent={siteContent} />
    </div>
  )
}

function MemberProfilePage({ siteContent }: SiteContentProps) {
  const { user, setCurrentView, setUser } = useAppStore()
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    avatarUrl: user?.avatarUrl || '',
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [cropFileName, setCropFileName] = useState('avatar.jpg')
  const [profileMessage, setProfileMessage] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [actionLoading, setActionLoading] = useState<'profile' | 'password' | null>(null)
  const [avatarUploadProgress, setAvatarUploadProgress] = useState(0)

  useEffect(() => {
    setProfileForm({
      name: user?.name || '',
      email: user?.email || '',
      avatarUrl: user?.avatarUrl || '',
    })
    setAvatarFile(null)
    setAvatarPreviewUrl(null)
    setCropImageSrc(null)
  }, [user])

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreviewUrl)
      }
    }
  }, [avatarPreviewUrl])

  const handleAvatarSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] || null
    event.target.value = ''

    if (!nextFile) {
      return
    }

    try {
      const dataUrl = await readFileAsDataUrl(nextFile)
      setCropFileName(nextFile.name)
      setCropImageSrc(dataUrl)
      setProfileMessage('')
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : 'Gagal membuka foto profil')
    }
  }

  const handleAvatarCropComplete = (nextFile: File) => {
    setAvatarFile(nextFile)
    setAvatarPreviewUrl((current) => {
      if (current?.startsWith('blob:')) {
        URL.revokeObjectURL(current)
      }

      return URL.createObjectURL(nextFile)
    })
    setCropImageSrc(null)
    setProfileMessage('Foto profil baru siap disimpan.')
  }

  const handleAvatarSelectionReset = () => {
    setAvatarFile(null)
    setAvatarPreviewUrl((current) => {
      if (current?.startsWith('blob:')) {
        URL.revokeObjectURL(current)
      }

      return null
    })
    setProfileForm((current) => ({
      ...current,
      avatarUrl: user?.avatarUrl || '',
    }))
    setProfileMessage('Perubahan foto profil dibatalkan.')
  }

  const handleRemoveAvatar = () => {
    setAvatarFile(null)
    setAvatarPreviewUrl((current) => {
      if (current?.startsWith('blob:')) {
        URL.revokeObjectURL(current)
      }

      return null
    })
    setProfileForm((current) => ({
      ...current,
      avatarUrl: '',
    }))
    setProfileMessage('Foto profil akan dihapus setelah profil disimpan.')
  }

  const handleProfileSave = async (event: React.FormEvent) => {
    event.preventDefault()
    setProfileMessage('')
    setActionLoading('profile')

    try {
      let nextAvatarUrl = profileForm.avatarUrl

      if (avatarFile) {
        setAvatarUploadProgress(0)
        const uploaded = await uploadImageFile('avatar', avatarFile, setAvatarUploadProgress)
        nextAvatarUrl = uploaded.publicUrl
      }

      const data = await requestJson<{ user: NonNullable<typeof user> }>('/api/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({
          name: profileForm.name,
          avatarUrl: nextAvatarUrl,
        }),
      })

      setUser(data.user)
      setProfileForm({
        name: data.user.name || '',
        email: data.user.email,
        avatarUrl: data.user.avatarUrl || '',
      })
      setAvatarFile(null)
      setAvatarPreviewUrl((current) => {
        if (current?.startsWith('blob:')) {
          URL.revokeObjectURL(current)
        }

        return null
      })
      setProfileMessage('Profil berhasil diperbarui.')
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : 'Gagal memperbarui profil')
    } finally {
      setAvatarUploadProgress(0)
      setActionLoading(null)
    }
  }

  const handlePasswordSave = async (event: React.FormEvent) => {
    event.preventDefault()
    setPasswordMessage('')

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage('Password baru dan konfirmasi password harus sama.')
      return
    }

    setActionLoading('password')

    try {
      await requestJson('/api/auth/me/password', {
        method: 'PATCH',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      })

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      setPasswordMessage('Password berhasil diperbarui.')
    } catch (error) {
      setPasswordMessage(error instanceof Error ? error.message : 'Gagal memperbarui password')
    } finally {
      setActionLoading(null)
    }
  }

  const displayAvatar = avatarPreviewUrl || profileForm.avatarUrl || undefined

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F7F4EF]">
      <AmbientBackdrop />
      <Header siteContent={siteContent} />

      <main className="relative z-10 flex-1 px-4 pb-20 pt-8 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <section className="grid gap-6 lg:grid-cols-[1fr_0.92fr]">
            <div className="rounded-[2.4rem] border border-[#EADCCF] bg-[#FFFDF9]/92 p-7 shadow-sm">
              <p className="text-xs uppercase tracking-[0.24em] text-[#8B7676]">Profil member</p>
              <h1 className={`${cormorant.className} mt-3 max-w-3xl text-5xl leading-[0.98] text-[#2F2A2A] sm:text-6xl`}>
                Atur nama, foto, dan keamanan akunmu dengan tetap rapi.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-8 text-[#6E6666] sm:text-base">
                Halaman ini dibuat khusus untuk pengaturan akun. Foto profil bisa dipotong dulu sebelum disimpan, supaya avatar terlihat bersih dan konsisten.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentView('home')}
                  className="rounded-full border border-[#EADCCF] bg-[#FFFDF9] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[#2F2A2A] transition hover:bg-[#FFF7F8]"
                >
                  kembali ke beranda
                </button>
                <span className="rounded-full border border-[#DCEAF6] bg-[#F6FAFF] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[#6E8091]">
                  avatar bisa di-crop dulu
                </span>
              </div>
            </div>

            <div className="rounded-[2.4rem] border border-[#DCEAF6] bg-[#F8FBFF]/92 p-7 shadow-sm">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 border border-[#EADCCF] bg-[#E8BFCB]/20">
                  <AvatarImage src={displayAvatar} alt={profileForm.name || profileForm.email} />
                  <AvatarFallback className="text-2xl font-medium text-[#2F2A2A]">
                    {profileForm.name?.charAt(0) || profileForm.email?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[#6E8091]">Preview akun</p>
                  <p className={`${cormorant.className} mt-2 text-3xl text-[#2F2A2A]`}>
                    {profileForm.name || 'Nama kamu'}
                  </p>
                  <p className="mt-1 text-sm text-[#6E6666]">{profileForm.email}</p>
                </div>
              </div>
              <div className="mt-6 grid gap-3 text-sm leading-7 text-[#6E6666]">
                <p>Nama bisa diperbarui kapan saja untuk menyesuaikan tampilan akun.</p>
                <p>Foto profil akan dipotong dulu sebelum diunggah agar hasil avatar selalu proporsional.</p>
                <p>Password tetap memakai verifikasi password saat ini untuk menjaga keamanan akun.</p>
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-[1.06fr_0.94fr]">
            <Card className="rounded-[2.4rem] border-[#EADCCF] bg-[#FFFDF9]/92 shadow-sm">
              <CardHeader className="space-y-2">
                <div className="flex items-center gap-2">
                  <UserRound className="h-5 w-5 text-[#2F2A2A]" />
                  <p className="text-xs uppercase tracking-[0.22em] text-[#8B7676]">Identitas akun</p>
                </div>
                <CardTitle className={`${cormorant.className} text-4xl text-[#2F2A2A]`}>
                  Nama dan foto profil
                </CardTitle>
                <CardDescription className="text-sm leading-7 text-[#6E6666]">
                  Pilih foto, crop bagian terbaiknya, lalu simpan bersamaan dengan nama yang ingin ditampilkan.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileSave} className="space-y-6">
                  <div className="flex flex-col gap-5 rounded-[2rem] border border-[#EADCCF] bg-[#FFFCF8] p-5 sm:flex-row sm:items-center">
                    <Avatar className="h-24 w-24 border border-[#EADCCF] bg-[#E8BFCB]/20">
                      <AvatarImage src={displayAvatar} alt={profileForm.name || profileForm.email} />
                      <AvatarFallback className="text-3xl font-medium text-[#2F2A2A]">
                        {profileForm.name?.charAt(0) || profileForm.email?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-4">
                      <div className="flex flex-wrap gap-3">
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#2F2A2A] px-5 py-3 text-sm text-[#FFFDF9] transition hover:bg-[#2F2A2A]/92">
                          <Camera className="h-4 w-4" />
                          Pilih foto baru
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="sr-only"
                            onChange={handleAvatarSelected}
                          />
                        </label>
                        {avatarFile ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleAvatarSelectionReset}
                            className="rounded-full border-[#EADCCF] text-[#2F2A2A] hover:bg-[#FFF7F8]"
                          >
                            Batalkan foto baru
                          </Button>
                        ) : displayAvatar ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleRemoveAvatar}
                            className="rounded-full border-[#F4D9DE] text-[#2F2A2A] hover:bg-[#F4D9DE]/30"
                          >
                            Hapus foto
                          </Button>
                        ) : null}
                      </div>
                      <p className="text-sm leading-7 text-[#6E6666]">
                        Foto akan dibuka di jendela crop terlebih dahulu. Ukuran maksimal unggahan tetap 5MB.
                      </p>
                      {actionLoading === 'profile' && avatarUploadProgress > 0 && (
                        <p className="text-xs uppercase tracking-[0.18em] text-[#8B7676]">
                          mengunggah avatar... {avatarUploadProgress}%
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="member-profile-name">Nama</Label>
                    <Input
                      id="member-profile-name"
                      value={profileForm.name}
                      onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))}
                      className="h-12 rounded-2xl border-[#EADCCF] bg-[#FFFCF8]"
                      placeholder="Nama yang ingin ditampilkan"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="member-profile-email">Email</Label>
                    <Input
                      id="member-profile-email"
                      value={profileForm.email}
                      readOnly
                      className="h-12 rounded-2xl border-[#EADCCF] bg-[#F7F4EF] text-[#6E6666]"
                    />
                  </div>

                  {profileMessage && (
                    <Alert className="border-[#EADCCF] bg-[#FFF7F8]">
                      <AlertDescription className="text-[#2F2A2A]">{profileMessage}</AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    className="rounded-full bg-[#2F2A2A] px-6 py-5 text-[#FFFDF9] hover:bg-[#2F2A2A]/92"
                    disabled={actionLoading === 'profile'}
                  >
                    {actionLoading === 'profile' ? 'Menyimpan profil...' : 'Simpan profil'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="rounded-[2.4rem] border-[#EADCCF] bg-[#FFFDF9]/92 shadow-sm">
              <CardHeader className="space-y-2">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-[#2F2A2A]" />
                  <p className="text-xs uppercase tracking-[0.22em] text-[#8B7676]">Keamanan akun</p>
                </div>
                <CardTitle className={`${cormorant.className} text-4xl text-[#2F2A2A]`}>
                  Ganti password
                </CardTitle>
                <CardDescription className="text-sm leading-7 text-[#6E6666]">
                  Password baru tetap membutuhkan password saat ini, supaya perubahan akun tidak bisa dilakukan sembarangan.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {user?.authProvider === 'google' ? (
                  <Alert className="border-[#DCEAF6] bg-[#F6FAFF]">
                    <AlertDescription className="text-[#2F2A2A]">
                      Akun Google tidak memiliki password lokal, jadi perubahan password tidak tersedia di sini.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <form onSubmit={handlePasswordSave} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="member-current-password">Password saat ini</Label>
                      <Input
                        id="member-current-password"
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(event) =>
                          setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))
                        }
                        className="h-12 rounded-2xl border-[#EADCCF] bg-[#FFFCF8]"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="member-new-password">Password baru</Label>
                      <Input
                        id="member-new-password"
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(event) =>
                          setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))
                        }
                        className="h-12 rounded-2xl border-[#EADCCF] bg-[#FFFCF8]"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="member-confirm-password">Konfirmasi password baru</Label>
                      <Input
                        id="member-confirm-password"
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(event) =>
                          setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))
                        }
                        className="h-12 rounded-2xl border-[#EADCCF] bg-[#FFFCF8]"
                        required
                      />
                    </div>

                    {passwordMessage && (
                      <Alert className="border-[#EADCCF] bg-[#FFF7F8]">
                        <AlertDescription className="text-[#2F2A2A]">{passwordMessage}</AlertDescription>
                      </Alert>
                    )}

                    <Button
                      type="submit"
                      className="rounded-full bg-[#2F2A2A] px-6 py-5 text-[#FFFDF9] hover:bg-[#2F2A2A]/92"
                      disabled={actionLoading === 'password'}
                    >
                      {actionLoading === 'password' ? 'Menyimpan password...' : 'Perbarui password'}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      </main>

      <Footer siteContent={siteContent} />

      <AvatarCropDialog
        open={Boolean(cropImageSrc)}
        imageSrc={cropImageSrc}
        fileName={cropFileName}
        onClose={() => setCropImageSrc(null)}
        onComplete={handleAvatarCropComplete}
      />
    </div>
  )
}

function Footer({ siteContent }: SiteContentProps) {
  return (
    <footer className="relative z-10 mt-auto border-t border-[#EADCCF] bg-[#FFFDF9]/88 px-4 py-6 backdrop-blur sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 text-center text-sm text-[#6E6666] sm:flex-row sm:text-left">
        <p>{siteContent.footer_text}</p>
        <p className="text-[11px] uppercase tracking-[0.26em] text-[#8B7676]">ruang digital yang lembut</p>
      </div>
    </footer>
  )
}

export default function App() {
  const { currentView, user, setCurrentView, setUser } = useAppStore()
  const [bootstrapped, setBootstrapped] = useState(false)
  const [siteContent, setSiteContent] = useState<SiteContentMap>(DEFAULT_SITE_CONTENT)
  const [displayedView, setDisplayedView] = useState(currentView)
  const [viewTransitionStage, setViewTransitionStage] = useState<'idle' | 'exiting' | 'entering'>('idle')

  useEffect(() => {
    const loadSiteContent = async () => {
      try {
        const response = await fetch('/api/content', {
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error('Gagal memuat konten situs')
        }

        const data = await response.json()
        setSiteContent(normalizeSiteContent(data.content))
      } catch (error) {
        console.error('Gagal memuat konten situs:', error)
        setSiteContent(DEFAULT_SITE_CONTENT)
      }
    }

    const handleContentUpdated = () => {
      void loadSiteContent()
    }

    const handleStorageUpdated = (event: StorageEvent) => {
      if (event.key === 'awrella-content-updated-at') {
        void loadSiteContent()
      }
    }

    void loadSiteContent()
    window.addEventListener('awrella-content-updated', handleContentUpdated)
    window.addEventListener('storage', handleStorageUpdated)

    return () => {
      window.removeEventListener('awrella-content-updated', handleContentUpdated)
      window.removeEventListener('storage', handleStorageUpdated)
    }
  }, [])

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          cache: 'no-store',
        })

        if (!response.ok) {
          setUser(null)
          return
        }

        const data = await response.json()
        setUser(data.user)

        const searchParams = new URLSearchParams(window.location.search)
        const requestedView = searchParams.get('view')
        const isAdminView = requestedView === 'admin'
        const isAdminUser = data.user?.role === 'SUPER_ADMIN'

        if (isAdminView && isAdminUser) {
          setCurrentView('admin')
        } else {
          setCurrentView('home')
          window.history.replaceState(null, '', '/')
        }
      } catch (error) {
        console.error('Gagal memulihkan sesi:', error)
        setUser(null)
      } finally {
        setBootstrapped(true)
      }
    }

    void bootstrap()
  }, [setCurrentView, setUser])

  useEffect(() => {
    if (!bootstrapped) {
      setDisplayedView(currentView)
      setViewTransitionStage('idle')
      return
    }

    if (currentView === displayedView) {
      return
    }

    setViewTransitionStage('exiting')

    const exitTimer = window.setTimeout(() => {
      setDisplayedView(currentView)
      setViewTransitionStage('entering')
    }, 180)

    return () => {
      window.clearTimeout(exitTimer)
    }
  }, [bootstrapped, currentView, displayedView])

  useEffect(() => {
    if (viewTransitionStage !== 'entering') {
      return
    }

    const enterTimer = window.setTimeout(() => {
      setViewTransitionStage('idle')
    }, 420)

    return () => {
      window.clearTimeout(enterTimer)
    }
  }, [viewTransitionStage])

  // Render different views based on currentView state
  const renderView = (view = displayedView) => {
    switch (view) {
      case 'landing':
        return <LandingPage siteContent={siteContent} />
      case 'login':
        return <LoginPage siteContent={siteContent} />
      case 'signup':
        return <SignupPage siteContent={siteContent} />
      case 'home':
        return user ? <HomePage siteContent={siteContent} /> : <LoginPage siteContent={siteContent} />
      case 'gallery':
        return user ? <GalleryPage siteContent={siteContent} /> : <LoginPage siteContent={siteContent} />
      case 'music':
        return user ? <MusicPage siteContent={siteContent} /> : <LoginPage siteContent={siteContent} />
      case 'messages':
        return user ? <MessagePage siteContent={siteContent} /> : <LoginPage siteContent={siteContent} />
      case 'profile':
        return user ? <MemberProfilePage siteContent={siteContent} /> : <LoginPage siteContent={siteContent} />
      case 'admin':
      case 'admin-photos':
      case 'admin-music':
      case 'admin-users':
      case 'admin-comments':
      case 'admin-content':
      case 'admin-settings':
        return user ? <AdminDashboardScreen /> : <LoginPage siteContent={siteContent} />
      default:
        return <LandingPage siteContent={siteContent} />
    }
  }

  if (!bootstrapped) {
    return (
      <div
        suppressHydrationWarning
        className="min-h-screen flex items-center justify-center bg-[#F7F4EF] text-[#6E6666]"
      >
        Sedang memuat Awrella...
      </div>
    )
  }

  const viewTransitionClass =
    viewTransitionStage === 'exiting'
      ? 'view-stage-exit'
      : viewTransitionStage === 'entering'
        ? 'view-stage-enter'
        : 'view-stage-stable'

  return (
    <div key={displayedView} className={viewTransitionClass}>
      {renderView()}
    </div>
  )
}
