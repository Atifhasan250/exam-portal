'use client'

import { ClerkProvider } from '@clerk/nextjs'
import { ThemeProvider } from '@/context/ThemeContext'
import { clerkAppearance } from '@/lib/clerkTheme'

export default function AppProviders({ children }) {
  const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)

  if (!hasClerk) {
    return <ThemeProvider>{children}</ThemeProvider>
  }

  return (
    <ClerkProvider appearance={clerkAppearance}>
      <ThemeProvider>{children}</ThemeProvider>
    </ClerkProvider>
  )
}
