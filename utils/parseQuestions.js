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
  const rows = parseCSVRows(text.trim())
  const questions = []
  const expectedHeaders = ['question', 'option1', 'option2', 'option3', 'option4', 'option5', 'correct', 'explanation']
  const headers = rows[0]?.map((field) => field.trim().toLowerCase())

  if (!headers || headers.length !== expectedHeaders.length || !expectedHeaders.every((header, index) => headers[index] === header)) {
    throw new Error('CSV must start with this header: question,option1,option2,option3,option4,option5,correct,explanation')
  }

  for (let i = 1; i < rows.length; i += 1) {
    const fields = rows[i]
    if (fields.every((field) => field.trim() === '')) continue
    if (fields.length !== 8) {
      throw new Error(`CSV row ${i + 1} must have exactly 8 columns`)
    }

    const question = fields[0].trim()
    if (!question) throw new Error(`CSV row ${i + 1} is missing a question`)

    const rawOptions = fields.slice(1, 6).map((field) => field.trim())
    const firstBlankOption = rawOptions.findIndex((option) => option === '')
    const hasOptionAfterBlank = firstBlankOption !== -1 &&
      rawOptions.slice(firstBlankOption + 1).some((option) => option !== '')
    if (hasOptionAfterBlank) {
      throw new Error(`CSV row ${i + 1} has a blank option before a filled option`)
    }

    const options = rawOptions.filter(Boolean)
    if (options.length < 2) throw new Error(`CSV row ${i + 1} needs at least 2 options`)

    const correctText = fields[6].trim()
    if (!/^\d+$/.test(correctText)) {
      throw new Error(`CSV row ${i + 1} has an invalid correct index`)
    }

    const correct = Number(correctText)
    if (correct < 0 || correct >= options.length) {
      throw new Error(`CSV row ${i + 1} correct index is outside the option range`)
    }

    questions.push({
      question,
      options,
      correct,
      explanation: fields[7].trim(),
    })
  }

  return questions
}

function parseCSVRows(text) {
  if (!text) return []

  const rows = []
  let row = []
  let field = ''
  let inQuote = false
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i]
    if (char === '"') {
      if (inQuote && normalized[i + 1] === '"') {
        field += '"'
        i += 1
      } else {
        inQuote = !inQuote
      }
    } else if (char === ',' && !inQuote) {
      row.push(field)
      field = ''
    } else if (char === '\n' && !inQuote) {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }

  if (inQuote) throw new Error('CSV has an unclosed quoted field')

  row.push(field)
  if (row.some((value) => value.trim() !== '')) rows.push(row)

  return rows
}
