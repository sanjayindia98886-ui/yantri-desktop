import { extractJodis, extractAmount } from "./helpers";

export function parseBulkLines(lines) {
  if (!Array.isArray(lines)) {
    return { parsedEntries: [], unparsedLines: [], grandTotal: 0 };
  }

  const parsedEntries = [];
  const unparsedLines = [];
  let buffer = [];

  function flushBuffer(amount) {
    if (!buffer.length || !amount) {
      if (buffer.length) {
        unparsedLines.push(...buffer); // अगर अमाउंट नहीं मिला तो एरर में भेजें
        buffer = [];
      }
      return;
    }

    const bets = [];
    const validLinesInBuf = [];

    buffer.forEach(function (line) {
      const numbers = extractJodis(line);
      if (numbers && numbers.length > 0) {
        numbers.forEach(function (num) {
          bets.push({
            number: num,
            amount: amount,
            type: "SINGLE_RATE"
          });
        });
        validLinesInBuf.push(line);
      } else {
        // अगर लाइन में से कोई वैध जोड़ी नहीं निकली तो एरर बॉक्स में डालें
        unparsedLines.push(line);
      }
    });

    if (bets.length > 0) {
      parsedEntries.push({
        format: "BULK",
        originalText: validLinesInBuf.join(" "),
        bets: bets,
        lineTotal: bets.length * amount
      });
    }

    buffer = [];
  }

  lines.forEach(function (line) {
    if (!line) return;
    const txt = line.trim();

    if (/^total/i.test(txt) || /^\d+\s*\/-$/.test(txt)) return;

    // Check for amount line
    const isAmountOnly = /^(into|int|intu|=+)\s*\d+$/i.test(txt) || /^\(\d+\)$/.test(txt);
    if (isAmountOnly) {
      const amount = extractAmount(txt);
      flushBuffer(amount);
      return;
    }

    if (/\d/.test(txt)) {
      buffer.push(txt);
    } else {
      // बिना नंबर वाली लाइन को सीधे एरर में भेजें
      unparsedLines.push(txt);
    }
  });

  // 🔥 सुधार: जो बफ़र बिना अमाउंट के आख़िर में बच गया, उसे सीधे unparsedLines (एरर) में डालें
  if (buffer.length > 0) {
    unparsedLines.push(...buffer);
  }

  return {
    parsedEntries: parsedEntries,
    unparsedLines: unparsedLines,
    grandTotal: parsedEntries.reduce((sum, item) => sum + (item.lineTotal || 0), 0)
  };
}