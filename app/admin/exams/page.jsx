'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { parseCSV, parseJSON, parseTXT } from '@/utils/parseQuestions'

const API = '/api/exams'
const EXAM_PAGE_SIZE = 50

export default function AdminExams() {
  const [exams, setExams] = useState([])
  const [examTotal, setExamTotal] = useState(0)
  const [examOffset, setExamOffset] = useState(0)
  const [hasMoreExams, setHasMoreExams] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [editExam, setEditExam] = useState(null)
  const [addQuestionsTo, setAddQuestionsTo] = useState(null)
  const [examToDelete, setExamToDelete] = useState(null)
  const router = useRouter()

  const fetchExams = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/exams?limit=${EXAM_PAGE_SIZE}&offset=0`)
      if (response.status === 401) {
        router.push('/admin')
        return
      }
      const data = await response.json()
      const list = Array.isArray(data) ? data : data.exams || []
      setExams(list)
      setExamOffset(list.length)
      setExamTotal(Array.isArray(data) ? list.length : data.totalCount || list.length)
      setHasMoreExams(!Array.isArray(data) && Boolean(data.hasMore))
    } catch {
      setExams([])
      setExamTotal(0)
      setExamOffset(0)
      setHasMoreExams(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchExams() }, [])

  const loadMoreExams = async () => {
    setLoadingMore(true)
    try {
      const response = await fetch(`/api/admin/exams?limit=${EXAM_PAGE_SIZE}&offset=${examOffset}`)
      if (response.status === 401) {
        router.push('/admin')
        return
      }
      const data = await response.json()
      const list = data.exams || []
      setExams((current) => [...current, ...list])
      setExamOffset((current) => current + list.length)
      setExamTotal(data.totalCount || examTotal)
      setHasMoreExams(Boolean(data.hasMore))
    } finally {
      setLoadingMore(false)
    }
  }

  const confirmDeleteExam = async () => {
    if (!examToDelete) return
    await fetch(`${API}/${examToDelete._id}`, { method: 'DELETE' })
    setExamToDelete(null)
    fetchExams()
  }

  const togglePublish = async (exam) => {
    await fetch(`${API}/${exam._id}/publish`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: !exam.published }),
    })
    fetchExams()
  }

  const fmtDate = (date) => date ? new Date(date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—'

  return (
    <div className="bg-theme-bg min-h-screen text-theme-primary transition-theme">
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8 mt-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-theme-primary mb-1">Manage Exams</h2>
            <p className="text-theme-secondary text-sm">{exams.length}{examTotal ? ` of ${examTotal}` : ''} exam(s) loaded</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link href="/admin/dashboard" className="flex-1 sm:flex-none px-4 py-3 text-sm font-bold bg-theme-bg text-theme-secondary border border-theme-border rounded-xl hover:text-theme-primary transition-all flex items-center justify-center whitespace-nowrap">
              <i className="fas fa-arrow-left mr-2" />
              <span>Dashboard</span>
            </Link>
            <button onClick={() => { setShowCreate(true); setEditExam(null) }} className="flex-1 sm:flex-none bg-theme-accent text-white font-bold px-4 sm:px-6 py-3 rounded-xl hover:opacity-90 transition-all flex items-center justify-center space-x-2 shadow-lg whitespace-nowrap text-sm sm:text-base">
              <i className="fas fa-plus" /><span>Create Exam</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((item) => (
              <div key={item} className="bg-theme-surface border border-theme-border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="skeleton h-6 w-2/3 rounded-lg" />
                  <div className="skeleton h-4 w-1/2 rounded-lg" />
                </div>
                <div className="flex gap-2">
                  <div className="skeleton h-9 w-24 rounded-xl" />
                  <div className="skeleton h-9 w-24 rounded-xl" />
                  <div className="skeleton h-9 w-16 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : exams.length === 0 ? (
          <div className="text-center py-20 text-theme-secondary">
            <i className="fas fa-inbox text-5xl mb-4 opacity-40" />
            <p className="font-medium">No exams yet. Create your first one!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {exams.map((exam) => (
              <div key={exam._id} className="bg-theme-surface border border-theme-border rounded-2xl p-5 shadow-sm hover:border-theme-accent/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-theme-primary text-lg truncate">{exam.title}</h3>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-theme-secondary mt-1 items-center">
                    <span><i className="fas fa-clock mr-1" />{exam.duration} min</span>
                    <span><i className="fas fa-play-circle mr-1" />{fmtDate(exam.liveStart)}</span>
                    <span><i className="fas fa-stop-circle mr-1" />{fmtDate(exam.liveEnd)}</span>
                    <span><i className="fas fa-question-circle mr-1" />{exam.questionCount} question(s)</span>
                    <button onClick={() => setEditExam(exam)} className="ml-1 hover:text-theme-accent transition-colors text-theme-secondary opacity-70 hover:opacity-100" title="Edit Exam Details">
                      <i className="fas fa-pencil-alt" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 w-full sm:w-auto flex-shrink-0 mt-3 sm:mt-0">
                  <button onClick={() => togglePublish(exam)} className={`px-3 py-2 justify-center flex items-center text-xs font-bold rounded-xl transition-all border ${exam.published ? 'bg-theme-success-bg text-theme-success-text border-theme-success-border hover:bg-theme-success-border' : 'bg-theme-bg text-theme-secondary border-theme-border hover:text-theme-primary hover:border-theme-primary/30'}`}>
                    <i className={`fas ${exam.published ? 'fa-check-circle' : 'fa-eye-slash'} mr-2`} />
                    {exam.published ? 'Published' : 'Draft'}
                  </button>
                  <button onClick={() => setAddQuestionsTo(exam._id)} className="px-3 py-2 justify-center flex items-center text-xs font-bold bg-theme-accent/10 text-theme-accent border border-theme-accent/20 rounded-xl hover:bg-theme-accent/20 transition-all">
                    <i className="fas fa-plus mr-2" />Questions
                  </button>
                  <button onClick={() => router.push(`/admin/exam/${exam._id}`)} className="px-3 py-2 justify-center flex items-center text-xs font-bold bg-theme-bg text-theme-secondary border border-theme-border rounded-xl hover:text-theme-primary transition-all">
                    <i className="fas fa-eye mr-2" />View
                  </button>
                  <button onClick={() => setExamToDelete(exam)} className="px-3 py-2 justify-center flex items-center text-xs font-bold bg-theme-error-bg text-theme-error-text border border-theme-error-border rounded-xl hover:opacity-80 transition-all">
                    <i className="fas fa-trash sm:mr-0" /><span className="ml-2 sm:hidden">Delete</span>
                  </button>
                </div>
              </div>
            ))}
            {hasMoreExams ? (
              <button
                onClick={loadMoreExams}
                disabled={loadingMore}
                className="w-full bg-theme-surface border border-theme-border rounded-2xl p-5 text-sm font-bold text-theme-secondary hover:text-theme-primary disabled:opacity-60"
              >
                {loadingMore ? 'Loading...' : 'Load More Exams'}
              </button>
            ) : null}
          </div>
        )}
      </main>

      {(showCreate || editExam) ? <CreateExamModal exam={editExam} onClose={() => { setShowCreate(false); setEditExam(null) }} onCreated={(id) => { setShowCreate(false); setEditExam(null); fetchExams(); if (id) setAddQuestionsTo(id) }} /> : null}
      {addQuestionsTo ? <AddQuestionsModal examId={addQuestionsTo} onClose={() => setAddQuestionsTo(null)} onAdded={() => { setAddQuestionsTo(null); fetchExams() }} /> : null}
      {examToDelete ? (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 modal-backdrop">
          <div className="bg-theme-surface border border-theme-border rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-5 modal-panel">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-theme-error-bg flex items-center justify-center text-theme-error-text border-4 border-theme-error-border/30">
                <i className="fas fa-trash-alt text-2xl" />
              </div>
              <h3 className="text-xl font-bold text-theme-primary">Delete Exam?</h3>
              <p className="text-theme-secondary text-sm">Are you sure you want to permanently delete <strong>{examToDelete.title}</strong>? This action cannot be undone.</p>
            </div>
            <div className="flex space-x-3 pt-2">
              <button onClick={() => setExamToDelete(null)} className="flex-1 bg-theme-bg text-theme-secondary border border-theme-border hover:text-theme-primary py-2.5 rounded-xl font-bold transition-all">Cancel</button>
              <button onClick={confirmDeleteExam} className="flex-1 bg-theme-error-bg text-theme-error-text border border-theme-error-border hover:opacity-80 py-2.5 rounded-xl font-bold transition-all">Delete</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function CreateExamModal({ exam, onClose, onCreated }) {
  const now = new Date()
  const tzOffset = now.getTimezoneOffset() * 60000

  const formatLocalTime = (isoString) => {
    if (!isoString) return { d: '', t: '' }
    const local = new Date(new Date(isoString).getTime() - tzOffset).toISOString()
    return { d: local.split('T')[0], t: local.split('T')[1].slice(0, 5) }
  }

  const localISOTime = new Date(now.getTime() - tzOffset).toISOString()
  const defaultEndTime = new Date(now.getTime() - tzOffset + 30 * 60000).toISOString()
  const defaultStart = exam?.liveStart ? formatLocalTime(exam.liveStart) : { d: localISOTime.split('T')[0], t: localISOTime.split('T')[1].slice(0, 5) }
  const defaultEnd = exam?.liveEnd ? formatLocalTime(exam.liveEnd) : { d: defaultEndTime.split('T')[0], t: defaultEndTime.split('T')[1].slice(0, 5) }

  const [title, setTitle] = useState(exam?.title || '')
  const [duration, setDuration] = useState(exam?.duration || 30)
  const [startDate, setStartDate] = useState(defaultStart.d)
  const [startTime, setStartTime] = useState(defaultStart.t)
  const [endDate, setEndDate] = useState(defaultEnd.d)
  const [endTime, setEndTime] = useState(defaultEnd.t)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    if (!title.trim()) { setError('Title is required'); return }
    const startObj = new Date(`${startDate}T${startTime}`)
    const endObj = new Date(`${endDate}T${endTime}`)
    if (isNaN(startObj.getTime()) || isNaN(endObj.getTime())) { setError('Invalid date/time provided.'); return }
    if (startObj >= endObj) { setError('End time must be after the start time.'); return }

    setSaving(true)
    setError('')
    try {
      const body = { title: title.trim(), duration: Number(duration), liveStart: startObj.toISOString(), liveEnd: endObj.toISOString() }
      const method = exam ? 'PUT' : 'POST'
      const url = exam ? `${API}/${exam._id}` : API
      const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      onCreated(exam ? null : data._id)
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 overflow-y-auto modal-backdrop">
      <div className="bg-theme-surface border border-theme-border rounded-2xl p-6 sm:p-8 w-full max-w-lg shadow-2xl my-8 modal-panel">
        <h3 className="text-xl font-bold text-theme-primary mb-5">{exam ? 'Edit Exam' : 'Create New Exam'}</h3>
        {error ? <div className="mb-4 p-3 bg-theme-error-bg border border-theme-error-border text-theme-error-text rounded-xl text-sm">{error}</div> : null}
        <div className="space-y-4">
          <Field label="Exam Title"><input type="text" value={title} onChange={(event) => setTitle(event.target.value)} className="input-field" placeholder="e.g. Midterm CSE 201" /></Field>
          <Field label="Duration (minutes)"><input type="number" value={duration} onChange={(event) => setDuration(event.target.value)} className="input-field" min={1} /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Start Date"><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="input-field px-3" /></Field>
            <Field label="Start Time"><input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className="input-field px-3" /></Field>
            <Field label="End Date"><input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="input-field px-3" /></Field>
            <Field label="End Time"><input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} className="input-field px-3" /></Field>
          </div>
        </div>
        <div className="flex space-x-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 border border-theme-border text-theme-primary rounded-xl hover:bg-theme-bg font-semibold transition-all">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 py-3 bg-theme-accent text-white rounded-xl hover:opacity-90 font-semibold transition-all flex items-center justify-center">
            {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : exam ? 'Save Changes' : 'Create Exam'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AddQuestionsModal({ examId, onClose, onAdded }) {
  const [tab, setTab] = useState('txt')
  const [txtInput, setTxtInput] = useState('')
  const [jsonInput, setJsonInput] = useState('')
  const [csvFile, setCsvFile] = useState(null)
  const [parsed, setParsed] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)

  const tabs = [
    { id: 'txt', label: 'TXT', icon: 'fa-file-alt' },
    { id: 'json', label: 'JSON', icon: 'fa-code' },
    { id: 'csv', label: 'CSV', icon: 'fa-file-csv' },
  ]
  const examples = {
    txt: `Q1. What is the capital of France?
1. Berlin
2. London
3. Paris
4. Madrid
*3(ans)
**Paris is the capital and largest city of France.

Q2. Which is a JavaScript framework?
1. Django
2. Flask
3. React
4. Laravel
5. Spring
*3(ans)
**`,
    json: `[
  {
    "question": "What is the capital of France?",
    "options": ["Berlin", "London", "Paris", "Madrid"],
    "correct": 2,
    "explanation": "Paris is the capital of France."
  },
  {
    "question": "Which is a JS framework?",
    "options": ["Django", "Flask", "React"],
    "correct": 2,
    "explanation": ""
  }
]`,
    csv: `question,option1,option2,option3,option4,option5,correct,explanation
"What is the capital of France?","Berlin","London","Paris","Madrid","",2,"Paris is the capital."
"Which is a JS framework?","Django","Flask","React","","",2,""`
  }

  const handleParse = () => {
    setError('')
    setParsed([])
    try {
      let questions = []
      if (tab === 'txt') questions = parseTXT(txtInput)
      else if (tab === 'json') questions = parseJSON(jsonInput)
      else if (tab === 'csv' && csvFile) {
        const reader = new FileReader()
        reader.onload = (event) => {
          try {
            const values = parseCSV(event.target.result)
            if (!values.length) setError('No valid questions found')
            else setParsed(values)
          } catch (err) {
            setError(err.message)
          }
        }
        reader.readAsText(csvFile)
        return
      }
      if (!questions.length) setError('No valid questions found in input')
      else setParsed(questions)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(`${API}/${examId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: parsed }),
      })
      if (!response.ok) throw new Error((await response.json()).error)
      onAdded()
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-start justify-center p-4 overflow-y-auto modal-backdrop">
      <div className="bg-theme-surface border border-theme-border rounded-2xl p-6 sm:p-8 w-full max-w-2xl shadow-2xl my-8 modal-panel">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-bold text-theme-primary">Add Questions</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-theme-bg flex items-center justify-center text-theme-secondary hover:text-theme-primary"><i className="fas fa-times" /></button>
        </div>
        {error ? <div className="mb-4 p-3 bg-theme-error-bg border border-theme-error-border text-theme-error-text rounded-xl text-sm">{error}</div> : null}
        <div className="flex space-x-2 mb-5">
          {tabs.map((item) => (
            <button key={item.id} onClick={() => { setTab(item.id); setParsed([]); setError('') }} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center space-x-2 ${tab === item.id ? 'bg-theme-accent text-white shadow-md' : 'bg-theme-bg text-theme-secondary border border-theme-border hover:text-theme-primary'}`}>
              <i className={`fas ${item.icon}`} /><span>{item.label}</span>
            </button>
          ))}
        </div>

        {tab === 'txt' ? (
          <div className="space-y-3">
            <textarea value={txtInput} onChange={(event) => setTxtInput(event.target.value)} rows={10} autoComplete="off" spellCheck="false" className="input-field font-mono text-sm resize-y" placeholder="Paste questions in TXT format..." />
            <FormatExample title="TXT Format Example" code={examples.txt} />
          </div>
        ) : null}
        {tab === 'json' ? (
          <div className="space-y-3">
            <textarea value={jsonInput} onChange={(event) => setJsonInput(event.target.value)} rows={10} autoComplete="off" spellCheck="false" className="input-field font-mono text-sm resize-y" placeholder="Paste JSON array..." />
            <FormatExample title="JSON Format Example" code={examples.json} />
          </div>
        ) : null}
        {tab === 'csv' ? (
          <div className="space-y-3">
            <div className="border-2 border-dashed border-theme-border rounded-xl p-8 text-center hover:border-theme-accent/40 transition-all cursor-pointer" onClick={() => fileRef.current?.click()}>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(event) => setCsvFile(event.target.files?.[0] || null)} />
              <i className="fas fa-cloud-upload-alt text-3xl text-theme-secondary mb-2" />
              <p className="text-theme-secondary text-sm">{csvFile ? csvFile.name : 'Click to upload CSV file'}</p>
            </div>
            <FormatExample title="CSV Format Example" code={examples.csv} />
          </div>
        ) : null}

        {parsed.length === 0 ? (
          <button onClick={handleParse} className="w-full mt-4 py-3 bg-theme-bg border border-theme-border text-theme-primary rounded-xl font-semibold hover:border-theme-accent/40 transition-all">
            <i className="fas fa-search mr-2" />Parse Questions
          </button>
        ) : (
          <div className="mt-5 space-y-3">
            <p className="text-sm font-bold text-theme-success-text"><i className="fas fa-check-circle mr-1" />{parsed.length} question(s) parsed successfully</p>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {parsed.map((question, index) => (
                <div key={index} className="bg-theme-bg border border-theme-border rounded-xl p-3 text-sm">
                  <p className="font-semibold text-theme-primary mb-1 whitespace-pre-wrap">{index + 1}. {question.question}</p>
                  <div className="pl-3 space-y-0.5 text-theme-secondary text-xs">
                    {question.options.map((option, optionIndex) => <p key={optionIndex} className={`whitespace-pre-wrap ${optionIndex === question.correct ? 'text-theme-success-text font-bold' : ''}`}>{optionIndex + 1}. {option} {optionIndex === question.correct ? '(correct)' : ''}</p>)}
                    {question.explanation ? <p className="text-theme-secondary italic mt-1 whitespace-pre-wrap">Explanation: {question.explanation}</p> : null}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex space-x-3">
              <button onClick={() => setParsed([])} className="flex-1 py-3 border border-theme-border text-theme-primary rounded-xl font-semibold hover:bg-theme-bg transition-all">Back</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-3 bg-theme-accent text-white rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50">
                {saving ? 'Saving...' : `Add ${parsed.length} Question(s)`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return <div><label className="block text-sm font-medium text-theme-primary mb-1">{label}</label>{children}</div>
}

function FormatExample({ title, code }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-theme-bg border border-theme-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-theme-border">
        <span className="text-xs font-bold text-theme-secondary">{title}</span>
        <button onClick={copy} className="text-xs text-theme-accent hover:underline">
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="p-3 text-xs text-theme-secondary overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">{code}</pre>
    </div>
  )
}
