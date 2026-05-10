'use client'

import { useState, useMemo } from 'react'

export default function HabitCard({
  habits = [],
  history = {},
  today,
  onToggleHabit,
  onCompleteAllHabits,
  onEditHabit,
  onDeleteHabit,
  onAddHabit,
}) {
  const [newHabitText, setNewHabitText] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const todayHabits = history[today] || {}

  const handleToggle = (habitId) => {
    if (editingId) return
    onToggleHabit(habitId)
  }

  const handleAdd = () => {
    if (newHabitText.trim()) {
      onAddHabit(newHabitText.trim().slice(0, 100))
      setNewHabitText('')
    }
  }

  const handleStartEdit = (habit) => {
    setEditingId(habit.id)
    setEditText(habit.label)
  }

  const handleSaveEdit = () => {
    if (editingId && editText.trim()) {
      onEditHabit(editingId, editText.trim().slice(0, 100))
      setEditingId(null)
      setEditText('')
    }
  }

  const handleCompleteAll = () => {
    const incompleteIds = habits.filter((h) => !todayHabits[h.id]).map((h) => h.id)
    if (incompleteIds.length > 0) {
      onCompleteAllHabits(incompleteIds)
    }
  }

  const getDayProgress = (dateStr) => {
    if (habits.length === 0) return 0
    const dayHabits = history[dateStr] || {}
    const completedCount = Object.values(dayHabits).filter(Boolean).length
    return Math.round((completedCount / habits.length) * 100)
  }

  const getMonthDays = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days = []

    const startPadding = firstDay.getDay()
    for (let i = 0; i < startPadding; i++) {
      days.push(null)
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i)
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      days.push({ date: d, dateStr })
    }

    while (days.length % 7 !== 0) {
      days.push(null)
    }

    return days
  }

  const monthDays = useMemo(() => getMonthDays(currentMonth), [currentMonth])

  const formatHeaderDate = (dateStr) => {
    if (!dateStr) return ''
    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return {
      date: date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }
  }

  const headerDateInfo = formatHeaderDate(today)

  return (
    <div className="bg-theme-surface border border-theme-border rounded-2xl p-6 shadow-md mb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <i className="fas fa-bolt text-theme-accent text-xl" />
          <h2 className="text-xl font-bold text-theme-primary tracking-tight">Daily Habits Tracker</h2>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-theme-accent">{headerDateInfo.date}</span>
        </div>
      </div>

      {/* Add Habit Input */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          className="flex-1 bg-theme-bg border border-theme-border rounded-lg px-4 py-3 text-sm text-theme-primary focus:outline-none focus:border-theme-accent transition-colors shadow-inner"
          placeholder="Type a new daily habit (e.g. 'Read 5 pages')..."
          value={newHabitText}
          onChange={(e) => setNewHabitText(e.target.value.slice(0, 100))}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          maxLength={100}
        />
        <button
          onClick={handleAdd}
          className="bg-theme-accent text-white px-6 py-3 sm:py-0 rounded-lg hover:opacity-90 active:scale-95 transition-all shadow-sm font-bold text-sm whitespace-nowrap"
        >
          + Add
        </button>
      </div>

      {/* Complete All */}
      {habits.length > 0 && !(habits.length > 0 && habits.every((h) => todayHabits[h.id])) && (
        <button
          onClick={handleCompleteAll}
          className="w-full flex items-center justify-center gap-2 bg-theme-surfaceElevated border border-theme-border rounded-xl py-3 mb-6 hover:bg-theme-bg transition-colors text-theme-primary font-semibold text-sm"
        >
          <i className="fas fa-check-double text-theme-accent" />
          Complete All
        </button>
      )}

      {/* Habits Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {habits.map((habit) => {
          const isChecked = todayHabits[habit.id] || false
          const isEditing = editingId === habit.id

          return (
            <div
              key={habit.id}
              className={`flex items-center p-4 rounded-xl border transition-all cursor-pointer ${
                isChecked
                  ? 'bg-theme-surfaceElevated border-theme-border opacity-60'
                  : 'bg-theme-surfaceElevated border-theme-border hover:border-theme-accent hover:shadow-sm'
              }`}
              onClick={() => handleToggle(habit.id)}
            >
              {/* Square Checkbox */}
              <div
                className={`w-5 h-5 rounded-[4px] border-2 mr-3 flex items-center justify-center transition-colors shrink-0 ${
                  isChecked
                    ? 'bg-theme-accent border-theme-accent'
                    : 'border-theme-secondary opacity-40'
                }`}
              >
                {isChecked && <i className="fas fa-check text-white text-[10px]" />}
              </div>

              {/* Label */}
              <div className="flex-1 overflow-hidden">
                {isEditing ? (
                  <input
                    type="text"
                    className="w-full bg-theme-bg border border-theme-accent rounded px-2 py-1 text-sm text-theme-primary focus:outline-none"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value.slice(0, 100))}
                    onBlur={handleSaveEdit}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                    maxLength={100}
                  />
                ) : (
                  <p
                    className={`text-sm font-medium truncate ${
                      isChecked ? 'line-through text-theme-secondary' : 'text-theme-primary'
                    }`}
                  >
                    {habit.label}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex shrink-0 ml-2">
                {!isEditing && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleStartEdit(habit)
                    }}
                    className="p-1 text-theme-secondary hover:text-theme-primary transition-colors rounded hover:bg-theme-bg mr-1"
                  >
                    <i className="fas fa-pencil-alt text-xs" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteHabit(habit.id)
                  }}
                  className="p-1 text-theme-secondary hover:text-red-500 transition-colors rounded hover:bg-theme-bg"
                >
                  <i className="fas fa-times text-xs" />
                </button>
              </div>
            </div>
          )
        })}
        {habits.length === 0 && (
          <p className="col-span-1 sm:col-span-2 text-center text-theme-secondary text-sm py-4">
            No habits yet. Add one above!
          </p>
        )}
      </div>

      {/* Calendar History */}
      <div className="border-t border-theme-border pt-6 mt-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-theme-secondary mb-4">
          Habit History
        </h3>

        <div className="max-w-md mx-auto">
          {/* Month Nav */}
          <div className="flex justify-center items-center gap-4 mb-4">
            <button
              onClick={() => {
                const d = new Date(currentMonth)
                d.setMonth(d.getMonth() - 1)
                setCurrentMonth(d)
              }}
              className="p-1 text-theme-secondary hover:text-theme-primary transition-colors"
            >
              <i className="fas fa-chevron-left" />
            </button>
            <span className="text-sm font-bold w-36 text-center text-theme-primary">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={() => {
                const d = new Date(currentMonth)
                d.setMonth(d.getMonth() + 1)
                setCurrentMonth(d)
              }}
              className="p-1 text-theme-secondary hover:text-theme-primary transition-colors"
            >
              <i className="fas fa-chevron-right" />
            </button>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day} className="text-center text-[10px] font-bold text-theme-secondary mb-2">
                {day}
              </div>
            ))}
            {monthDays.map((dayObj, index) => {
              if (!dayObj) return <div key={`empty-${index}`} className="aspect-square" />

              const { dateStr, date: d } = dayObj
              const percent = getDayProgress(dateStr)
              const isToday = dateStr === today
              const isCurrentMonth = d.getMonth() === currentMonth.getMonth()

              return (
                <div
                  key={dateStr}
                  className={`group relative aspect-square rounded-lg border overflow-hidden flex items-center justify-center ${
                    isToday ? 'border-theme-accent' : 'border-theme-border'
                  } ${!isCurrentMonth ? 'opacity-30' : ''} bg-theme-surfaceElevated`}
                >
                  {/* Fill */}
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-theme-accent transition-all duration-500"
                    style={{ height: `${percent}%` }}
                  />
                  
                  <span className={`relative z-10 text-xs sm:text-sm font-semibold ${isToday ? 'text-theme-primary font-extrabold' : 'text-theme-primary'}`}>
                    {d.getDate()}
                  </span>
                  {percent > 0 && (
                    <div className="absolute bottom-1 w-1 h-1 rounded-full bg-theme-accent z-20" />
                  )}

                  {/* Tooltip for progress */}
                  <div className="absolute opacity-0 group-hover:opacity-100 bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black text-white text-[10px] whitespace-nowrap rounded pointer-events-none z-10 transition-opacity">
                    {percent}%
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex justify-center gap-4 sm:gap-8 mt-6">
            {[25, 50, 75, 100].map(val => (
              <div key={val} className="flex items-center gap-1.5">
                <div className="w-3 h-5 rounded-[2px] bg-theme-bg border border-theme-border overflow-hidden flex flex-col justify-end">
                  <div className="w-full bg-theme-accent" style={{ height: `${val}%` }} />
                </div>
                <span className="text-[10px] sm:text-xs text-theme-secondary font-medium">{val}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
