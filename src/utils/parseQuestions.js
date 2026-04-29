// ── TXT Parser ───────────────────────────────────────────────────────────────
// Format per question (blank line between questions):
//   Q1. `question text`
//   1. option one
//   2. option two
//   3. option three
//   4. option four
//   *4(ans)
//   **(explanation text — optional)

export function parseTXT(text) {
  const questions = [];
  const blocks = text.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) continue;

    let question = '';
    const options = [];
    let correct = -1;
    let explanation = '';

    for (const line of lines) {
      if (/^Q\d+\.\s+/.test(line)) {
        question = line.replace(/^Q\d+\.\s+/, '').trim();
      } else if (/^\d+\.\s+/.test(line)) {
        options.push(line.replace(/^\d+\.\s+/, '').trim());
      } else if (/^\*\d+\(ans\)/.test(line)) {
        const m = line.match(/^\*(\d+)\(ans\)/);
        if (m) correct = parseInt(m[1]) - 1; // to 0-indexed
      } else if (/^\*\*/.test(line)) {
        explanation = line.replace(/^\*\*\s*/, '').trim();
      }
    }

    if (question && options.length >= 2 && correct >= 0) {
      questions.push({ question, options, correct, explanation });
    }
  }
  return questions;
}

// ── JSON Parser ──────────────────────────────────────────────────────────────
export function parseJSON(text) {
  const data = JSON.parse(text); // let it throw for invalid JSON
  if (!Array.isArray(data)) throw new Error('Root must be an array');
  return data.map((q, i) => {
    if (!q.question) throw new Error(`Question ${i + 1} missing "question" field`);
    if (!Array.isArray(q.options) || q.options.length < 2) throw new Error(`Question ${i + 1} needs at least 2 options`);
    if (q.correct === undefined) throw new Error(`Question ${i + 1} missing "correct" index`);
    return {
      question: String(q.question),
      options: q.options.map(String),
      correct: Number(q.correct),
      explanation: q.explanation ? String(q.explanation) : ''
    };
  });
}

// ── CSV Parser ───────────────────────────────────────────────────────────────
// Header: question,option1,option2,option3,option4,option5,correct,explanation
export function parseCSV(text) {
  const lines = text.trim().split('\n');
  const questions = [];
  for (let i = 1; i < lines.length; i++) { // skip header
    const fields = splitCSVLine(lines[i]);
    if (fields.length < 4) continue;
    const question = fields[0].trim();
    const options = fields.slice(1, 6).map(f => f.trim()).filter(Boolean);
    const correct = parseInt(fields[6] ?? '0', 10);
    const explanation = (fields[7] ?? '').trim();
    if (question && options.length >= 2) {
      questions.push({ question, options, correct, explanation });
    }
  }
  return questions;
}

function splitCSVLine(line) {
  const result = [];
  let inQuote = false;
  let cur = '';
  for (const ch of line) {
    if (ch === '"') { inQuote = !inQuote; }
    else if (ch === ',' && !inQuote) { result.push(cur); cur = ''; }
    else { cur += ch; }
  }
  result.push(cur);
  return result;
}
