'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { getPlannerData } from '../actions'
import {
  getLocalDateString,
  getCurrentStreak,
  getBestStreak,
  get7DayAverage,
  getWeekOverWeekComparison,
  getPowerDays,
  getConsistencyScore,
  getTotalActiveDays,
} from '@/lib/analytics'

export default function HistoryPage() {
  const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
  const { user, isLoaded } = hasClerk ? useUser() : { user: null, isLoaded: true }

  const [habits, setHabits] = useState([])
  const [habitHistory, setHabitHistory] = useState({})
  const [weeks, setWeeks] = useState([])
  
  const [filter, setFilter] = useState('all') // 'all', 'tasks', 'habits'
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(getLocalDateString())
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date())

  const loadData = useCallback(async () => {
    try {
      const data = await getPlannerData()
      if (data) {
        setHabits(data.habits || [])
        setHabitHistory(data.habitHistory || {})
        setWeeks(data.weeks || [])
      }
    } catch (error) {
      console.error('Failed to load planner data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isLoaded && user) {
      loadData()
    } else if (isLoaded && !user) {
      setLoading(false)
    }
  }, [isLoaded, user, loadData])

  const changeMonth = (offset) => {
    const newMonth = new Date(currentMonthDate)
    newMonth.setMonth(newMonth.getMonth() + offset)
    setCurrentMonthDate(newMonth)
  }

  const currentMonthLabel = currentMonthDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const getDaysInMonth = useCallback(() => {
    const year = currentMonthDate.getFullYear()
    const month = currentMonthDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days = []

    const startPadding = firstDay.getDay()
    const lastDayOfPrevMonth = new Date(year, month, 0).getDate()
    for (let i = startPadding - 1; i >= 0; i--) {
      const day = lastDayOfPrevMonth - i
      const prevDate = new Date(year, month - 1, day)
      days.push({
        date: getLocalDateString(prevDate),
        day: day,
        isCurrentMonth: false,
      })
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d)
      days.push({
        date: getLocalDateString(date),
        day: d,
        isCurrentMonth: true,
      })
    }

    const endPadding = 42 - days.length
    for (let i = 1; i <= endPadding; i++) {
      const nextDate = new Date(year, month + 1, i)
      days.push({
        date: getLocalDateString(nextDate),
        day: nextDate.getDate(),
        isCurrentMonth: false,
      })
    }

    return days
  }, [currentMonthDate])

  const { days, indicators } = useMemo(() => {
    const monthDays = getDaysInMonth()
    const computedIndicators = {}

    monthDays.forEach((day) => {
      const dayHabits = habitHistory[day.date] || {}
      computedIndicators[day.date] = {
        hasHabits: Object.values(dayHabits).some(Boolean),
        hasTasks: weeks.some((week) =>
          week.tasks.some(
            (task) => task.completed && task.completedDate === day.date
          )
        ),
      }
    })

    return { days: monthDays, indicators: computedIndicators }
  }, [habitHistory, weeks, getDaysInMonth])

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const hasAnyData = Object.keys(habitHistory).length > 0 || weeks.some((w) => w.tasks.some((t) => t.completed))

  const overallProgress = useMemo(() => {
    let completed = 0
    let total = 0
    weeks.forEach((week) => {
      week.tasks.forEach((task) => {
        total++
        if (task.completed) completed++
      })
    })
    return {
      completed,
      total,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  }, [weeks])

  const getWeekProgress = (weekIndex) => {
    const week = weeks[weekIndex]
    if (!week) return { completed: 0, total: 0, percent: 0 }
    const total = week.tasks.length
    const completed = week.tasks.filter((t) => t.completed).length
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0
    return { completed, total, percent }
  }

  const habitProgress = useMemo(() => {
    const totalDays = Object.keys(habitHistory).length
    if (totalDays === 0 || habits.length === 0) return 0

    let totalCompleted = 0
    Object.values(habitHistory).forEach((dayHabits) => {
      totalCompleted += Object.values(dayHabits).filter(Boolean).length
    })

    return Math.round((totalCompleted / (totalDays * habits.length)) * 100)
  }, [habitHistory, habits])

  const last7Days = useMemo(() => {
    const d = []
    const today = new Date()
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)
      d.push(getLocalDateString(date))
    }
    return d
  }, [])

  const getDailyHabitProgress = (date) => {
    if (habits.length === 0) return 0
    const dayHabits = habitHistory[date] || {}
    const completedCount = Object.values(dayHabits).filter(Boolean).length
    return Math.round((completedCount / habits.length) * 100)
  }

  const habitStreak = useMemo(() => getCurrentStreak(habits, habitHistory), [habits, habitHistory])
  const bestStreak = useMemo(() => getBestStreak(habits, habitHistory), [habits, habitHistory])
  const weekOverWeek = useMemo(() => getWeekOverWeekComparison(weeks), [weeks])
  const powerDays = useMemo(() => getPowerDays(habits, habitHistory, weeks), [habits, habitHistory, weeks])
  const consistencyScore = useMemo(() => getConsistencyScore(habitHistory, weeks), [habitHistory, weeks])
  const totalActiveDays = useMemo(() => getTotalActiveDays(habitHistory, weeks), [habitHistory, weeks])
  const sevenDayAvg = useMemo(() => get7DayAverage(habits, habitHistory), [habits, habitHistory])

  const totalHabitsCompleted = useMemo(() => {
    let total = 0
    Object.values(habitHistory).forEach((dayHabits) => {
      total += Object.values(dayHabits).filter(Boolean).length
    })
    return total
  }, [habitHistory])

  if (!isLoaded || loading) {
    return (
      <div className="bg-theme-bg min-h-screen text-theme-primary transition-theme flex flex-col page-enter">
        <main className="flex-grow py-8 sm:py-12 px-4 md:px-8 max-w-5xl w-full mx-auto relative mb-20 space-y-8">
          <div className="flex items-center space-x-4">
            <div className="skeleton w-10 h-10 rounded-full shrink-0" />
            <div className="skeleton h-10 w-64 rounded-xl" />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="skeleton h-24 w-full rounded-3xl" />
            ))}
          </div>

          <div className="skeleton h-16 w-full rounded-2xl" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-8">
              <div className="skeleton h-80 w-full rounded-3xl" />
              <div className="skeleton h-80 w-full rounded-3xl" />
            </div>
            <div className="lg:col-span-5 space-y-8">
              <div className="skeleton h-96 w-full rounded-3xl" />
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="bg-theme-bg min-h-screen text-theme-primary transition-theme flex flex-col page-enter">
      <main className="flex-grow py-8 sm:py-12 px-4 md:px-8 max-w-5xl w-full mx-auto relative mb-20">
        
        {!user ? (
          <div className="mt-10 max-w-lg mx-auto bg-theme-surface border border-theme-border rounded-3xl p-10 text-center shadow-xl transition-all duration-300 hover:shadow-2xl">
            <div className="w-20 h-20 mx-auto bg-theme-accent/10 text-theme-accent rounded-full flex items-center justify-center mb-6">
              <i className="fas fa-lock text-3xl" />
            </div>
            <h2 className="text-3xl font-extrabold mb-4 text-theme-primary tracking-tight">Login Required</h2>
            <p className="text-theme-secondary text-lg leading-relaxed mb-8">
              Please sign in to view and manage your monthly tasks and daily habits history.
            </p>
            <Link href="/sign-in" className="inline-flex items-center gap-2 bg-theme-accent text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-500/30 hover:opacity-90 transition-all hover:-translate-y-0.5 active:scale-95">
              <i className="fas fa-sign-in-alt" /> Sign In Now
            </Link>
          </div>
        ) : (
          <>
            {/* Header Section */}
            <div className="mb-8">
              <div className="flex items-center space-x-4 mb-2">
                <Link href="/tasks" className="w-10 h-10 shrink-0 rounded-full bg-theme-surface border border-theme-border flex items-center justify-center text-theme-secondary hover:text-theme-primary hover:border-theme-primary hover:shadow-md transition-all hover:-translate-y-0.5">
                  <i className="fas fa-arrow-left" />
                </Link>
                <h2 className="text-3xl font-extrabold text-theme-primary tracking-tight">History & Analytics</h2>
              </div>
              
              <div>
                <p className="text-theme-secondary mb-6">Track your progress and build consistency.</p>
                
                {/* Segmented Control / Filters */}
                <div className="flex">
                  <div className="flex bg-theme-surface border border-theme-border p-1.5 rounded-2xl shadow-sm w-full md:w-auto">
                    {['all', 'tasks', 'habits'].map((f) => (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-sm font-bold capitalize transition-all duration-300 ${
                          filter === f
                            ? 'bg-theme-accent text-white shadow-md transform scale-[1.02]'
                            : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-bg'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {!hasAnyData ? (
              <div className="bg-theme-surface border border-theme-border rounded-3xl p-12 text-center shadow-lg">
                <div className="w-24 h-24 mx-auto bg-theme-accent/10 text-theme-accent rounded-full flex items-center justify-center mb-6">
                  <i className="fas fa-chart-line text-4xl opacity-80" />
                </div>
                <h3 className="text-2xl font-bold mb-2">No History Data Yet</h3>
                <p className="text-theme-secondary text-lg max-w-md mx-auto">Start completing your daily habits and weekly tasks to see your analytics and progress charts here!</p>
              </div>
            ) : (
              <div className="space-y-8">
                
                {/* Top Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[
                    { label: 'Current Streak', value: habitStreak, icon: 'fa-fire', color: 'text-orange-500', bg: 'bg-orange-500/10' },
                    { label: 'Best Streak', value: bestStreak, icon: 'fa-trophy', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
                    { label: 'Power Days', value: powerDays.length, icon: 'fa-bolt', color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
                    { label: '7-Day Avg', value: `${sevenDayAvg}%`, icon: 'fa-chart-pie', color: 'text-blue-500', bg: 'bg-blue-500/10' },
                    { label: 'Consistency', value: consistencyScore, icon: 'fa-bullseye', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                    { label: 'Active Days', value: totalActiveDays, icon: 'fa-calendar-check', color: 'text-purple-500', bg: 'bg-purple-500/10' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-theme-surface border border-theme-border rounded-3xl p-5 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-all hover:-translate-y-1 relative overflow-hidden group">
                      <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full ${stat.bg} opacity-50 group-hover:scale-150 transition-transform duration-500`} />
                      <i className={`fas ${stat.icon} ${stat.color} text-2xl mb-3`} />
                      <span className="text-3xl font-extrabold text-theme-primary tracking-tight">{stat.value}</span>
                      <span className="text-xs font-bold text-theme-secondary uppercase tracking-wider mt-2">{stat.label}</span>
                    </div>
                  ))}
                </div>

                {/* Trend Bar */}
                <div className="bg-gradient-to-r from-theme-surface to-theme-bg border border-theme-border rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-theme-accent" />
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-theme-accent/10 text-theme-accent flex items-center justify-center">
                      <i className="fas fa-chart-line text-xl" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-theme-primary">Weekly Momentum</h3>
                      <p className="text-theme-secondary text-sm">Tasks completed this week vs last week</p>
                    </div>
                  </div>
                  
                  <div className={`flex items-center space-x-3 font-bold px-5 py-2.5 rounded-2xl text-base ${
                    weekOverWeek.direction === 'up' ? 'bg-green-500/10 text-green-600 border border-green-500/20' :
                    weekOverWeek.direction === 'down' ? 'bg-red-500/10 text-red-600 border border-red-500/20' :
                    'bg-theme-border text-theme-secondary'
                  }`}>
                    <i className={`fas ${
                      weekOverWeek.direction === 'up' ? 'fa-arrow-up' :
                      weekOverWeek.direction === 'down' ? 'fa-arrow-down' : 'fa-minus'
                    } ${weekOverWeek.direction === 'up' ? 'animate-bounce' : ''}`} />
                    <span>
                      {weekOverWeek.thisWeek} vs {weekOverWeek.lastWeek}
                      {weekOverWeek.changePercent > 0 && <span className="ml-1 opacity-80">({weekOverWeek.direction === 'up' ? '+' : '-'}{weekOverWeek.changePercent}%)</span>}
                    </span>
                  </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Left Column (Charts) */}
                  <div className="lg:col-span-7 space-y-8">
                    
                    {/* Habit Progress Chart */}
                    {(filter === 'all' || filter === 'habits') && (
                      <div className="bg-theme-surface border border-theme-border rounded-3xl p-6 md:p-8 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                          <h3 className="text-xl font-bold flex items-center gap-3">
                            <div className="w-2 h-6 bg-theme-accent rounded-full shrink-0" />
                            Daily Habit Progress
                          </h3>
                          <span className="text-xs sm:text-sm font-semibold text-theme-secondary bg-theme-bg px-3 py-1 rounded-full whitespace-nowrap shrink-0">Last 7 Days</span>
                        </div>
                        
                        <div className="flex justify-between h-56 items-end mb-8 gap-1 sm:gap-2">
                          {last7Days.map((date) => {
                            const progress = getDailyHabitProgress(date)
                            return (
                              <div key={date} className="flex flex-col items-center flex-1 group min-w-0">
                                <div className="w-full max-w-[28px] sm:max-w-[40px] bg-theme-bg rounded-t-xl rounded-b-md h-40 mb-3 relative overflow-hidden group-hover:bg-theme-border transition-colors">
                                  <div 
                                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-theme-accent to-indigo-400 rounded-t-xl rounded-b-md transition-all duration-1000 ease-out" 
                                    style={{ height: `${progress}%` }} 
                                  />
                                </div>
                                <span className="text-[10px] sm:text-sm font-bold text-theme-primary truncate w-full text-center">
                                  {new Date(date + "T00:00:00").toLocaleDateString('en-US', { weekday: 'short' })}
                                </span>
                                <span className="text-[9px] sm:text-xs font-semibold text-theme-secondary bg-theme-bg px-1 sm:px-2 py-0.5 rounded-md mt-1">{progress}%</span>
                              </div>
                            )
                          })}
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 border-t border-theme-border pt-6">
                          <div className="bg-theme-bg rounded-2xl p-4 text-center">
                            <div className="text-2xl font-black text-theme-accent mb-1">{habitStreak}</div>
                            <div className="text-xs font-bold text-theme-secondary uppercase">Day Streak</div>
                          </div>
                          <div className="bg-theme-bg rounded-2xl p-4 text-center">
                            <div className="text-2xl font-black text-theme-accent mb-1">{habitProgress}%</div>
                            <div className="text-xs font-bold text-theme-secondary uppercase">Average</div>
                          </div>
                          <div className="bg-theme-bg rounded-2xl p-4 text-center">
                            <div className="text-2xl font-black text-theme-accent mb-1">{totalHabitsCompleted}</div>
                            <div className="text-xs font-bold text-theme-secondary uppercase">Total Done</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Task Progress Chart */}
                    {(filter === 'all' || filter === 'tasks') && (
                      <div className="bg-theme-surface border border-theme-border rounded-3xl p-6 md:p-8 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                          <h3 className="text-xl font-bold flex items-center gap-3">
                            <div className="w-2 h-6 bg-theme-primary rounded-full" />
                            Monthly Task Completion
                          </h3>
                        </div>
                        
                        <div className="flex justify-between h-56 items-end mb-8 gap-2 sm:gap-4">
                          {weeks.map((week, index) => {
                            const progress = getWeekProgress(index)
                            return (
                              <div key={week.week} className="flex flex-col items-center flex-1 group min-w-0">
                                <div className="w-full max-w-[40px] sm:max-w-[60px] bg-theme-bg rounded-t-xl rounded-b-md h-40 mb-3 relative overflow-hidden group-hover:bg-theme-border transition-colors">
                                  <div 
                                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-theme-primary to-blue-400 rounded-t-xl rounded-b-md transition-all duration-1000 ease-out" 
                                    style={{ height: `${progress.percent}%` }} 
                                  />
                                </div>
                                <span className="text-[10px] sm:text-sm font-bold text-theme-primary truncate w-full text-center">Week {week.week}</span>
                                <span className="text-[9px] sm:text-xs font-semibold text-theme-secondary bg-theme-bg px-1 sm:px-2 py-0.5 rounded-md mt-1">{progress.percent}%</span>
                              </div>
                            )
                          })}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 border-t border-theme-border pt-6">
                          <div className="bg-theme-bg rounded-2xl p-4 text-center flex items-center justify-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-theme-primary/10 flex items-center justify-center text-theme-primary">
                              <i className="fas fa-check-double text-xl" />
                            </div>
                            <div className="text-left">
                              <div className="text-2xl font-black text-theme-primary">{overallProgress.completed} <span className="text-base text-theme-secondary font-medium">/ {overallProgress.total}</span></div>
                              <div className="text-xs font-bold text-theme-secondary uppercase">Tasks Done</div>
                            </div>
                          </div>
                          <div className="bg-theme-bg rounded-2xl p-4 text-center flex items-center justify-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-theme-primary/10 flex items-center justify-center text-theme-primary">
                              <i className="fas fa-percentage text-xl" />
                            </div>
                            <div className="text-left">
                              <div className="text-2xl font-black text-theme-primary">{overallProgress.percent}%</div>
                              <div className="text-xs font-bold text-theme-secondary uppercase">Overall</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column (Calendar & Details) */}
                  <div className="lg:col-span-5 space-y-8">
                    
                    {/* Calendar */}
                    <div className="bg-theme-surface border border-theme-border rounded-3xl p-6 md:p-8 shadow-sm">
                      <div className="flex items-center justify-between mb-8">
                        <button onClick={() => changeMonth(-1)} className="w-10 h-10 rounded-full bg-theme-bg hover:bg-theme-border flex items-center justify-center transition-colors">
                          <i className="fas fa-chevron-left" />
                        </button>
                        <h3 className="text-xl font-extrabold tracking-wide">{currentMonthLabel}</h3>
                        <button onClick={() => changeMonth(1)} className="w-10 h-10 rounded-full bg-theme-bg hover:bg-theme-border flex items-center justify-center transition-colors">
                          <i className="fas fa-chevron-right" />
                        </button>
                      </div>

                      <div className="grid grid-cols-7 gap-2 mb-4">
                        {weekDays.map(day => (
                          <div key={day} className="text-center text-xs font-black text-theme-secondary uppercase tracking-wider py-1">
                            {day}
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-7 gap-2">
                        {days.map((day, index) => {
                          const isToday = day.date === getLocalDateString(new Date()) && day.isCurrentMonth
                          const isSelected = selectedDate === day.date
                          const dayProgress = getDailyHabitProgress(day.date)
                          
                          let heatmapClass = ''
                          if (day.isCurrentMonth && dayProgress > 0) {
                            if (dayProgress <= 33) heatmapClass = 'bg-theme-accent/20 text-theme-accent font-bold'
                            else if (dayProgress <= 66) heatmapClass = 'bg-theme-accent/40 text-theme-accent font-bold'
                            else if (dayProgress <= 99) heatmapClass = 'bg-theme-accent/70 text-white font-bold'
                            else heatmapClass = 'bg-theme-accent text-white font-bold shadow-md'
                          }

                          return (
                            <button
                              key={index}
                              onClick={() => setSelectedDate(day.date)}
                              className={`aspect-square rounded-xl flex items-center justify-center text-sm transition-all relative overflow-hidden group
                                ${!day.isCurrentMonth ? 'opacity-30 font-medium' : 'font-semibold'}
                                ${isSelected ? 'ring-2 ring-theme-primary ring-offset-2 ring-offset-theme-surface scale-105 z-10' : ''}
                                ${isToday && !heatmapClass ? 'border-2 border-theme-primary text-theme-primary font-bold' : ''}
                                ${heatmapClass || 'hover:bg-theme-bg hover:scale-110 z-0'}
                              `}
                            >
                              {day.day}
                              {indicators[day.date]?.hasTasks && (
                                <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-theme-primary" />
                              )}
                            </button>
                          )
                        })}
                      </div>
                      
                      <div className="flex justify-center items-center gap-6 mt-8 pt-6 border-t border-theme-border">
                        <div className="flex items-center gap-2 bg-theme-bg px-3 py-1.5 rounded-full">
                          <div className="w-2.5 h-2.5 rounded-full bg-theme-primary" />
                          <span className="text-xs font-bold text-theme-secondary uppercase tracking-wider">Has Tasks</span>
                        </div>
                        <div className="flex items-center gap-2 bg-theme-bg px-3 py-1.5 rounded-full">
                          <div className="w-2.5 h-2.5 rounded-full bg-theme-accent" />
                          <span className="text-xs font-bold text-theme-secondary uppercase tracking-wider">Habits</span>
                        </div>
                      </div>
                    </div>

                    {/* Selected Date Details */}
                    {selectedDate && (habits.length > 0 || weeks.some(w => w.tasks.some(t => t.completed && t.completedDate === selectedDate))) && (
                      <div className="bg-theme-surface border border-theme-border rounded-3xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                          <h4 className="text-lg font-bold">
                            {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: 'long', month: "short", day: "numeric" })}
                          </h4>
                          {selectedDate === getLocalDateString(new Date()) && (
                            <span className="bg-theme-primary/10 text-theme-primary text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Today</span>
                          )}
                        </div>
                        
                        <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                          {/* Tasks Section */}
                          {weeks.flatMap(w => w.tasks.filter(t => t.completed && t.completedDate === selectedDate).map(t => ({...t, weekTitle: w.title}))).map((task) => (
                            <div key={task.id} className="flex items-center justify-between bg-theme-bg hover:bg-theme-border/50 transition-colors p-4 rounded-2xl border border-theme-border group">
                              <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-500/20 text-blue-500">
                                  <i className="fas fa-check-double text-sm" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-bold text-theme-primary">{task.desc}</span>
                                  <span className="text-[10px] text-theme-secondary font-bold uppercase mt-0.5">{task.weekTitle}</span>
                                </div>
                              </div>
                              <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-md animate-in zoom-in duration-300">
                                <i className="fas fa-check text-sm" />
                              </div>
                            </div>
                          ))}

                          {/* Habits Section */}
                          {habits.map((habit) => {
                            const isCompleted = habitHistory[selectedDate]?.[habit.id]
                            return (
                              <div key={habit.id} className="flex items-center justify-between bg-theme-bg hover:bg-theme-border/50 transition-colors p-4 rounded-2xl border border-theme-border group">
                                <div className="flex items-center space-x-4">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                                    isCompleted ? 'bg-theme-accent/20 text-theme-accent' : 'bg-theme-border text-theme-secondary'
                                  }`}>
                                    <i className="fas fa-bolt text-sm" />
                                  </div>
                                  <span className={`font-semibold ${isCompleted ? 'text-theme-primary' : 'text-theme-secondary'}`}>
                                    {habit.label}
                                  </span>
                                </div>
                                <div>
                                  {isCompleted ? (
                                    <div className="w-8 h-8 rounded-full bg-theme-accent text-white flex items-center justify-center shadow-md animate-in zoom-in duration-300">
                                      <i className="fas fa-check text-sm" />
                                    </div>
                                  ) : (
                                    <div className="w-8 h-8 rounded-full border-2 border-theme-border text-theme-secondary/30 flex items-center justify-center group-hover:border-theme-secondary/50 transition-colors">
                                      <i className="fas fa-times text-sm" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
