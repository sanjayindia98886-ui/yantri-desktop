import { cleanWhatsAppLines } from './cleaner';
import { parseJodiLine } from './jodiParser';
import { parseHarufLine } from './harufParser';
import { parseBulkLines } from './bulkParser';

export * from './helpers';

export function parseWhatsAppMessage(textInput) {
  if (!textInput || typeof textInput !== 'string') {
    return { parsedEntries: [], unparsedLines: [], detectedPartyName: '', grandTotal: 0 };
  }

  var cleanedData = cleanWhatsAppLines(textInput);
  var detectedPartyName = cleanedData.detectedPartyName;
  var cleanedLines = cleanedData.cleanedLines;

  var parsedEntries = [];
  var unparsedLines = [];
  var grandTotal = 0;

  cleanedLines.forEach(function(line) {
    // 1. सबसे पहले हरफ़ चेक करें
    var harufResult = parseHarufLine(line);
    if (harufResult) {
      parsedEntries.push(harufResult);
      grandTotal += harufResult.lineTotal;
      return;
    }

    // 2. जोड़ी और पलट (Plt, Palat) चेक करें
    var jodiResult = parseJodiLine(line);
    if (jodiResult) {
      parsedEntries.push(jodiResult);
      grandTotal += jodiResult.lineTotal;
      return;
    }

    // 3. जो समझ में न आए, सीधे Unparsed (Error Box) में डालें
    unparsedLines.push(line);
  });

  // 4. अगर Unparsed लाइन्स में से कोई Bulk Multi-Line फॉर्मेट निकलता है
  if (unparsedLines.length > 0) {
    var bulkResult = parseBulkLines(unparsedLines);
    if (bulkResult && bulkResult.parsedEntries && bulkResult.parsedEntries.length > 0) {
      parsedEntries.push.apply(parsedEntries, bulkResult.parsedEntries);
      grandTotal += bulkResult.grandTotal;

      return {
        parsedEntries: parsedEntries,
        unparsedLines: bulkResult.unparsedLines,
        detectedPartyName: detectedPartyName,
        grandTotal: grandTotal
      };
    }
  }

  return {
    parsedEntries: parsedEntries,
    unparsedLines: unparsedLines, // यह दाएं तरफ लाल एरर बॉक्स में दिखेगा
    detectedPartyName: detectedPartyName,
    grandTotal: grandTotal
  };
}