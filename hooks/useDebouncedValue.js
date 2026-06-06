'use client'

import { useEffect, useState } from 'react'

export default function useDebouncedValue(value, delayMs) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedValue(value), delayMs)
    return () => clearTimeout(timeoutId)
  }, [delayMs, value])

  return debouncedValue
}
