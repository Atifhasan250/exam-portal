'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminDashboardHub() {
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const router = useRouter()

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin')
  }

  return (
    <div className="bg-theme-bg min-h-screen text-theme-primary transition-theme page-enter">
      <main className="max-w-4xl mx-auto px-4 py-10 sm:py-16 space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-theme-primary mb-1">Admin Dashboard</h2>
            <p className="text-theme-secondary text-sm">Welcome back. Select an action below.</p>
          </div>
          <button onClick={() => setShowLogoutDialog(true)} className="px-5 py-3 text-sm font-bold bg-theme-error-bg text-theme-error-text border border-theme-error-border rounded-xl hover:opacity-80 transition-all flex items-center justify-center whitespace-nowrap shadow-sm">
            <i className="fas fa-sign-out-alt mr-2" />
            <span>Logout</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8">
          <Link href="/admin/exams" className="bg-theme-surface border border-theme-border rounded-3xl p-8 shadow-sm hover:shadow-md hover:border-theme-accent/50 transition-all group flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-500/10 text-theme-accent rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <i className="fas fa-file-alt text-3xl" />
            </div>
            <h3 className="text-xl font-bold text-theme-primary mb-2">Manage Exams</h3>
            <p className="text-theme-secondary text-sm">Create, edit, publish, and delete exams. Add questions and view specific exam leaderboards.</p>
          </Link>

          <Link href="/admin/users" className="bg-theme-surface border border-theme-border rounded-3xl p-8 shadow-sm hover:shadow-md hover:border-emerald-500/50 transition-all group flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <i className="fas fa-users text-3xl" />
            </div>
            <h3 className="text-xl font-bold text-theme-primary mb-2">User List</h3>
            <p className="text-theme-secondary text-sm">View all registered students on the platform, check their join dates, and manage accounts.</p>
          </Link>

          <Link href="/admin/resources" className="bg-theme-surface border border-theme-border rounded-3xl p-8 shadow-sm hover:shadow-md hover:border-sky-500/50 transition-all group flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-sky-50 dark:bg-sky-500/10 text-sky-500 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <i className="fas fa-book-open text-3xl" />
            </div>
            <h3 className="text-xl font-bold text-theme-primary mb-2">Resources</h3>
            <p className="text-theme-secondary text-sm">Manage categories, YouTube videos, PDFs, links, playlist imports, and published learning materials.</p>
          </Link>
        </div>
      </main>

      {/* Admin Logout Confirmation Modal */}
      {showLogoutDialog && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm modal-backdrop" onClick={() => setShowLogoutDialog(false)} />
          <div className="relative bg-theme-surface border border-theme-border rounded-3xl p-8 max-w-sm w-full shadow-2xl modal-panel text-theme-primary">
            <div className="w-16 h-16 rounded-full bg-theme-bg text-theme-secondary flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-sign-out-alt text-3xl" />
            </div>
            <h3 className="text-2xl font-black text-center mb-2">Admin Logout?</h3>
            <p className="text-theme-secondary text-center mb-8">
              Are you sure you want to securely log out of the admin session?
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowLogoutDialog(false)}
                className="flex-1 px-4 py-3 rounded-xl font-bold bg-theme-bg text-theme-secondary hover:text-theme-primary transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setShowLogoutDialog(false)
                  logout()
                }}
                className="flex-1 px-4 py-3 rounded-xl font-bold bg-theme-accent text-white hover:opacity-90 transition-colors shadow-md"
              >
                Logout
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
