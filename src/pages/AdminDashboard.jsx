import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { parseTXT, parseJSON, parseCSV } from '../utils/parseQuestions'
import { useTheme } from '../context/ThemeContext'

const API = '/api/exams'
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('admin_token')}`
})

export default function AdminDashboard() {
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)
  const { theme, toggleTheme } = useTheme()
  const [showCreate, setShowCreate] = useState(false)
  const [editExam, setEditExam] = useState(null)
  const [addQuestionsTo, setAddQuestionsTo] = useState(null)
  const [examToDelete, setExamToDelete] = useState(null)
  const navigate = useNavigate()

  const fetchExams = async () => {
    try {
      const res = await fetch('/api/admin/exams', { headers: authHeaders() })
      const data = await res.json()
      setExams(Array.isArray(data) ? data : [])
    } catch { setExams([]) }
    setLoading(false)
  }

  useEffect(() => { fetchExams() }, [])

  const confirmDeleteExam = async () => {
    if (!examToDelete) return
    await fetch(`${API}/${examToDelete._id}`, { method: 'DELETE', headers: authHeaders() })
    setExamToDelete(null)
    fetchExams()
  }

  const togglePublish = async (exam) => {
    try {
      await fetch(`${API}/${exam._id}/publish`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ published: !exam.published })
      })
      fetchExams()
    } catch (e) {
      console.error('Failed to toggle publish status')
    }
  }

  const logout = () => {
    localStorage.removeItem('admin_token')
    navigate('/admin')
  }

  const fmtDate = (d) => d ? new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—'

  return (
    <div className="bg-theme-bg min-h-screen text-theme-primary transition-theme">
      {/* Header */}
      <header className="bg-theme-surface border-b border-theme-border sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            <Link to="/" className="shrink-0">
              <img src="/favicon.png" alt="Logo" className="h-8 w-8 object-contain rounded-xl" />
            </Link>
            <h1 className="text-base sm:text-lg font-bold text-theme-primary truncate">Admin Dashboard</h1>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            <button onClick={toggleTheme}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-theme-bg text-theme-secondary border border-theme-border hover:text-theme-primary transition-all">
              <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`}></i>
            </button>
            <button onClick={logout}
              className="px-3 sm:px-4 py-2 text-sm font-medium bg-theme-error-bg text-theme-error-text border border-theme-error-border rounded-xl hover:opacity-80 transition-all flex items-center">
              <i className="fas fa-sign-out-alt sm:mr-2"></i>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Top Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-theme-primary">Manage Exams</h2>
            <p className="text-theme-secondary text-sm">{exams.length} exam(s) created</p>
          </div>
          <button onClick={() => { setShowCreate(true); setEditExam(null) }}
            className="bg-theme-accent text-white font-bold px-6 py-3 rounded-xl hover:opacity-90 transition-all flex items-center space-x-2 shadow-lg">
            <i className="fas fa-plus"></i><span>Create Exam</span>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-theme-accent border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : exams.length === 0 ? (
          <div className="text-center py-20 text-theme-secondary">
            <i className="fas fa-inbox text-5xl mb-4 opacity-40"></i>
            <p className="font-medium">No exams yet. Create your first one!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {exams.map(exam => (
              <div key={exam._id} className="bg-theme-surface border border-theme-border rounded-2xl p-5 shadow-sm hover:border-theme-accent/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-theme-primary text-lg truncate">{exam.title}</h3>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-theme-secondary mt-1 items-center">
                    <span><i className="fas fa-clock mr-1"></i>{exam.duration} min</span>
                    <span><i className="fas fa-play-circle mr-1"></i>{fmtDate(exam.liveStart)}</span>
                    <span><i className="fas fa-stop-circle mr-1"></i>{fmtDate(exam.liveEnd)}</span>
                    <button onClick={() => setEditExam(exam)} className="ml-1 hover:text-theme-accent transition-colors text-theme-secondary opacity-70 hover:opacity-100" title="Edit Exam Details">
                      <i className="fas fa-pencil-alt"></i>
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 w-full sm:w-auto flex-shrink-0 mt-3 sm:mt-0">
                  <button onClick={() => togglePublish(exam)}
                    className={`px-3 py-2 justify-center flex items-center text-xs font-bold rounded-xl transition-all border ${
                      exam.published 
                      ? 'bg-theme-success-bg text-theme-success-text border-theme-success-border hover:bg-theme-success-border' 
                      : 'bg-theme-bg text-theme-secondary border-theme-border hover:text-theme-primary hover:border-theme-primary/30'
                    }`}>
                    <i className={`fas ${exam.published ? 'fa-check-circle' : 'fa-eye-slash'} mr-2`}></i>
                    {exam.published ? 'Published' : 'Draft'}
                  </button>
                  <button onClick={() => setAddQuestionsTo(exam._id)}
                    className="px-3 py-2 justify-center flex items-center text-xs font-bold bg-theme-accent/10 text-theme-accent border border-theme-accent/20 rounded-xl hover:bg-theme-accent/20 transition-all">
                    <i className="fas fa-plus mr-2"></i>Questions
                  </button>
                  <button onClick={() => navigate(`/admin/exam/${exam._id}`)}
                    className="px-3 py-2 justify-center flex items-center text-xs font-bold bg-theme-bg text-theme-secondary border border-theme-border rounded-xl hover:text-theme-primary transition-all"
                    title="View questions">
                    <i className="fas fa-eye mr-2"></i>View
                  </button>
                  <button onClick={() => setExamToDelete(exam)}
                    className="px-3 py-2 justify-center flex items-center text-xs font-bold bg-theme-error-bg text-theme-error-text border border-theme-error-border rounded-xl hover:opacity-80 transition-all"
                    title="Delete Exam">
                    <i className="fas fa-trash sm:mr-0"></i>
                    <span className="ml-2 sm:hidden">Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create/Edit Exam Modal */}
      {(showCreate || editExam) && (
        <CreateExamModal
          exam={editExam}
          onClose={() => { setShowCreate(false); setEditExam(null) }}
          onCreated={(id) => { setShowCreate(false); setEditExam(null); fetchExams(); if (id) setAddQuestionsTo(id); }}
        />
      )}

      {/* Add Questions Modal */}
      {addQuestionsTo && (
        <AddQuestionsModal
          examId={addQuestionsTo}
          onClose={() => setAddQuestionsTo(null)}
          onAdded={() => { setAddQuestionsTo(null); fetchExams() }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {examToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 modal-backdrop">
          <div className="bg-theme-surface border border-theme-border rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-5 modal-panel">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-theme-error-bg flex items-center justify-center text-theme-error-text border-4 border-theme-error-border/30">
                <i className="fas fa-trash-alt text-2xl"></i>
              </div>
              <h3 className="text-xl font-bold text-theme-primary">Delete Exam?</h3>
              <p className="text-theme-secondary text-sm">
                Are you sure you want to permanently delete <strong>{examToDelete.title}</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="flex space-x-3 pt-2">
              <button onClick={() => setExamToDelete(null)}
                className="flex-1 bg-theme-bg text-theme-secondary border border-theme-border hover:text-theme-primary py-2.5 rounded-xl font-bold transition-all">
                Cancel
              </button>
              <button onClick={confirmDeleteExam}
                className="flex-1 bg-theme-error-bg text-theme-error-text border border-theme-error-border hover:opacity-80 py-2.5 rounded-xl font-bold transition-all">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Create Exam Modal ─────────────────────────────────────────────────── */
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
    if (!startDate || !startTime || !endDate || !endTime) {
      setError('Please provide valid start and end dates and times. Ensure the days you selected are valid for that month.');
      return;
    }

    const startObj = new Date(`${startDate}T${startTime}`)
    const endObj = new Date(`${endDate}T${endTime}`)

    if (isNaN(startObj.getTime()) || isNaN(endObj.getTime())) {
      setError('Invalid date/time provided.')
      return
    }
    if (startObj >= endObj) {
      setError('End time must be after the start time.')
      return
    }

    setSaving(true); setError('')
    try {
      const body = { 
        title: title.trim(), 
        duration: Number(duration),
        liveStart: startObj.toISOString(),
        liveEnd: endObj.toISOString()
      }
      if (!exam) body.questions = []
      
      const method = exam ? 'PUT' : 'POST'
      const url = exam ? `${API}/${exam._id}` : API
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onCreated(exam ? null : data._id)
    } catch (e) { setError(e.message) }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto modal-backdrop">
      <div className="bg-theme-surface border border-theme-border rounded-2xl p-6 sm:p-8 w-full max-w-lg shadow-2xl my-8 modal-panel">
        <h3 className="text-xl font-bold text-theme-primary mb-5">{exam ? 'Edit Exam' : 'Create New Exam'}</h3>
        {error && <div className="mb-4 p-3 bg-theme-error-bg border border-theme-error-border text-theme-error-text rounded-xl text-sm">{error}</div>}

        <div className="space-y-4">
          <Field label="Exam Title">
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              className="input-field" placeholder="e.g. Midterm CSE 201" />
          </Field>
          <Field label="Duration (minutes)">
            <input type="number" value={duration} onChange={e => setDuration(e.target.value)}
              className="input-field" min={1} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Start Date">
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-field px-3" />
            </Field>
            <Field label="Start Time">
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="input-field px-3" />
            </Field>
            <Field label="End Date">
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-field px-3" />
            </Field>
            <Field label="End Time">
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="input-field px-3" />
            </Field>
          </div>
        </div>

        <div className="flex space-x-3 mt-6">
          <button onClick={onClose}
            className="flex-1 py-3 border border-theme-border text-theme-primary rounded-xl hover:bg-theme-bg font-semibold transition-all">
            Cancel
          </button>
          <button onClick={save} disabled={saving}
            className="flex-1 py-3 bg-theme-accent text-white rounded-xl hover:opacity-90 font-semibold transition-all flex items-center justify-center">
            {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (exam ? 'Save Changes' : 'Create Exam')}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Add Questions Modal ───────────────────────────────────────────────── */
function AddQuestionsModal({ examId, onClose, onAdded }) {
  const [tab, setTab] = useState('txt')
  const [txtInput, setTxtInput] = useState('')
  const [jsonInput, setJsonInput] = useState('')
  const [csvFile, setCsvFile] = useState(null)
  const [parsed, setParsed] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef()

  const tabs = [
    { id: 'txt', label: 'TXT', icon: 'fa-file-alt' },
    { id: 'json', label: 'JSON', icon: 'fa-code' },
    { id: 'csv', label: 'CSV', icon: 'fa-file-csv' },
  ]

  const handleParse = () => {
    setError(''); setParsed([])
    try {
      let questions = []
      if (tab === 'txt') questions = parseTXT(txtInput)
      else if (tab === 'json') questions = parseJSON(jsonInput)
      else if (tab === 'csv' && csvFile) {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const qs = parseCSV(e.target.result)
            if (!qs.length) setError('No valid questions found')
            else setParsed(qs)
          } catch (err) { setError(err.message) }
        }
        reader.readAsText(csvFile)
        return
      }
      if (!questions.length) setError('No valid questions found in input')
      else setParsed(questions)
    } catch (e) { setError(e.message) }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`${API}/${examId}/questions`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ questions: parsed })
      })
      if (!res.ok) throw new Error((await res.json()).error)
      onAdded()
    } catch (e) { setError(e.message) }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-start justify-center p-4 overflow-y-auto modal-backdrop">
      <div className="bg-theme-surface border border-theme-border rounded-2xl p-6 sm:p-8 w-full max-w-2xl shadow-2xl my-8 modal-panel">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-bold text-theme-primary">Add Questions</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-theme-bg flex items-center justify-center text-theme-secondary hover:text-theme-primary"><i className="fas fa-times"></i></button>
        </div>

        {error && <div className="mb-4 p-3 bg-theme-error-bg border border-theme-error-border text-theme-error-text rounded-xl text-sm">{error}</div>}

        {/* Tabs */}
        <div className="flex space-x-2 mb-5">
          {tabs.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setParsed([]); setError('') }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center space-x-2
                ${tab === t.id ? 'bg-theme-accent text-white shadow-md' : 'bg-theme-bg text-theme-secondary border border-theme-border hover:text-theme-primary'}`}>
              <i className={`fas ${t.icon}`}></i><span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Input Area */}
        {tab === 'txt' && (
          <div className="space-y-3">
            <textarea value={txtInput} onChange={e => setTxtInput(e.target.value)} rows={10}
              autoComplete="off" spellCheck="false"
              className="input-field font-mono text-sm resize-y" placeholder="Paste questions in TXT format..." />
            <FormatExample title="TXT Format Example" code={`Q1. What is the capital of France?
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
**`} />
          </div>
        )}

        {tab === 'json' && (
          <div className="space-y-3">
            <textarea value={jsonInput} onChange={e => setJsonInput(e.target.value)} rows={10}
              autoComplete="off" spellCheck="false"
              className="input-field font-mono text-sm resize-y" placeholder="Paste JSON array..." />
            <FormatExample title="JSON Format Example" code={`[
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
]`} />
          </div>
        )}

        {tab === 'csv' && (
          <div className="space-y-3">
            <div className="border-2 border-dashed border-theme-border rounded-xl p-8 text-center hover:border-theme-accent/40 transition-all cursor-pointer"
              onClick={() => fileRef.current?.click()}>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => setCsvFile(e.target.files[0])} />
              <i className="fas fa-cloud-upload-alt text-3xl text-theme-secondary mb-2"></i>
              <p className="text-theme-secondary text-sm">{csvFile ? csvFile.name : 'Click to upload CSV file'}</p>
            </div>
            <FormatExample title="CSV Format Example" code={`question,option1,option2,option3,option4,option5,correct,explanation
"What is the capital of France?","Berlin","London","Paris","Madrid","",2,"Paris is the capital."
"Which is a JS framework?","Django","Flask","React","","",2,""`} />
          </div>
        )}

        {/* Parse button */}
        {parsed.length === 0 && (
          <button onClick={handleParse}
            className="w-full mt-4 py-3 bg-theme-bg border border-theme-border text-theme-primary rounded-xl font-semibold hover:border-theme-accent/40 transition-all">
            <i className="fas fa-search mr-2"></i>Parse Questions
          </button>
        )}

        {/* Preview */}
        {parsed.length > 0 && (
          <div className="mt-5 space-y-3">
            <p className="text-sm font-bold text-theme-success-text"><i className="fas fa-check-circle mr-1"></i>{parsed.length} question(s) parsed successfully</p>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {parsed.map((q, i) => (
                <div key={i} className="bg-theme-bg border border-theme-border rounded-xl p-3 text-sm">
                  <p className="font-semibold text-theme-primary mb-1">{i + 1}. {q.question}</p>
                  <div className="pl-3 space-y-0.5 text-theme-secondary text-xs">
                    {q.options.map((o, j) => <p key={j} className={j === q.correct ? 'text-theme-success-text font-bold' : ''}>{j + 1}. {o} {j === q.correct ? '(correct)' : ''}</p>)}
                    {q.explanation && <p className="text-theme-secondary italic mt-1">Explanation: {q.explanation}</p>}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex space-x-3">
              <button onClick={() => setParsed([])} className="flex-1 py-3 border border-theme-border text-theme-primary rounded-xl font-semibold hover:bg-theme-bg transition-all">Back</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-3 bg-theme-accent text-white rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50">
                {saving ? 'Saving...' : `Add ${parsed.length} Question(s)`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Shared Components ─────────────────────────────────────────────────── */
function Field({ label, children }) {
  return <div><label className="block text-sm font-medium text-theme-primary mb-1">{label}</label>{children}</div>
}

function FormatExample({ title, code }) {
  const [copied, setCopied] = useState(false)
  const copy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000) }
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
