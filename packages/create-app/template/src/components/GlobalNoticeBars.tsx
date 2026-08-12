"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { IconButton } from '@open-mercato/ui/primitives/icon-button'
import { useT } from '@open-mercato/shared/lib/i18n/context'

const COOKIE_NOTICE_COOKIE = 'om_cookie_notice_ack'

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.split(';').map((entry) => entry.trim()).find((entry) => entry.startsWith(`${name}=`))
  return match ? match.split('=').slice(1).join('=') : null
}

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === 'undefined') return
  const maxAge = days * 24 * 60 * 60
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`
}

export function GlobalNoticeBars() {
  const t = useT()
  const [showCookieNotice, setShowCookieNotice] = useState(false)

  useEffect(() => {
    if (!getCookie(COOKIE_NOTICE_COOKIE)) {
      setShowCookieNotice(true)
    }
  }, [])

  const activeBars = [showCookieNotice].filter(Boolean).length
  if (activeBars === 0) return null

  const handleDismissCookies = () => {
    setCookie(COOKIE_NOTICE_COOKIE, 'dismissed')
    setShowCookieNotice(false)
  }

  const handleAcceptCookies = () => {
    setCookie(COOKIE_NOTICE_COOKIE, 'ack')
    setShowCookieNotice(false)
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-banner flex flex-col items-center gap-3 px-4">

      {showCookieNotice ? (
        <div className="pointer-events-auto w-full max-w-[calc(100vw-2rem)] sm:max-w-4xl rounded-lg border border-border bg-background/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              {t('notices.cookies.description', 'We use essential cookies to remember your preferences. Learn how we handle data in our')}{' '}
              <Link className="underline font-medium hover:text-foreground" href="/privacy">
                {t('common.privacy')}
              </Link>.
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button type="button" variant="ghost" size="sm" onClick={handleDismissCookies}>
                {t('notices.cookies.dismiss', 'Dismiss')}
              </Button>
              <Button type="button" size="sm" onClick={handleAcceptCookies}>
                {t('notices.cookies.accept', 'Accept cookies')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
