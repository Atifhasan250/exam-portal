'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { safeHTML } from '@/utils/sanitize'

export default function AdminExamView({ params }) {
  const { id } = use(params)
  const router = useRouter()
  const [exam, setExam] = useState(null)
  const [loading, setLoading] = useState(true)
  const [questionToDelete, setQuestionToDelete] = useState(null)
  const [draggingId, setDraggingId] = useState(null)
  const [exportModal, setExportModal] = useState(false)

  const fetchExam = async () => {
    try {
      const response = await fetch(`/api/admin/exams/${id}`)
      if (response.status === 401) {
        router.push('/admin')
        return
      }
      const data = await response.json()
      setExam(data)
    } catch {
      setExam(null)
    }
    setLoading(false)
  }

  useEffect(() => { fetchExam() }, [id])

  const confirmDeleteQuestion = async () => {
    await fetch(`/api/exams/${id}/questions/${questionToDelete}`, { method: 'DELETE' })
    setQuestionToDelete(null)
    fetchExam()
  }

  const onDropQuestion = async (targetId) => {
    if (!draggingId || draggingId === targetId || !exam?.questions) return
    const reordered = [...exam.questions]
    const sourceIndex = reordered.findIndex((question) => question._id === draggingId)
    const targetIndex = reordered.findIndex((question) => question._id === targetId)
    const [moved] = reordered.splice(sourceIndex, 1)
    reordered.splice(targetIndex, 0, moved)
    setExam({ ...exam, questions: reordered })
    setDraggingId(null)
    await fetch(`/api/admin/exams/${id}/questions/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds: reordered.map((question) => question._id) }),
    })
    fetchExam()
  }

  const handleExport = (format) => {
    if (!exam || !exam.questions || exam.questions.length === 0) return

    let content = ''
    let mimeType = 'text/plain'

    if (format === 'json') {
      content = JSON.stringify(
        exam.questions.map((q) => ({
          question: q.question,
          options: q.options,
          correct: q.correct,
          explanation: q.explanation || '',
        })),
        null,
        2
      )
      mimeType = 'application/json'
    } else if (format === 'csv') {
      const escapeCSV = (str) => {
        if (typeof str !== 'string') return ''
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      }
      const csvRows = ['Question,Option 1,Option 2,Option 3,Option 4,Option 5,Correct Index,Explanation']
      exam.questions.forEach((q) => {
        const row = [
          escapeCSV(q.question),
          escapeCSV(q.options[0] || ''),
          escapeCSV(q.options[1] || ''),
          escapeCSV(q.options[2] || ''),
          escapeCSV(q.options[3] || ''),
          escapeCSV(q.options[4] || ''),
          q.correct.toString(),
          escapeCSV(q.explanation || ''),
        ]
        csvRows.push(row.join(','))
      })
      content = csvRows.join('\n')
      mimeType = 'text/csv'
    } else if (format === 'txt') {
      let txtContent = ''
      exam.questions.forEach((q, i) => {
        txtContent += `Q${i + 1}. ${q.question}\n`
        q.options.forEach((opt, optIndex) => {
          txtContent += `${optIndex + 1}. ${opt}\n`
        })
        txtContent += `*${q.correct + 1}(ans)\n`
        if (q.explanation) {
          txtContent += `** ${q.explanation}\n`
        }
        txtContent += '\n'
      })
      content = txtContent.trim()
      mimeType = 'text/plain'
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const safeTitle = (exam.title || 'exam').replace(/[^a-z0-9]/gi, '_').toLowerCase()
    a.download = `${safeTitle}_export.${format}`
    a.click()
    URL.revokeObjectURL(url)
    setExportModal(false)
  }


  if (loading) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto px-4 py-8">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="bg-theme-surface border border-theme-border rounded-2xl p-5">
            <div className="skeleton h-5 w-3/4 rounded-lg mb-3" />
            <div className="space-y-2 ml-5">
              <div className="skeleton h-4 w-1/2 rounded-lg" />
              <div className="skeleton h-4 w-2/3 rounded-lg" />
              <div className="skeleton h-4 w-1/3 rounded-lg" />
              <div className="skeleton h-4 w-1/2 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="bg-theme-bg min-h-screen text-theme-primary transition-theme">
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => router.push('/admin/exams')} className="w-9 h-9 rounded-full bg-theme-surface flex items-center justify-center border border-theme-border text-theme-secondary hover:text-theme-primary shrink-0">
            <i className="fas fa-arrow-left" />
          </button>
          <h1 className="text-xl font-bold text-theme-primary truncate">{exam?.title || 'Exam'}</h1>
        </div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <p className="text-theme-secondary text-sm">{exam?.questions?.length || 0} question(s)</p>
            <button
              onClick={() => setExportModal(true)}
              className="text-xs bg-theme-accent text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition-all flex items-center gap-1.5 font-semibold shadow-sm shadow-theme-accent/20"
            >
              <i className="fas fa-file-export" />
              Export
            </button>
          </div>
          <p className="text-xs text-theme-secondary">Drag and drop to reorder</p>
        </div>

        {exam?.questions?.map((question, index) => (
          <div key={question._id} draggable onDragStart={() => setDraggingId(question._id)} onDragOver={(event) => event.preventDefault()} onDrop={() => onDropQuestion(question._id)} className="bg-theme-surface border border-theme-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-theme-primary text-sm mb-2">
                  <span className="text-theme-secondary mr-2">{index + 1}.</span>
                  <span className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: safeHTML(question.question) }} />
                </p>
                <div className="grid gap-1.5 ml-5">
                  {question.options.map((option, optionIndex) => (
                    <p key={optionIndex} className={`text-sm ${optionIndex === question.correct ? 'text-theme-success-text font-bold' : 'text-theme-secondary'}`}>
                      {optionIndex + 1}. <span className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: safeHTML(option) }} /> {optionIndex === question.correct ? '(correct)' : ''}
                    </p>
                  ))}
                </div>
                {question.explanation ? (
                  <p className="text-xs text-theme-secondary mt-2 italic ml-5">
                    <i className="fas fa-lightbulb text-yellow-500 mr-1" />{question.explanation}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-theme-secondary cursor-move"><i className="fas fa-grip-vertical" /></span>
                <button onClick={() => setQuestionToDelete(question._id)} className="flex-shrink-0 w-8 h-8 rounded-lg bg-theme-error-bg text-theme-error-text border border-theme-error-border flex items-center justify-center hover:opacity-80 transition-all text-xs">
                  <i className="fas fa-trash" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </main>

      {questionToDelete !== null ? (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 modal-backdrop">
          <div className="bg-theme-surface border border-theme-border rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-5 modal-panel">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-theme-error-bg flex items-center justify-center text-theme-error-text border-4 border-theme-error-border/30">
                <i className="fas fa-trash-alt text-2xl" />
              </div>
              <h3 className="text-xl font-bold text-theme-primary">Delete Question?</h3>
              <p className="text-theme-secondary text-sm">
                Are you sure you want to permanently delete this question?
              </p>
            </div>
            <div className="flex space-x-3 pt-2">
              <button onClick={() => setQuestionToDelete(null)} className="flex-1 bg-theme-bg text-theme-secondary border border-theme-border hover:text-theme-primary py-2.5 rounded-xl font-bold transition-all">Cancel</button>
              <button onClick={confirmDeleteQuestion} className="flex-1 bg-theme-error-bg text-theme-error-text border border-theme-error-border hover:opacity-80 py-2.5 rounded-xl font-bold transition-all">Delete</button>
            </div>
          </div>
        </div>
      ) : null}

      {exportModal ? (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 modal-backdrop">
          <div className="bg-theme-surface border border-theme-border rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-5 modal-panel">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-theme-accent/10 flex items-center justify-center text-theme-accent border-4 border-theme-accent/20">
                <i className="fas fa-file-download text-2xl" />
              </div>
              <h3 className="text-xl font-bold text-theme-primary">Export Questions</h3>
              <p className="text-theme-secondary text-sm">
                Choose a format to download the {exam?.questions?.length || 0} questions for backup or editing.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2">
              <button
                onClick={() => handleExport('txt')}
                className="flex flex-col items-center justify-center gap-2 bg-theme-bg border border-theme-border hover:border-theme-accent/50 hover:bg-theme-accent/5 text-theme-primary py-3 rounded-xl font-bold transition-all"
              >
                <i className="fas fa-file-alt text-lg text-theme-secondary" />
                <span className="text-xs">TXT</span>
              </button>
              <button
                onClick={() => handleExport('json')}
                className="flex flex-col items-center justify-center gap-2 bg-theme-bg border border-theme-border hover:border-theme-accent/50 hover:bg-theme-accent/5 text-theme-primary py-3 rounded-xl font-bold transition-all"
              >
                <i className="fas fa-file-code text-lg text-theme-secondary" />
                <span className="text-xs">JSON</span>
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="flex flex-col items-center justify-center gap-2 bg-theme-bg border border-theme-border hover:border-theme-accent/50 hover:bg-theme-accent/5 text-theme-primary py-3 rounded-xl font-bold transition-all"
              >
                <i className="fas fa-file-csv text-lg text-theme-secondary" />
                <span className="text-xs">CSV</span>
              </button>
            </div>
            <button
              onClick={() => setExportModal(false)}
              className="w-full bg-theme-bg text-theme-secondary border border-theme-border hover:text-theme-primary py-2.5 rounded-xl font-bold transition-all mt-2"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
