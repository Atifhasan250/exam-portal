export function parseTXT(text) {
  const questions = []
  const blocks = text.trim().split(/\n\s*\n/)

  for (const block of blocks) {
    const lines = block.trim().split('\n').map((line) => line.trim()).filter(Boolean)
    if (!lines.length) continue

    let question = ''
    const options = []
    let correct = -1
    let explanation = ''

    for (const line of lines) {
      if (/^Q\d+\.\s+/.test(line)) {
        question = line.replace(/^Q\d+\.\s+/, '').trim()
      } else if (/^\d+\.\s+/.test(line)) {
        options.push(line.replace(/^\d+\.\s+/, '').trim())
      } else if (/^\*\d+\(ans\)/.test(line)) {
        const match = line.match(/^\*(\d+)\(ans\)/)
        if (match) correct = parseInt(match[1], 10) - 1
      } else if (/^\*\*/.test(line)) {
        explanation = line.replace(/^\*\*\s*/, '').trim()
      }
    }

    if (question && options.length >= 2 && correct >= 0) {
      questions.push({ question, options, correct, explanation })
    }
  }

  return questions
}

export function parseJSON(text) {
  const data = JSON.parse(text)
  if (!Array.isArray(data)) throw new Error('Root must be an array')

  return data.map((question, index) => {
    if (!question.question) throw new Error(`Question ${index + 1} missing "question" field`)
    if (!Array.isArray(question.options) || question.options.length < 2) {
      throw new Error(`Question ${index + 1} needs at least 2 options`)
    }
    if (question.correct === undefined) throw new Error(`Question ${index + 1} missing "correct" index`)

    return {
      question: String(question.question),
      options: question.options.map(String),
      correct: Number(question.correct),
      explanation: question.explanation ? String(question.explanation) : '',
    }
  })
}

export function parseCSV(text) {
  const lines = text.trim().split('\n')
  const questions = []

  for (let i = 1; i < lines.length; i += 1) {
    const fields = splitCSVLine(lines[i])
    if (fields.length < 4) continue

    const question = fields[0].trim()
    const options = fields.slice(1, 6).map((field) => field.trim()).filter(Boolean)
    const correct = parseInt(fields[6] ?? '0', 10)
    const explanation = (fields[7] ?? '').trim()

    if (question && options.length >= 2) {
      questions.push({ question, options, correct, explanation })
    }
  }

  return questions
}

function splitCSVLine(line) {
  const result = []
  let inQuote = false
  let current = ''

  for (const char of line) {
    if (char === '"') {
      inQuote = !inQuote
    } else if (char === ',' && !inQuote) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }

  result.push(current)
  return result
}
