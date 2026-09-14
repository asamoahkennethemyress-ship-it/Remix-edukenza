/**
 * EDUkenZA Academic Speech Formatter
 * 
 * Safely converts spoken mathematics and chemistry terms into standard academic notations,
 * preserving natural speech and user editability.
 */

// Spoken numbers to digits mapping for mathematical context
const WORD_TO_DIGIT: Record<string, string> = {
  zero: '0',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
  ten: '10',
  eleven: '11',
  twelve: '12',
  thirteen: '13',
  fourteen: '14',
  fifteen: '15',
  sixteen: '16',
  seventeen: '17',
  eighteen: '18',
  nineteen: '19',
  twenty: '20',
  thirty: '30',
  forty: '40',
  fifty: '50',
  sixty: '60',
  seventy: '70',
  eighty: '80',
  ninety: '90',
  hundred: '100',
};

// Superscript mapping
const SUPERSCRIPTS: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '+': '⁺',
  '-': '⁻',
  'n': 'ⁿ',
};

// Subscript mapping
const SUBSCRIPTS: Record<string, string> = {
  '0': '₀',
  '1': '₁',
  '2': '₂',
  '3': '₃',
  '4': '₄',
  '5': '₅',
  '6': '₆',
  '7': '₇',
  '8': '₈',
  '9': '₉',
};

export function toSuperscript(numStr: string): string {
  return numStr
    .split('')
    .map(c => SUPERSCRIPTS[c] || c)
    .join('');
}

export function toSubscript(numStr: string): string {
  return numStr
    .split('')
    .map(c => SUBSCRIPTS[c] || c)
    .join('');
}

/**
 * Format spoken mathematical language into clear academic notation.
 * Examples:
 * - "two x plus five equals fifteen" -> "2x + 5 = 15"
 * - "what is the square root of twenty five" -> "What is the square root of 25?"
 * - "one half" -> "1/2"
 * - "two squared" -> "2²"
 * - "pi r squared" -> "πr²"
 */
export function formatSpokenMath(text: string): string {
  if (!text) return text;
  let formatted = text;

  // 1. Common fractions
  formatted = formatted.replace(/\bone\s+half\b/gi, '1/2');
  formatted = formatted.replace(/\ba\s+half\b/gi, '1/2');
  formatted = formatted.replace(/\bhalf\b/gi, '1/2');
  formatted = formatted.replace(/\bone\s+third\b/gi, '1/3');
  formatted = formatted.replace(/\btwo\s+thirds\b/gi, '2/3');
  formatted = formatted.replace(/\bone\s+(?:fourth|quarter)\b/gi, '1/4');
  formatted = formatted.replace(/\bthree\s+(?:fourths|quarters)\b/gi, '3/4');
  formatted = formatted.replace(/\bone\s+fifth\b/gi, '1/5');

  // 2. Specific academic power forms
  // "pi r squared" -> "πr²"
  formatted = formatted.replace(/\bpi\s+r\s+squared\b/gi, 'πr²');
  formatted = formatted.replace(/\bpi\s+r\s+cubed\b/gi, 'πr³');
  formatted = formatted.replace(/\bpi\s+r\s+to\s+the\s+(?:power\s+of\s+)?(\d+)\b/gi, (_, p1) => `πr${toSuperscript(p1)}`);

  // "squared" and "cubed"
  // e.g. "two squared" -> "2²", "x squared" -> "x²", "5 squared" -> "5²"
  formatted = formatted.replace(/\b([a-zA-Z0-9]+)\s+squared\b/gi, (_, base) => {
    const normBase = WORD_TO_DIGIT[base.toLowerCase()] || base;
    return `${normBase}²`;
  });
  formatted = formatted.replace(/\b([a-zA-Z0-9]+)\s+cubed\b/gi, (_, base) => {
    const normBase = WORD_TO_DIGIT[base.toLowerCase()] || base;
    return `${normBase}³`;
  });
  formatted = formatted.replace(/\b([a-zA-Z0-9]+)\s+to\s+the\s+power\s+(?:of\s+)?(\d+|two|three|four|five)\b/gi, (_, base, power) => {
    const normBase = WORD_TO_DIGIT[base.toLowerCase()] || base;
    const normPower = WORD_TO_DIGIT[power.toLowerCase()] || power;
    return `${normBase}${toSuperscript(normPower)}`;
  });

  // 3. Spoken compound numbers in equations
  // e.g. "twenty five" -> "25", "thirty two" -> "32"
  const tens = ['twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const units = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  for (const t of tens) {
    for (const u of units) {
      const regex = new RegExp(`\\b${t}\\s+${u}\\b`, 'gi');
      const val = parseInt(WORD_TO_DIGIT[t]) + parseInt(WORD_TO_DIGIT[u]);
      formatted = formatted.replace(regex, String(val));
    }
  }

  // 4. "square root of <number/word>"
  // e.g. "what is the square root of twenty five" -> "What is the square root of 25"
  formatted = formatted.replace(/\bsquare\s+root\s+of\s+([a-zA-Z]+)\b/gi, (match, word) => {
    const digit = WORD_TO_DIGIT[word.toLowerCase()];
    if (digit) return `square root of ${digit}`;
    return match;
  });

  // 5. Mathematical equations with algebraic variables (e.g. "two x plus five equals fifteen")
  // Identify algebraic terms like "two x", "3 y", "five z"
  formatted = formatted.replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+([a-zA-Z])\b/gi, (_, num, variable) => {
    const digit = WORD_TO_DIGIT[num.toLowerCase()] || num;
    return `${digit}${variable}`;
  });

  // Check if string contains math operators or equation terms:
  // "plus", "minus", "times", "equals", "divided by"
  if (/\b(plus|minus|equals|is\s+equal\s+to|times|divided\s+by)\b/i.test(formatted)) {
    // Replace spoken numbers in math clauses
    for (const [word, digit] of Object.entries(WORD_TO_DIGIT)) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      formatted = formatted.replace(regex, digit);
    }

    // Convert operators with clean spacing around them
    formatted = formatted.replace(/\s+plus\s+/gi, ' + ');
    formatted = formatted.replace(/\s+minus\s+/gi, ' - ');
    formatted = formatted.replace(/\s+times\s+/gi, ' × ');
    formatted = formatted.replace(/\s+multiplied\s+by\s+/gi, ' × ');
    formatted = formatted.replace(/\s+divided\s+by\s+/gi, ' ÷ ');
    formatted = formatted.replace(/\s+(?:equals|is\s+equal\s+to)\s+/gi, ' = ');
    formatted = formatted.replace(/\s+greater\s+than\s+or\s+equal\s+to\s+/gi, ' ≥ ');
    formatted = formatted.replace(/\s+less\s+than\s+or\s+equal\s+to\s+/gi, ' ≤ ');
    formatted = formatted.replace(/\s+greater\s+than\s+/gi, ' > ');
    formatted = formatted.replace(/\s+less\s+than\s+/gi, ' < ');
  }

  // 6. Clean up spacing
  formatted = formatted.replace(/\s{2,}/g, ' ');

  return formatted;
}

/**
 * Format spoken chemistry expressions into standard chemical formulas.
 * Examples:
 * - "water" -> "H₂O" (when used in a scientific/equation prompt)
 * - "carbon dioxide" -> "CO₂"
 * - "hydrogen two oxygen" -> "H₂O"
 * - "two H two plus O two" -> "2H₂ + O₂"
 */
export function formatSpokenChemistry(text: string): string {
  if (!text) return text;
  let formatted = text;

  // 1. Exact common chemical formulas
  // "carbon dioxide" -> "CO₂"
  formatted = formatted.replace(/\bcarbon\s+dioxide\b/gi, 'CO₂');
  formatted = formatted.replace(/\bcarbon\s+monoxide\b/gi, 'CO');
  formatted = formatted.replace(/\bhydrogen\s+peroxide\b/gi, 'H₂O₂');
  formatted = formatted.replace(/\bsulfuric\s+acid\b/gi, 'H₂SO₄');
  formatted = formatted.replace(/\bhydrochloric\s+acid\b/gi, 'HCl');
  formatted = formatted.replace(/\bsodium\s+chloride\b/gi, 'NaCl');
  formatted = formatted.replace(/\bmethane\b/gi, 'CH₄');
  formatted = formatted.replace(/\bglucose\b/gi, 'C₆H₁₂O₆');

  // "water" -> "H₂O" if query is asking for formula or in chemical reaction context
  if (/\b(formula|molecule|chemical|reaction|density|electrolysis|equation|h2o)\b/i.test(formatted)) {
    formatted = formatted.replace(/\bwater\b/gi, 'H₂O');
  }

  // "hydrogen two oxygen" -> "H₂O"
  formatted = formatted.replace(/\bhydrogen\s+(?:two|2)\s+oxygen\b/gi, 'H₂O');
  formatted = formatted.replace(/\bH\s+(?:two|2)\s+O\b/gi, 'H₂O');

  // 2. Chemical equations: e.g. "two H two plus O two" -> "2H₂ + O₂"
  // "two H two" -> "2H₂"
  // "O two" -> "O₂"
  // "H two" -> "H₂"
  // "two H two O" -> "2H₂O"
  formatted = formatted.replace(/\b(?:two|2)\s+H\s+(?:two|2)\s+O\b/gi, '2H₂O');
  formatted = formatted.replace(/\b(?:two|2)\s+H\s+(?:two|2)\b/gi, '2H₂');
  formatted = formatted.replace(/\bH\s+(?:two|2)\b/gi, 'H₂');
  formatted = formatted.replace(/\bO\s+(?:two|2)\b/gi, 'O₂');
  formatted = formatted.replace(/\bN\s+(?:two|2)\b/gi, 'N₂');
  formatted = formatted.replace(/\bCl\s+(?:two|2)\b/gi, 'Cl₂');

  // If there's an arrow or reaction "yields" or "produces"
  formatted = formatted.replace(/\s+(?:yields|produces|reacts\s+to\s+form)\s+/gi, ' → ');

  return formatted;
}

/**
 * Master Academic Speech Processor
 * Combines mathematics, chemistry, and smart academic text cleanup.
 */
export function formatAcademicSpeech(text: string): string {
  if (!text || !text.trim()) return '';

  let result = text.trim();

  // Apply chemistry then math formatters
  result = formatSpokenChemistry(result);
  result = formatSpokenMath(result);

  // Capitalize first letter if needed (preserving Greek pi π and numbers)
  if (result.length > 0 && !result.startsWith('π') && !result.startsWith('1/') && !result.startsWith('2/') && !result.startsWith('3/')) {
    result = result.charAt(0).toUpperCase() + result.slice(1);
  }

  // If it's a question (starts with what/why/how/who/when/solve/explain/calculate), ensure punctuation
  if (/^(what|why|how|who|when|where|is|are|can|could|would|do|does)\b/i.test(result)) {
    if (!/[?.!]$/.test(result)) {
      result += '?';
    }
  }

  return result;
}
