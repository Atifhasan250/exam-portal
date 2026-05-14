'use client'

import { ClerkProvider } from '@clerk/nextjs'
import { ThemeProvider } from '@/context/ThemeContext'
import { clerkAppearance } from '@/lib/clerkTheme'

export default function AppProviders({ children }) {
  return (
    <ClerkProvider appearance={clerkAppearance}>
      <ThemeProvider>{children}</ThemeProvider>
    </ClerkProvider>
  )
}
