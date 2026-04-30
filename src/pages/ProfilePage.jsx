import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import BottomNav from '../components/BottomNav'

export default function ProfilePage() {
  const navigate = useNavigate()
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  
  const [studentName, setStudentName] = useState(() => localStorage.getItem('student_name') || '')
  const [showEditModal, setShowEditModal] = useState(false)
  const [nameInput, setNameInput] = useState('')

  const saveNewName = async () => {
    const newName = nameInput.trim()
    if (!newName) return
    if (studentName && studentName !== newName) {
      try {
        await fetch('/api/submissions/name', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oldName: studentName, newName })
        })
      } catch (e) { console.error(e) }
    }
    localStorage.setItem('student_name', newName)
    setStudentName(newName)
    setShowEditModal(false)
  }

  // theme is handled by Navbar now

  useEffect(() => {
    if (!studentName) {
      navigate('/')
      return
    }

    fetch(`/api/submissions/${encodeURIComponent(studentName)}`)
      .then(r => r.json())
      .then(data => {
        setSubmissions(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [studentName, navigate])

  return (
    <div className="bg-theme-bg min-h-screen text-theme-primary transition-theme pb-20">
      <Navbar studentName={studentName} setStudentName={setStudentName} />
      <BottomNav />

      <main className="max-w-4xl mx-auto px-4 mt-8">
        <div className="flex items-center space-x-3 mb-6">
          <Link to="/" className="w-10 h-10 rounded-full bg-theme-surface border border-theme-border flex items-center justify-center text-theme-secondary hover:text-theme-primary hover:border-theme-primary transition-all">
             <i className="fas fa-arrow-left"></i>
          </Link>
          <h2 className="text-3xl font-extrabold text-theme-primary">Your Profile</h2>
        </div>
        <div className="bg-theme-surface border border-theme-border rounded-2xl p-8 mb-8 text-center sm:text-left flex flex-col sm:flex-row items-center sm:items-start gap-6 shadow-sm">
          <div className="w-24 h-24 rounded-full bg-theme-accent/10 border border-theme-accent/20 flex items-center justify-center text-theme-accent shrink-0">
            <i className="fas fa-user text-4xl"></i>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-center sm:justify-start gap-3">
              <h2 className="text-3xl font-extrabold text-theme-primary truncate">{studentName}</h2>
              <button
                onClick={() => { setNameInput(studentName); setShowEditModal(true); }}
                className="w-8 h-8 rounded-full bg-theme-bg border border-theme-border flex items-center justify-center text-theme-secondary hover:text-theme-primary hover:border-theme-primary transition-all shrink-0"
                title="Edit name">
                <i className="fas fa-pencil-alt text-xs"></i>
              </button>
            </div>
            <p className="text-theme-secondary mt-1">
              You have attempted {submissions.length} exam{submissions.length === 1 ? '' : 's'} in total.
            </p>
          </div>
        </div>

        <h3 className="text-xl font-bold text-theme-primary mb-4 border-b border-theme-border pb-2">Exam History</h3>
        
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-theme-accent border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-16 bg-theme-surface border border-theme-border rounded-2xl shadow-sm">
            <i className="fas fa-inbox text-5xl text-theme-secondary opacity-40 mb-3"></i>
            <p className="text-theme-secondary font-medium">No exams taken yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map(sub => {
              const pct = (sub.score / sub.total) * 100
              const isClickable = sub.wasLive;
              return (
                <div key={sub._id} 
                  onClick={() => isClickable && navigate(`/profile/submission/${sub._id}`)}
                  className={`bg-theme-surface border border-theme-border rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${isClickable ? 'cursor-pointer hover:border-theme-accent hover:shadow-md' : 'opacity-80'}`}
                  title={isClickable ? 'View specific results' : 'Detailed records not available for practice exams'}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-bold text-theme-primary text-lg truncate">
                        {sub.examId?.title || 'Unknown Exam'}
                      </h4>
                      {sub.wasLive ? (
                        <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold bg-theme-success-bg text-theme-success-text border border-theme-success-border rounded-md">Live</span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold bg-theme-bg text-theme-secondary border border-theme-border rounded-md">Practice</span>
                      )}
                    </div>
                    <p className="text-xs text-theme-secondary">
                      <i className="fas fa-calendar-alt mr-1.5"></i>
                      {new Date(sub.submittedAt).toLocaleString(undefined, {
                        dateStyle: 'medium', timeStyle: 'short'
                      })}
                    </p>
                    {isClickable && <p className="text-[10px] text-theme-accent mt-2 font-bold sm:hidden"><i className="fas fa-hand-pointer mr-1"></i>Tap to view details</p>}
                  </div>
                  
                  <div className="flex items-center gap-6 w-full sm:w-auto pl-2 sm:pl-4 border-l-0 sm:border-l border-theme-border mt-3 sm:mt-0 pr-2">
                    <div className="text-center flex-1 sm:flex-none">
                      <p className="text-[10px] uppercase font-bold text-theme-secondary mb-0.5">Score</p>
                      <p className={`font-black text-xl ${pct >= 70 ? 'text-theme-success-text' : pct >= 40 ? 'text-yellow-500' : 'text-theme-error-text'}`}>
                        {sub.score}<span className="text-sm text-theme-secondary font-medium">/{sub.total}</span>
                      </p>
                    </div>
                    <div className="text-center flex-1 sm:flex-none">
                      <p className="text-[10px] uppercase font-bold text-theme-secondary mb-0.5">Percent</p>
                      <p className="font-bold text-theme-primary">{pct.toFixed(0)}%</p>
                    </div>
                    {isClickable && (
                      <div className="hidden sm:flex text-theme-secondary opacity-50 group-hover:opacity-100 group-hover:text-theme-accent transition-all ml-2">
                        <i className="fas fa-chevron-right"></i>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-theme-surface border border-theme-border rounded-2xl p-8 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold text-theme-primary mb-2">Edit Name</h3>
            <p className="text-theme-secondary text-sm mb-5">Update your display name.</p>
            <input
              autoFocus
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveNewName()}
              placeholder="Your full name..."
              className="w-full px-4 py-3 rounded-xl bg-theme-bg border border-theme-border text-theme-primary outline-none focus:ring-2 focus:ring-theme-accent mb-4"
            />
            <button onClick={saveNewName}
              className="w-full bg-theme-accent text-white font-bold py-3 rounded-xl hover:opacity-90 transition-all">
              Save
            </button>
            <button onClick={() => setShowEditModal(false)}
              className="mt-3 w-full bg-theme-bg text-theme-primary border border-theme-border font-bold py-3 rounded-xl hover:opacity-80 transition-all">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
