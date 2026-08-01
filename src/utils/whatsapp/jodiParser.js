import { extractJodis } from './helpers';

export function parseJodiLine(line) {
  if (!line || typeof line !== 'string') return null;

  var txt = line.trim();

  // 1. गेम के नाम और फालतू टेक्स्ट साफ़ करें
  txt = txt.replace(/^\[.*?\]|\b(deli bajar|gzbd|gali|ds|fd|fb|faridabad|disawar|db|shri ganesh)\b/gi, '').trim();

  if (/^total/i.test(txt) || (/\b[ab]\b/i.test(txt) && !/plt|palat/i.test(txt))) return null;

  // 2. Multi-Bracket पैटर्न (उदा: 52(500)50.55(150)...)
  var bracketMatch, multiBets = [], multiTotal = 0;
  var bracketRegex = /([0-9.,\s\-\*]+)\((\d+)\)/g;

  while ((bracketMatch = bracketRegex.exec(txt)) !== null) {
    var jodisInGrp = extractJodis(bracketMatch[1]);
    var amtInGrp = parseFloat(bracketMatch[2]);
    jodisInGrp.forEach(function(j) {
      multiBets.push({ number: j, amount: amtInGrp, type: 'SINGLE_RATE' });
      multiTotal += amtInGrp;
    });
  }

  if (multiBets.length > 0) {
    return { format: 'MULTI_BRACKET_JODI', originalText: line, bets: multiBets, lineTotal: multiTotal };
  }

  // 3. Normal / Palat पैटर्न के रेट निकालें
  var hasPalat = /plt|palat|palit/i.test(txt);
  var multiMatch = hasPalat && txt.match(/(?:into|=|-|\/)?\s*(\d+)\s*(?:with\s*)?(?:plt|palat|palit)\s*(?:into|=|-|\/)?\s*(\d+)?/i);
  
  var directAmount = multiMatch ? parseFloat(multiMatch[1]) : 0;
  var palatAmount = multiMatch ? (multiMatch[2] ? parseFloat(multiMatch[2]) : directAmount) : 0;

  if (!directAmount) {
    var normMatch = txt.match(/(?:into|=|-|\/|\()\s*(\d+)\)?/i);
    if (!normMatch) return null;
    directAmount = parseFloat(normMatch[1]);
    palatAmount = directAmount;
  }

  // 4. 🔥 सुधार: जोड़ी निकालने से पहले अमाउंट और रेट वाले टेक्स्ट को पूरी तरह काट कर हटाएँ
  var jodiText = txt
    .replace(/(?:with\s*)?(?:plt|palat|palit).*/gi, '')
    .replace(/(?:into|=|-|\/|\()\s*\d+\)?/gi, '') // Amount कट हो गया
    .replace(/[cx.,/\-\*]+/gi, ' ')
    .trim();

  var jodis = extractJodis(jodiText);
  if (!jodis || !jodis.length) return null;

  // 5. Bets एरे तैयार करें
  var bets = [], lineTotal = 0;
  jodis.forEach(function(j) {
    bets.push({ number: j, amount: directAmount, type: 'SINGLE_RATE' });
    lineTotal += directAmount;

    if (hasPalat && palatAmount > 0 && j[0] !== j[1]) {
      bets.push({ number: j[1] + j[0], amount: palatAmount, type: 'SINGLE_RATE' });
      lineTotal += palatAmount;
    }
  });

  return {
    format: hasPalat ? 'JODI_WITH_PALAT' : 'SINGLE_RATE',
    originalText: line,
    bets: bets,
    lineTotal: lineTotal
  };
}