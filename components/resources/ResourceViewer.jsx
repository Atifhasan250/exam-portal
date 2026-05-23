'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

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

export default function ResourceViewer({ resource, progress, onClose, onProgressSaved }) {
  const playerNodeId = useRef(`yt-player-${resource?._id || Date.now()}`)
  const playerRef = useRef(null)
  const startSecondsRef = useRef(progress?.progressSeconds || 0)
  const savedSecondsRef = useRef(progress?.progressSeconds || 0)
  const [mounted, setMounted] = useState(false)
  const [currentSeconds, setCurrentSeconds] = useState(progress?.progressSeconds || 0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!resource || !mounted) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [resource, mounted])

  useEffect(() => {
    if (!resource || resource.type !== 'youtube' || !resource.youtubeId) return undefined

    let cancelled = false
    let intervalId = null
    startSecondsRef.current = progress?.progressSeconds || 0
    savedSecondsRef.current = progress?.progressSeconds || 0
    setCurrentSeconds(progress?.progressSeconds || 0)

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
        onProgressSaved,
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
  }, [resource, onProgressSaved])

  if (!resource || !mounted) return null

  const percent = resource.durationSeconds ? Math.min(100, Math.round((currentSeconds / resource.durationSeconds) * 100)) : 0

  return createPortal(
    <div className="fixed inset-0 z-[2147483647] isolate bg-black/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 modal-backdrop">
      <div className="bg-theme-surface text-theme-primary border border-theme-border w-full sm:max-w-5xl sm:rounded-2xl shadow-2xl max-h-[94vh] overflow-y-auto modal-panel">
        <div className="flex items-start justify-between gap-4 p-4 sm:p-5 border-b border-theme-border">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-theme-accent">{resourceTypeLabel(resource.type)}</p>
            <h2 className="text-lg sm:text-2xl font-extrabold truncate">{resource.title}</h2>
            <p className="text-sm text-theme-secondary truncate">{resource.channelTitle || resource.categoryId?.name || 'Learning resource'}</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-theme-bg text-theme-secondary hover:text-theme-primary border border-theme-border shrink-0" title="Close">
            <i className="fas fa-times" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-5">
          {resource.type === 'youtube' ? (
            <div className="aspect-video bg-black rounded-xl overflow-hidden">
              <div id={playerNodeId.current} className="w-full h-full" />
            </div>
          ) : (
            <div className="bg-theme-bg border border-theme-border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-theme-surface border border-theme-border flex items-center justify-center text-theme-accent shrink-0">
                <i className={`fas ${resource.type === 'pdf' ? 'fa-file-pdf' : 'fa-arrow-up-right-from-square'} text-xl`} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-theme-primary">Open this resource</h3>
                <p className="text-sm text-theme-secondary truncate">{resource.url || resource.imagekitUrl}</p>
              </div>
              <a
                href={resource.url || resource.imagekitUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => saveProgress(resource._id, 1, true, onProgressSaved, setSaving)}
                className="px-4 py-3 rounded-xl bg-theme-accent text-white font-bold text-center"
              >
                Open
              </a>
            </div>
          )}

          {resource.type === 'youtube' ? (
            <div className="bg-theme-bg border border-theme-border rounded-xl p-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-sm font-bold text-theme-primary">Progress</span>
                <span className="text-sm text-theme-secondary">{saving ? 'Saving...' : `${percent}%`}</span>
              </div>
              <div className="h-2 bg-theme-surface rounded-full overflow-hidden">
                <div className="h-full bg-theme-accent rounded-full" style={{ width: `${percent}%` }} />
              </div>
            </div>
          ) : null}

          {resource.description ? (
            <p className="text-theme-secondary text-sm leading-relaxed whitespace-pre-line">{resource.description}</p>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  )
}

async function saveProgress(resourceId, progressSeconds, completed, onProgressSaved, setSaving, options = {}) {
  setSaving(true)
  try {
    const response = await fetch('/api/resources/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: options.keepalive,
      body: JSON.stringify({ resourceId, progressSeconds, completed }),
    })
    if (response.ok && !options.keepalive) {
      const progress = await response.json()
      onProgressSaved?.(progress)
    }
  } finally {
    setSaving(false)
  }
}

function resourceTypeLabel(type) {
  if (type === 'youtube') return 'Video'
  if (type === 'pdf') return 'PDF'
  if (type === 'link') return 'Link'
  if (type === 'image') return 'Image'
  return 'File'
}
