import { buildPageMetadata } from '@/lib/site'
import { isValidObjectId } from '@/lib/routeParams'
import { connectDB } from '@/lib/db'
import Exam from '@/lib/models/Exam'
import ExamPageClient from './ExamPageClient'

export async function generateMetadata({ params }) {
  const { id } = await params
  if (!isValidObjectId(id)) {
    return buildPageMetadata({
      title: 'Exam Not Found',
      description: 'The requested exam could not be found.',
      path: `/exam/${id}`,
    })
  }

  try {
    await connectDB()
    const exam = await Exam.findOne({ _id: id, published: true }, { title: 1, duration: 1 }).lean()

    if (!exam) {
      return buildPageMetadata({
        title: 'Exam Not Found',
        description: 'The requested exam could not be found.',
        path: `/exam/${id}`,
      })
    }

    return buildPageMetadata({
      title: exam.title,
      description: `Join ${exam.title} on IT Resource Zone. Timed exam access with instant scoring, practice review, and student-focused assessment flow.`,
      path: `/exam/${id}`,
      keywords: ['online exam', 'IT exam', exam.title],
    })
  } catch {
    return buildPageMetadata({
      title: 'Exam',
      description: 'Take a timed IT exam on IT Resource Zone.',
      path: `/exam/${id}`,
    })
  }
}

export default function ExamPage(props) {
  return <ExamPageClient {...props} />
}
