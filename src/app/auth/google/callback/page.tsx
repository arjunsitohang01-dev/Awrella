'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAppStore } from '@/lib/store'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function GoogleCallbackPage() {
  const router = useRouter()
  const { setUser, setCurrentView } = useAppStore()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      try {
        const supabase = getSupabaseBrowserClient()
        const searchParams = new URLSearchParams(window.location.search)
        const code = searchParams.get('code')

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          if (exchangeError) {
            throw exchangeError
          }
        }

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        if (sessionError || !sessionData.session?.access_token) {
          throw new Error('Sesi Google tidak ditemukan')
        }

        const response = await fetch('/api/auth/google/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessToken: sessionData.session.access_token,
          }),
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Pendaftaran dengan Google gagal')
        }

        setUser(data.user)
        setCurrentView('home')
        router.replace('/')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Pendaftaran dengan Google gagal')
      } finally {
        setLoading(false)
      }
    }

    void run()
  }, [router, setCurrentView, setUser])

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#F7F4EF]">
      <Card className="w-full max-w-md bg-[#FFFDF9] border-[#EADCCF] shadow-sm">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-serif text-[#2F2A2A]">
            Autentikasi Google
          </CardTitle>
          <CardDescription className="text-[#6E6666]">
            {loading ? 'Menyelesaikan proses pendaftaran...' : 'Proses pendaftaran selesai'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert className="bg-[#F4D9DE]/30 border-[#E8BFCB]/50">
              <AlertDescription className="text-[#2F2A2A]">{error}</AlertDescription>
            </Alert>
          )}

          {!loading && (
            <div className="flex gap-2">
              <Button asChild variant="outline" className="flex-1 border-[#EADCCF]">
                <Link href="/">Kembali ke beranda</Link>
              </Button>
              <Button asChild className="flex-1 bg-[#E8BFCB] hover:bg-[#E8BFCB]/90 text-[#2F2A2A]">
                <Link href="/">Ke beranda</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
