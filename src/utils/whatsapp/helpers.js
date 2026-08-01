export function extractJodis(text) {
  if (!text || typeof text !== 'string') return [];
  var digits = text.replace(/[^0-9]/g, ' ');
  var parts = digits.trim().split(/\s+/);
  var jodis = [];
  
  parts.forEach(function(p) {
    if (p.length === 2) {
      jodis.push(p);
    } else if (p.length > 2 && p.length % 2 === 0) {
      for (var i = 0; i < p.length; i += 2) {
        jodis.push(p.substring(i, i + 2));
      }
    }
  });
  return jodis;
}

export function extractAmount(line) {
  if (!line || typeof line !== 'string') return 0;
  var match = line.match(/(?:into|=|-|\/|\()\s*(\d+)\)?$/i);
  return match ? parseFloat(match[1]) : 0;
}

export function generateHarufNumbers(digit, harufType) {
  var numbers = [];
  var d = String(digit);
  for (var i = 0; i <= 9; i++) {
    if (harufType === 'INSIDE') {
      numbers.push(d + String(i));
    } else if (harufType === 'OUTSIDE') {
      numbers.push(String(i) + d);
    } else if (harufType === 'BOTH') {
      numbers.push(d + String(i));
      if (d !== String(i)) {
        numbers.push(String(i) + d);
      }
    }
  }
  return Array.from(new Set(numbers));
}