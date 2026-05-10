'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import ProgressBar from '@/components/tasks/ProgressBar'
import HabitCard from '@/components/tasks/HabitCard'
import WeekCard from '@/components/tasks/WeekCard'
import { getPlannerData, updatePlannerData, resetPlannerData } from './actions'

export default function TasksPage() {
  const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
  const { user, isLoaded } = hasClerk ? useUser() : { user: null, isLoaded: true }
  
  const [plannerData, setPlannerData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showResetDialog, setShowResetDialog] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const data = await getPlannerData()
      if (data) {
        setPlannerData(data)
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

  const getLocalDateString = (date = new Date()) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const today = useMemo(() => getLocalDateString(), [])

  const progress = useMemo(() => {
    if (!plannerData) return { completed: 0, total: 0, percent: 0 }
    let completed = 0
    let total = 0

    // Include weekly tasks only
    plannerData.weeks.forEach(week => {
      week.tasks.forEach(task => {
        total++
        if (task.completed) completed++
      })
    })
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0
    return { completed, total, percent }
  }, [plannerData, today])

  // Helpers to update state and DB optimistically
  const syncData = async (newData) => {
    setPlannerData(newData)
    try {
      await updatePlannerData(newData)
    } catch (e) {
      console.error('Sync failed', e)
    }
  }

  // Habits
  const handleToggleHabit = (habitId) => {
    const newHistory = { ...plannerData.habitHistory }
    if (!newHistory[today]) newHistory[today] = {}
    newHistory[today][habitId] = !newHistory[today][habitId]
    syncData({ ...plannerData, habitHistory: newHistory })
  }

  const handleCompleteAllHabits = (habitIds) => {
    const newHistory = { ...plannerData.habitHistory }
    if (!newHistory[today]) newHistory[today] = {}
    habitIds.forEach(id => { newHistory[today][id] = true })
    syncData({ ...plannerData, habitHistory: newHistory })
  }

  const handleAddHabit = (label) => {
    const newHabits = [...plannerData.habits, { id: `habit_${Date.now()}`, label }]
    syncData({ ...plannerData, habits: newHabits })
  }

  const handleEditHabit = (habitId, label) => {
    const newHabits = plannerData.habits.map(h => h.id === habitId ? { ...h, label } : h)
    syncData({ ...plannerData, habits: newHabits })
  }

  const handleDeleteHabit = (habitId) => {
    const newHabits = plannerData.habits.filter(h => h.id !== habitId)
    const newHistory = { ...plannerData.habitHistory }
    Object.keys(newHistory).forEach(date => {
      if (newHistory[date][habitId] !== undefined) {
        delete newHistory[date][habitId]
      }
    })
    syncData({ ...plannerData, habits: newHabits, habitHistory: newHistory })
  }

  // Tasks
  const handleToggleTask = (weekIndex, taskId) => {
    const newWeeks = [...plannerData.weeks]
    const task = newWeeks[weekIndex].tasks.find(t => t.id === taskId)
    if (task) {
      task.completed = !task.completed
      task.completedDate = task.completed ? today : undefined
      syncData({ ...plannerData, weeks: newWeeks })
    }
  }

  const handleAddTask = (weekIndex, task) => {
    const newWeeks = [...plannerData.weeks]
    newWeeks[weekIndex].tasks.push({ ...task, id: `t${Date.now()}`, completed: false })
    syncData({ ...plannerData, weeks: newWeeks })
  }

  const handleEditTask = (weekIndex, taskId, updates) => {
    const newWeeks = [...plannerData.weeks]
    const taskIndex = newWeeks[weekIndex].tasks.findIndex(t => t.id === taskId)
    if (taskIndex !== -1) {
      newWeeks[weekIndex].tasks[taskIndex] = { ...newWeeks[weekIndex].tasks[taskIndex], ...updates }
      syncData({ ...plannerData, weeks: newWeeks })
    }
  }

  const handleDeleteTask = (weekIndex, taskId) => {
    const newWeeks = [...plannerData.weeks]
    newWeeks[weekIndex].tasks = newWeeks[weekIndex].tasks.filter(t => t.id !== taskId)
    syncData({ ...plannerData, weeks: newWeeks })
  }

  const handleResetData = async () => {
    try {
      const resetData = await resetPlannerData()
      if (resetData) {
        setPlannerData(resetData)
        setShowResetDialog(false)
      }
    } catch (e) {
      console.error('Failed to reset data', e)
    }
  }

  if (!isLoaded || loading) {
    return (
      <div className="bg-theme-bg min-h-screen text-theme-primary transition-theme flex flex-col page-enter">
        <main className="flex-grow py-8 sm:py-12 px-4 max-w-4xl w-full mx-auto relative space-y-8">
          <div className="skeleton h-12 w-full rounded-2xl" />
          <div className="skeleton h-40 w-full rounded-3xl" />
          <div className="space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-32 w-full rounded-3xl" />
            ))}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="bg-theme-bg min-h-screen text-theme-primary transition-theme flex flex-col page-enter">
      <main className="flex-grow py-8 sm:py-12 px-4 max-w-4xl w-full mx-auto relative">
        
        {!user ? (
          <div className="mt-10 max-w-lg mx-auto bg-theme-surface border border-theme-border rounded-3xl p-10 text-center shadow-xl transition-all duration-300 hover:shadow-2xl">
            <div className="w-20 h-20 mx-auto bg-theme-accent/10 text-theme-accent rounded-full flex items-center justify-center mb-6">
              <i className="fas fa-lock text-3xl" />
            </div>
            <h2 className="text-3xl font-extrabold mb-4 text-theme-primary tracking-tight">Login Required</h2>
            <p className="text-theme-secondary text-lg leading-relaxed mb-8">
              Please sign in to view and manage your monthly tasks and daily habits.
            </p>
            <Link href="/sign-in" className="inline-flex items-center gap-2 bg-theme-accent text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-500/30 hover:opacity-90 transition-all hover:-translate-y-0.5 active:scale-95">
              <i className="fas fa-sign-in-alt" /> Sign In Now
            </Link>
          </div>
        ) : (
          <>


            <ProgressBar percent={progress.percent} completed={progress.completed} total={progress.total} />

            {plannerData && (
              <>
                <HabitCard
                  habits={plannerData.habits}
                  history={plannerData.habitHistory}
                  today={today}
                  onToggleHabit={handleToggleHabit}
                  onCompleteAllHabits={handleCompleteAllHabits}
                  onAddHabit={handleAddHabit}
                  onEditHabit={handleEditHabit}
                  onDeleteHabit={handleDeleteHabit}
                />

                <div className="space-y-6">
                  {plannerData.weeks.map((week, index) => (
                    <WeekCard
                      key={week.week}
                      week={week}
                      weekIndex={index}
                      onToggleTask={handleToggleTask}
                      onAddTask={handleAddTask}
                      onEditTask={handleEditTask}
                      onDeleteTask={handleDeleteTask}
                    />
                  ))}
                </div>

                {/* Reset Data Section */}
                <div className="mt-16 text-center pb-20">
                  <button 
                    onClick={() => setShowResetDialog(true)}
                    className="bg-theme-error-bg text-theme-error-text hover:bg-red-500/10 transition-colors px-6 py-3 rounded-xl font-bold shadow-sm inline-flex items-center gap-2 border border-theme-error-border"
                  >
                    <i className="fas fa-trash-alt" /> Reset Data
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </main>

      {/* Reset Confirmation Modal */}
      {showResetDialog && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm modal-backdrop" onClick={() => setShowResetDialog(false)} />
          <div className="relative bg-theme-surface border border-theme-border rounded-3xl p-8 max-w-sm w-full shadow-2xl modal-panel text-theme-primary">
            <div className="w-16 h-16 rounded-full bg-theme-error-bg text-theme-error-text flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-exclamation-triangle text-3xl" />
            </div>
            <h3 className="text-2xl font-black text-center mb-2">Reset Data?</h3>
            <p className="text-theme-secondary text-center mb-8">
              Are you sure you want to clear all your tasks and habits? This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowResetDialog(false)}
                className="flex-1 px-4 py-3 rounded-xl font-bold bg-theme-bg text-theme-secondary hover:text-theme-primary transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleResetData}
                className="flex-1 px-4 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 transition-colors shadow-md"
              >
                Reset
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
