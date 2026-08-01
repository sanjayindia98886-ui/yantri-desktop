import { generateHarufNumbers } from './helpers';

export function parseHarufLine(line) {
  if (!line || typeof line !== 'string') return null;

  var txt = line.trim();

  // अगर इसमें पलट लिखा है, तो यह हरफ़ नहीं है
  if (/plt|palat/i.test(txt)) return null;

  // 1. अमाउंट निकालें (उदा: (100), =100, into 100, 100/-)
  var amountMatch = txt.match(/(?:into|=|-|\/|\()\s*(\d+)\)?$/i);
  if (!amountMatch) return null;
  var ratePerHaruf = parseFloat(amountMatch[1]);

  var cleanText = txt.toUpperCase();
  cleanText = cleanText.replace(/\(\d+\)/g, '');
  cleanText = cleanText.replace(/INTO\s*\d+/gi, '');
  cleanText = cleanText.replace(/[=\-]\d+/g, '');

  var bets = [];
  var lineTotal = 0;

  // 2. केस 1: अगर सीधे 3 बार अंक लिखा है (उदा: 666(100) या 666 (100)) ➔ बाहर (3 छक्के)
  var threeDigitMatch = cleanText.match(/\b([0-9])\1{2}\b/);
  if (threeDigitMatch) {
    var digit3 = threeDigitMatch[1];
    var num3 = digit3 + digit3 + digit3;
    bets.push({
      number: num3,
      amount: ratePerHaruf,
      type: 'HARUF'
    });
    return {
      format: 'HARUF_OUTSIDE',
      originalText: line,
      bets: bets,
      lineTotal: ratePerHaruf
    };
  }

  // 3. केस 2: अगर सीधे 4 बार अंक लिखा है (उदा: 6666(100) या 6666 (100)) ➔ अंदर (4 छक्के)
  var fourDigitMatch = cleanText.match(/\b([0-9])\1{3}\b/);
  if (fourDigitMatch) {
    var digit4 = fourDigitMatch[1];
    var num4 = digit4 + digit4 + digit4 + digit4;
    bets.push({
      number: num4,
      amount: ratePerHaruf,
      type: 'HARUF'
    });
    return {
      format: 'HARUF_INSIDE',
      originalText: line,
      bets: bets,
      lineTotal: ratePerHaruf
    };
  }

  // 4. केस 3: A, B, AB टैग वाले कोड (उदा: 6A(100), 6B(100), 76AB(100))
  var match = cleanText.match(/([0-9.,\s]+)\s*([AB]{1,2})\b/i);
  if (!match) return null;

  var digitsPart = match[1];
  var tag = match[2].toUpperCase();

  var harufType = '';
  if (tag === 'AB') harufType = 'BOTH';
  else if (tag === 'A') harufType = 'INSIDE';
  else if (tag === 'B') harufType = 'OUTSIDE';
  else return null;

  var rawDigits = digitsPart.replace(/[^0-9]/g, '');
  if (!rawDigits) return null;

  var uniqueDigits = Array.from(new Set(rawDigits.split('')));

  // हर अंक (उदा: 76 में से 7 और 6 दोनों) के लिए लूप
  uniqueDigits.forEach(function(digit) {
    var targetDigit = digit;
    if (digit === '0' || digitsPart.indexOf('100') !== -1 || digitsPart.indexOf('000') !== -1) {
      targetDigit = '0';
    }

    if (harufType === 'INSIDE') {
      // अंदर (A) ➔ 4 बार अंक (6666)
      var fourDigit = targetDigit + targetDigit + targetDigit + targetDigit;
      bets.push({
        number: fourDigit,
        amount: ratePerHaruf,
        type: 'HARUF'
      });
      lineTotal += ratePerHaruf;

    } else if (harufType === 'OUTSIDE') {
      // बाहर (B) ➔ 3 बार अंक (666)
      var threeDigit = targetDigit + targetDigit + targetDigit;
      bets.push({
        number: threeDigit,
        amount: ratePerHaruf,
        type: 'HARUF'
      });
      lineTotal += ratePerHaruf;

    } else if (harufType === 'BOTH') {
      // अंदर + बाहर (AB) ➔ 4 बार (6666) और 3 बार (666) दोनों
      var fourDigitAB = targetDigit + targetDigit + targetDigit + targetDigit;
      var threeDigitAB = targetDigit + targetDigit + targetDigit;

      bets.push({
        number: fourDigitAB,
        amount: ratePerHaruf,
        type: 'HARUF'
      });

      bets.push({
        number: threeDigitAB,
        amount: ratePerHaruf,
        type: 'HARUF'
      });

      lineTotal += (ratePerHaruf * 2);
    }
  });

  return {
    format: 'HARUF_' + harufType,
    originalText: line,
    bets: bets,
    lineTotal: lineTotal
  };
}