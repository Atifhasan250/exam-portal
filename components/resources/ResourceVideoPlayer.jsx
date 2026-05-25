'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import posthog from 'posthog-js'

let youtubeApiPromise = null

function loadYouTubeApi() {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (youtubeApiPromise) return youtubeApiPromise

  youtubeApiPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      resolve(window.YT)
    }

    const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]')
    if (!existing) {
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      script.async = true
      document.body.appendChild(script)
    }
  })

  return youtubeApiPromise
}

export default function ResourceVideoPlayer({ resource, initialProgress, previousResource, nextResource }) {
  const playerNodeId = `yt-page-player-${resource._id}`
  const playerRef = useRef(null)
  const startSecondsRef = useRef(initialProgress?.progressSeconds || 0)
  const savedSecondsRef = useRef(initialProgress?.progressSeconds || 0)
  const completedFiredRef = useRef(initialProgress?.completed || false)
  const [currentSeconds, setCurrentSeconds] = useState(initialProgress?.progressSeconds || 0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const nextProgressSeconds = initialProgress?.progressSeconds || 0
    startSecondsRef.current = nextProgressSeconds
    savedSecondsRef.current = nextProgressSeconds
    setCurrentSeconds(nextProgressSeconds)
    setSaving(false)
  }, [initialProgress?.progressSeconds, resource._id])

  useEffect(() => {
    if (!resource.youtubeId) return undefined

    let cancelled = false
    let intervalId = null
    const saveCurrentProgress = (force = false, forceCompleted = false, silent = false) => {
      const player = playerRef.current
      if (!player?.getCurrentTime) return

      const currentTime = Math.floor(player.getCurrentTime())
      const duration = Math.floor(player.getDuration?.() || resource.durationSeconds || 0)
      const completed = forceCompleted || (duration > 0 && currentTime / duration >= 0.92)

      if (!currentTime) return
      if (!force && !completed && Math.abs(currentTime - savedSecondsRef.current) < 10) return

      if (completed && !completedFiredRef.current) {
        completedFiredRef.current = true
        posthog.capture('resource_video_completed', {
          resource_id: resource._id,
          resource_title: resource.title,
          duration_seconds: resource.durationSeconds,
        })
      }

      savedSecondsRef.current = currentTime
      saveProgress(
        resource._id,
        currentTime,
        completed,
        () => {},
        silent ? () => {} : setSaving,
        { keepalive: silent },
      )
    }

    const flushProgress = () => saveCurrentProgress(true, false, true)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushProgress()
    }

    window.addEventListener('pagehide', flushProgress)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    loadYouTubeApi().then((YT) => {
      if (cancelled || !YT?.Player) return
      playerRef.current = new YT.Player(playerNodeId, {
        videoId: resource.youtubeId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          start: Math.floor(startSecondsRef.current),
        },
        events: {
          onReady: (event) => {
            const startSeconds = Math.floor(startSecondsRef.current)
            if (startSeconds > 0) event.target.seekTo(startSeconds, true)
            setCurrentSeconds(startSeconds)
          },
          onStateChange: (event) => {
            if (event.data === YT.PlayerState.PAUSED) saveCurrentProgress(true)
            if (event.data === YT.PlayerState.ENDED) saveCurrentProgress(true, true)
          },
        },
      })

      intervalId = window.setInterval(() => {
        const player = playerRef.current
        if (!player?.getCurrentTime) return
        const currentTime = Math.floor(player.getCurrentTime())
        if (currentTime > 0) {
          setCurrentSeconds(currentTime)
        }

        saveCurrentProgress()
      }, 1000)
    })

    return () => {
      cancelled = true
      if (intervalId) window.clearInterval(intervalId)
      window.removeEventListener('pagehide', flushProgress)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      saveCurrentProgress(true, false, true)
      if (playerRef.current?.destroy) playerRef.current.destroy()
      playerRef.current = null
    }
  }, [playerNodeId, resource._id, resource.youtubeId, resource.durationSeconds])

  const percent = resource.durationSeconds ? Math.min(100, Math.round((currentSeconds / resource.durationSeconds) * 100)) : 0

  return (
    <div className="space-y-5">
      <div className="aspect-[4/3] sm:aspect-video bg-black rounded-2xl overflow-hidden border border-theme-border shadow-xl">
        <div id={playerNodeId} className="w-full h-full" />
      </div>

      <div className="bg-theme-surface border border-theme-border rounded-2xl p-4">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex justify-start">
            <ResourceNavButton resource={previousResource} direction="previous" />
          </div>
          <div className="flex justify-end">
            <ResourceNavButton resource={nextResource} direction="next" />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 mb-2">
          <span className="text-sm font-bold text-theme-primary">Progress</span>
          <span className="text-sm text-theme-secondary">{saving ? 'Saving...' : `${percent}%`}</span>
        </div>
        <div className="h-2 bg-theme-bg rounded-full overflow-hidden">
          <div className="h-full bg-theme-accent rounded-full" style={{ width: `${percent}%` }} />
        </div>
      </div>
    </div>
  )
}

function ResourceNavButton({ resource, direction }) {
  const isPrevious = direction === 'previous'
  const label = isPrevious ? 'Previous' : 'Next'
  const icon = isPrevious ? 'fa-arrow-left' : 'fa-arrow-right'
  const content = (
    <>
      {isPrevious ? <i className={`fas ${icon} text-xs shrink-0`} /> : null}
      <span>{label}</span>
      {!isPrevious ? <i className={`fas ${icon} text-xs shrink-0`} /> : null}
    </>
  )

  if (!resource?.href) {
    return (
      <button
        type="button"
        aria-label={label}
        disabled
        className="h-11 w-full sm:w-32 rounded-xl bg-transparent border border-transparent text-theme-secondary text-sm font-bold flex items-center justify-center gap-2 cursor-not-allowed opacity-30"
      >
        {content}
      </button>
    )
  }

  return (
    <Link
      href={resource.href}
      title={resource.title}
      aria-label={label}
      className="h-11 w-full sm:w-32 rounded-xl border border-theme-accent bg-theme-accent text-theme-accent-text text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-theme-accent/30 hover:brightness-110"
    >
      {content}
    </Link>
  )
}

async function saveProgress(resourceId, progressSeconds, completed, setProgress, setSaving, options = {}) {
  setSaving(true)
  try {
    const response = await fetch('/api/resources/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: options.keepalive,
      body: JSON.stringify({ resourceId, progressSeconds, completed }),
    })
    if (response.ok && !options.keepalive) setProgress(await response.json())
  } finally {
    setSaving(false)
  }
}
