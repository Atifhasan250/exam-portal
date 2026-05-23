'use client'

import { useEffect, useRef, useState } from 'react'

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

export default function ResourceVideoPlayer({ resource, initialProgress }) {
  const playerNodeId = useRef(`yt-page-player-${resource._id}`)
  const playerRef = useRef(null)
  const startSecondsRef = useRef(initialProgress?.progressSeconds || 0)
  const savedSecondsRef = useRef(initialProgress?.progressSeconds || 0)
  const [currentSeconds, setCurrentSeconds] = useState(initialProgress?.progressSeconds || 0)
  const [saving, setSaving] = useState(false)

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
      playerRef.current = new YT.Player(playerNodeId.current, {
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
  }, [resource._id, resource.youtubeId, resource.durationSeconds])

  const percent = resource.durationSeconds ? Math.min(100, Math.round((currentSeconds / resource.durationSeconds) * 100)) : 0

  return (
    <div className="space-y-5">
      <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-theme-border shadow-xl">
        <div id={playerNodeId.current} className="w-full h-full" />
      </div>

      <div className="bg-theme-surface border border-theme-border rounded-2xl p-4">
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
