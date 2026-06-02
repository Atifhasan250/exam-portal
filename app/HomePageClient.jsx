'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useUser } from '@clerk/nextjs'
import { useTheme } from '@/context/ThemeContext'

const LaserFlow = dynamic(() => import('@/components/LaserFlow'), { ssr: false })

export default function HomePageClient() {
  const { user } = useUser()
  const { theme, themeLoaded } = useTheme()
  const [laserProfile, setLaserProfile] = useState('off')
  const isDark = theme === 'dark'

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const pointerQuery = window.matchMedia('(pointer: coarse)')
    const update = () => {
      if (motionQuery.matches) {
        setLaserProfile('off')
        return
      }

      setLaserProfile(!pointerQuery.matches && window.innerWidth >= 900 ? 'desktop' : 'mobile')
    }
    update()
    motionQuery.addEventListener('change', update)
    pointerQuery.addEventListener('change', update)
    window.addEventListener('resize', update)
    return () => {
      motionQuery.removeEventListener('change', update)
      pointerQuery.removeEventListener('change', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return (
    <div className="bg-theme-bg text-theme-primary transition-theme flex flex-col page-enter">

      {/* ── HERO SECTION — fills the viewport ────────────────────────── */}
      <section className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-10 sm:py-0">
        <div className="relative w-full max-w-6xl mx-auto sm:mt-[80px]">

          {/* LaserFlow — 250px above the card top */}
          {themeLoaded && isDark && laserProfile !== 'off' ? (
            <div className="absolute top-[-250px] w-full h-[500px] pointer-events-none z-0">
              <LaserFlow
                color="#6366F1"
                horizontalBeamOffset={0.15}
                verticalBeamOffset={0}
                verticalSizing={1.2}
                horizontalSizing={0.8}
                flowSpeed={0.5}
                wispDensity={1.5}
                fogIntensity={0.6}
                dpr={laserProfile === 'desktop' ? 1 : 0.75}
              />
            </div>
          ) : null}

          {/* Hero card */}
          <div
            className={`relative z-10 w-full rounded-[2rem] border overflow-hidden p-8 sm:p-16 transition-all duration-500 ${isDark
              ? 'border-[#B497CF]/30 bg-[#120F17]/80 backdrop-blur-md shadow-[0_-20px_60px_-15px_rgba(180,151,207,0.25)]'
              : 'border-theme-border bg-theme-bg shadow-md'
              }`}
          >
            <div
              className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${isDark ? 'opacity-10' : 'opacity-[0.03]'
                }`}
              style={{
                backgroundImage: `radial-gradient(${isDark ? '#B497CF' : '#ea7a53'} 1px, transparent 1px)`,
                backgroundSize: '24px 24px',
              }}
            />
            <div
              className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent ${isDark ? 'via-[#B497CF]' : 'via-theme-accent'} to-transparent transition-opacity duration-500 ${isDark ? 'opacity-90' : 'opacity-40'
                }`}
            />

            <div className="text-center space-y-8 relative z-20">
              <div className="space-y-4">
                <h1 className="text-5xl font-extrabold text-theme-primary">IT Resource Zone</h1>
                <p className="text-lg text-theme-secondary max-w-2xl mx-auto">
                  A focused IT learning portal for live exams, practice attempts, instant score
                  review, private progress tracking, study planning, habit building, admin announcements,
                  and curated resources.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/exams"
                  className="w-full sm:w-auto px-8 py-4 bg-theme-accent text-theme-accent-text font-bold rounded-xl hover:-translate-y-1 hover:shadow-xl hover:shadow-theme-accent/30 active:scale-95 shadow-lg transition-all duration-300 flex items-center justify-center space-x-2"
                >
                  <i className="fas fa-rocket" />
                  <span>Browse Exams</span>
                </Link>
                <Link
                  href="/resources"
                  className="w-full sm:w-auto px-8 py-4 bg-theme-bg text-theme-primary border border-theme-border font-bold rounded-xl hover:-translate-y-1 hover:shadow-xl hover:border-theme-primary/40 hover:bg-theme-surface active:scale-95 shadow-sm transition-all duration-300 flex items-center justify-center space-x-2"
                >
                  <i className="fas fa-book-open" />
                  <span>See Resources</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Scroll indicator — desktop only */}
          <div className="hidden sm:flex flex-col items-center gap-2 mt-8">
            <button
              aria-label="Scroll to features"
              onClick={() => {
                const el = document.getElementById('features')
                if (el) {
                  const top = el.getBoundingClientRect().top + window.scrollY - 24
                  window.scrollTo({ top, behavior: 'smooth' })
                }
              }}
              className={`group relative w-[34px] h-[56px] rounded-full border-2 transition-all duration-300 cursor-pointer hover:-translate-y-0.5 ${isDark
                ? 'border-white/25 bg-white/[0.03] hover:border-white/55 hover:bg-white/[0.06]'
                : 'border-theme-accent bg-theme-surface shadow-lg hover:border-theme-primary hover:bg-theme-bg'
                }`}
            >
              <span className={`scroll-indicator-dot absolute left-1/2 top-[10px] w-[6px] h-[6px] rounded-full ${isDark ? 'bg-white/60 group-hover:bg-white/80' : 'bg-theme-accent'
                }`} />
            </button>
            <span className={`text-[10px] uppercase tracking-[0.16em] font-extrabold select-none ${isDark ? 'text-white/35' : 'text-theme-primary opacity-75'
              }`}>
              scroll
            </span>
          </div>
        </div>
      </section>

      {/* ── BELOW THE FOLD ───────────────────────────────────────────── */}
      <div id="features" className="w-full max-w-6xl mx-auto px-4 pb-20">

        {/* Section header */}
        <div className="text-center mb-14 mt-6">
          <span className="inline-block text-xs uppercase tracking-[0.2em] font-bold text-theme-accent bg-theme-accent/10 px-4 py-1.5 rounded-full mb-5">
            Why IT Resource Zone?
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-theme-primary mb-4">
            Built for serious IT learners
          </h2>
          <p className="text-theme-secondary max-w-xl mx-auto leading-relaxed">
            One platform for public exam discovery, signed-in attempts, private dashboards,
            resource progress, planner analytics, and leaderboard motivation.
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid gap-5 sm:grid-cols-2 mb-14">
          {[
            {
              icon: 'fa-graduation-cap',
              badge: 'Core Feature',
              title: 'Live & Practice Exams',
              desc: 'Join scheduled live exams or revisit past exams in practice mode. Attempts are timed, answers lock after selection, and results include score history and review.',
              stat: 'Timed Attempts',
            },
            {
              icon: 'fa-fire',
              badge: 'Build Consistency',
              title: 'Planner, Habits & Notices',
              desc: 'Plan weekly tasks, track daily habits, review streaks and consistency, and use optional browser notifications for admin announcements.',
              stat: 'Private Progress',
            },
            {
              icon: 'fa-trophy',
              badge: 'Stay Motivated',
              title: 'Public Leaderboards',
              desc: 'Compare scores on global and per-exam leaderboards. Rankings help you understand your performance without exposing your private dashboard or history.',
              stat: 'Global & Per-Exam',
            },
            {
              icon: 'fa-book-open',
              badge: 'Resource Library',
              title: 'Curated Learning Resources',
              desc: 'Open signed-in resources including YouTube lessons, PDFs, images, files, and useful links. Your account tracks what you start and complete.',
              stat: 'Progress Tracking',
            },
          ].map((item) => (
            <article
              key={item.title}
              className="relative bg-theme-surface border border-theme-border rounded-2xl p-6 overflow-hidden group hover:border-theme-accent/40 hover:-translate-y-1 hover:shadow-lg hover:shadow-theme-accent/5 transition-all duration-300"
            >
              {/* Hover glow */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
                style={{
                  background: `radial-gradient(ellipse at top left, ${isDark ? 'rgba(99,102,241,0.12)' : 'rgba(234,122,83,0.09)'}, transparent 65%)`,
                }}
              />

              {/* Badge */}
              <span className="inline-block text-[10px] uppercase tracking-widest font-bold text-theme-accent bg-theme-accent/10 px-2.5 py-1 rounded-full mb-5">
                {item.badge}
              </span>

              {/* Icon */}
              <div className="w-13 h-13 w-[52px] h-[52px] rounded-2xl bg-theme-accent/10 flex items-center justify-center mb-5">
                <i className={`fas ${item.icon} text-2xl text-theme-accent`} />
              </div>

              <h3 className="text-lg font-bold text-theme-primary mb-2">{item.title}</h3>
              <p className="text-sm text-theme-secondary leading-relaxed mb-5">{item.desc}</p>

              {/* Stat pill */}
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-theme-accent flex-shrink-0" />
                <span className="text-xs font-semibold text-theme-secondary">{item.stat}</span>
              </div>
            </article>
          ))}
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 rounded-2xl overflow-hidden border border-theme-border mb-14">
          {[
            { value: 'Live', label: 'Timed Exams' },
            { value: 'Past', label: 'Practice Mode' },
            { value: 'Private', label: 'Student Data' },
            { value: 'Public', label: 'Leaderboards' },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className={`bg-theme-surface px-6 py-8 text-center ${i < 3 ? 'border-r border-theme-border' : ''
                } ${i >= 2 ? 'border-t border-theme-border md:border-t-0' : ''}`}
            >
              <p className="text-3xl font-extrabold text-theme-primary tracking-tight">{stat.value}</p>
              <p className="text-xs text-theme-secondary mt-1.5 font-medium uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Weekly planner highlight */}
        <div className="grid md:grid-cols-3 gap-5 mb-14">
          <div className="bg-theme-surface border border-theme-border rounded-2xl p-8 flex flex-col justify-between group hover:border-theme-accent/30 transition-colors duration-300">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-theme-accent/10 flex items-center justify-center mb-5">
                <i className="fas fa-calendar-alt text-xl text-theme-accent" />
              </div>
              <h3 className="text-xl font-bold text-theme-primary mb-3">Weekly Study Planner</h3>
              <p className="text-theme-secondary text-sm leading-relaxed">
                Structure your preparation week-by-week. Add tasks, complete habits, review your history,
                and keep everything synced to your signed-in student account.
              </p>
            </div>
            <Link href="/tasks" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-theme-accent hover:gap-3 transition-all duration-200">
              Open Planner <i className="fas fa-arrow-right text-xs" />
            </Link>
          </div>

          <div className="bg-theme-surface border border-theme-border rounded-2xl p-8 flex flex-col justify-between group hover:border-theme-accent/30 transition-colors duration-300">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-theme-accent/10 flex items-center justify-center mb-5">
                <i className="fas fa-chart-bar text-xl text-theme-accent" />
              </div>
              <h3 className="text-xl font-bold text-theme-primary mb-3">Track Your Growth</h3>
              <p className="text-theme-secondary text-sm leading-relaxed">
                Your dashboard and profile show exam history, score trends, resource progress, account settings,
                and a printable learning report for your own records.
              </p>
            </div>
            <Link href="/profile" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-theme-accent hover:gap-3 transition-all duration-200">
              View Profile <i className="fas fa-arrow-right text-xs" />
            </Link>
          </div>

          <div className="bg-theme-surface border border-theme-border rounded-2xl p-8 flex flex-col justify-between group hover:border-theme-accent/30 transition-colors duration-300">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-theme-accent/10 flex items-center justify-center mb-5">
                <i className="fas fa-book-open text-xl text-theme-accent" />
              </div>
              <h3 className="text-xl font-bold text-theme-primary mb-3">Learning Resources</h3>
              <p className="text-theme-secondary text-sm leading-relaxed">
                Curated YouTube lessons, PDFs, images, files, and useful links picked for beginner IT
                students. Open resources from your account and track completion as you study.
              </p>
            </div>
            <Link href="/resources" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-theme-accent hover:gap-3 transition-all duration-200">
              Explore Resources <i className="fas fa-arrow-right text-xs" />
            </Link>
          </div>
        </div>

        {/* Final CTA */}
        <div className={`relative rounded-2xl border overflow-hidden px-8 py-14 text-center ${isDark
          ? 'border-[#B497CF]/25 bg-[#120F17]/60'
          : 'border-theme-border bg-theme-surface'
          }`}>
          {isDark && (
            <div className="absolute inset-0 pointer-events-none opacity-[0.06]"
              style={{
                backgroundImage: 'radial-gradient(#B497CF 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            />
          )}
          <div className="relative z-10">
            <span className="inline-block text-xs uppercase tracking-[0.2em] font-bold text-theme-accent bg-theme-accent/10 px-4 py-1.5 rounded-full mb-5">
              Get Started
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-theme-primary mb-4">
              Ready to start your IT journey?
            </h3>
            <p className="text-theme-secondary max-w-lg mx-auto mb-8 leading-relaxed">
              Browse exams, create an account for attempts and progress tracking, explore curated
              resources, build daily study habits, and compare scores on public leaderboards.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {!user ? (
                <Link
                  href="/sign-up"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-theme-accent text-theme-accent-text font-bold rounded-xl hover:opacity-90 hover:-translate-y-1 shadow-lg shadow-theme-accent/20 transition-all duration-300"
                >
                  <i className="fas fa-user-plus" />
                  Create Account
                </Link>
              ) : null}
              <Link
                href="/exams"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 border border-theme-border text-theme-primary font-bold rounded-xl hover:border-theme-accent/50 hover:bg-theme-surface hover:-translate-y-1 hover:shadow-lg hover:shadow-theme-accent/10 active:scale-95 transition-all duration-300"
              >
                <i className="fas fa-rocket" />
                Browse All Exams
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
