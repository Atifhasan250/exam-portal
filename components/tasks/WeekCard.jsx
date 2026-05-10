'use client'

import { useState } from 'react'

export default function WeekCard({
  week,
  weekIndex,
  onToggleTask,
  onAddTask,
  onEditTask,
  onDeleteTask,
}) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  
  const [taskForm, setTaskForm] = useState({
    days: '',
    desc: '',
    resource: '',
  })

  const [menuTask, setMenuTask] = useState(null)

  const handleToggle = (taskId) => {
    onToggleTask(weekIndex, taskId)
  }

  const handleAddTask = () => {
    if (taskForm.desc.trim()) {
      onAddTask(weekIndex, {
        days: taskForm.days.slice(0, 50) || `Day ${week.tasks.length + 1}`,
        desc: taskForm.desc.slice(0, 500),
        resource: taskForm.resource ? taskForm.resource.slice(0, 500) : undefined,
      })
      setTaskForm({ days: '', desc: '', resource: '' })
      setShowAddModal(false)
    }
  }

  const handleEditTask = () => {
    if (editingTask && taskForm.desc.trim()) {
      onEditTask(weekIndex, editingTask.id, {
        days: taskForm.days.slice(0, 50),
        desc: taskForm.desc.slice(0, 500),
        resource: taskForm.resource ? taskForm.resource.slice(0, 500) : undefined,
      })
      setShowEditModal(false)
      setEditingTask(null)
    }
  }

  const openEditModal = (task) => {
    setEditingTask(task)
    setTaskForm({
      days: task.days,
      desc: task.desc,
      resource: task.resource || '',
    })
    setShowEditModal(true)
  }

  const formatCompletedDate = (dateStr) => {
    if (!dateStr) return ''
    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Modals
  const renderModal = (title, isEdit) => {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
        <div className="bg-theme-surface border border-theme-border rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
          <h3 className="text-xl font-bold text-theme-primary mb-6 text-center">{title}</h3>
          
          <div className="space-y-4">
            <textarea
              className="w-full bg-theme-bg border border-theme-border rounded-xl p-4 text-sm text-theme-primary focus:outline-none focus:border-theme-accent resize-none h-24"
              placeholder="What do you need to do?"
              value={taskForm.desc}
              onChange={(e) => setTaskForm({ ...taskForm, desc: e.target.value })}
              maxLength={500}
              autoFocus
            />
            
            <input
              type="text"
              className="w-full bg-theme-bg border border-theme-border rounded-xl p-4 text-sm text-theme-primary focus:outline-none focus:border-theme-accent"
              placeholder="Days (e.g., Days 1-3)"
              value={taskForm.days}
              onChange={(e) => setTaskForm({ ...taskForm, days: e.target.value })}
              maxLength={50}
            />

            <input
              type="url"
              className="w-full bg-theme-bg border border-theme-border rounded-xl p-4 text-sm text-theme-primary focus:outline-none focus:border-theme-accent"
              placeholder="Resource link (optional, e.g., https://example.com)"
              value={taskForm.resource}
              onChange={(e) => setTaskForm({ ...taskForm, resource: e.target.value })}
              maxLength={500}
            />
          </div>

          <div className="flex gap-3 mt-8">
            <button
              onClick={() => {
                isEdit ? setShowEditModal(false) : setShowAddModal(false)
              }}
              className="flex-1 bg-theme-surfaceElevated border border-theme-border text-theme-primary py-3 rounded-xl font-bold hover:bg-theme-bg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={isEdit ? handleEditTask : handleAddTask}
              className="flex-1 bg-theme-accent text-white py-3 rounded-xl font-bold hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/20"
            >
              {isEdit ? 'Save' : 'Add Task'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-theme-surface border border-theme-border rounded-2xl p-6 shadow-md mb-6">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-theme-border">
        <h3 className="text-lg font-bold text-theme-primary tracking-wide">
          Week {week.week}
          {week.title && week.title !== `Week ${week.week}` && (
            <span className="ml-2 text-sm font-normal text-theme-secondary">({week.title})</span>
          )}
        </h3>
        
        <button
          onClick={() => {
            setTaskForm({ days: '', desc: '', resource: '' })
            setShowAddModal(true)
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-theme-border rounded-lg text-theme-accent hover:bg-theme-surfaceElevated transition-colors text-xs font-bold"
        >
          <i className="fas fa-plus" /> Add Task
        </button>
      </div>

      {/* Tasks List */}
      <div className="space-y-4">
        {week.tasks.map((task) => (
          <div
            key={task.id}
            className={`flex items-start p-4 rounded-xl border transition-all cursor-pointer ${
              task.completed
                ? 'bg-theme-surfaceElevated border-theme-border opacity-60'
                : 'bg-theme-surfaceElevated border-theme-border shadow-sm hover:shadow-md'
            }`}
            onClick={() => handleToggle(task.id)}
          >
            {/* Checkbox */}
            <div className="mt-1 mr-4 shrink-0">
              <div
                className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                  task.completed
                    ? 'bg-theme-accent border-theme-accent'
                    : 'border-theme-secondary/50'
                }`}
              >
                {task.completed && <i className="fas fa-check text-white text-xs" />}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1">
              <div className="inline-block bg-theme-surface px-2 py-0.5 rounded text-[10px] font-bold text-theme-primary border border-theme-border mb-2 uppercase tracking-wider">
                {task.days}
              </div>
              <p className={`text-sm mb-1 ${task.completed ? 'line-through text-theme-secondary' : 'text-theme-primary font-medium'}`}>
                {task.desc}
              </p>
              
              {task.completed && task.completedDate && (
                <p className="text-[11px] text-theme-accent italic mt-1 font-medium">
                  Completed {formatCompletedDate(task.completedDate)}
                </p>
              )}

              {task.resource && (
                <a
                  href={task.resource.startsWith('http') ? task.resource : `https://${task.resource}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-[11px] text-theme-accent hover:underline mt-2 bg-theme-accent/10 px-2 py-1 rounded"
                >
                  <i className="fas fa-link" /> Resource
                </a>
              )}
            </div>

            {/* Actions Menu Trigger */}
            <div className="ml-2 relative">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuTask(task.id === menuTask?.id ? null : task)
                }}
                className="p-2 text-theme-secondary hover:text-theme-primary rounded-lg hover:bg-theme-bg transition-colors"
              >
                <i className="fas fa-ellipsis-v" />
              </button>

              {/* Mini Inline Menu */}
              {menuTask?.id === task.id && (
                <div className="absolute right-0 top-full mt-1 w-32 bg-theme-surface border border-theme-border rounded-xl shadow-xl z-50 overflow-hidden" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => {
                      setMenuTask(null)
                      openEditModal(task)
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-theme-primary hover:bg-theme-surfaceElevated transition-colors flex items-center gap-2"
                  >
                    <i className="fas fa-pencil-alt text-xs opacity-70" /> Edit
                  </button>
                  <div className="h-px bg-theme-border" />
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this task?')) {
                        onDeleteTask(weekIndex, task.id)
                      }
                      setMenuTask(null)
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-2 font-medium"
                  >
                    <i className="fas fa-trash text-xs opacity-70" /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {week.tasks.length === 0 && (
          <div className="text-center py-10 border-2 border-dashed border-theme-border rounded-xl">
            <p className="text-theme-secondary text-sm mb-3">No tasks yet</p>
            <button
              onClick={() => {
                setTaskForm({ days: '', desc: '', resource: '' })
                setShowAddModal(true)
              }}
              className="text-theme-accent text-sm font-bold hover:underline"
            >
              + Add Task
            </button>
          </div>
        )}
      </div>

      {showAddModal && renderModal('Add New Task', false)}
      {showEditModal && renderModal('Edit Task', true)}
    </div>
  )
}
