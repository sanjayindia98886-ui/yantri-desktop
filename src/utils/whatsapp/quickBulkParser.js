// src/utils/whatsapp/quickBulkParser.js

/**
 * WhatsApp Header, Timestamp, Date & Trash Cleaner
 */
export function cleanQuickBulkText(textInput) {
  if (!textInput || typeof textInput !== 'string') {
    return { detectedPartyName: '', cleanedLines: [] };
  }

  var lines = textInput.split(/\r?\n/);
  var cleanedLines = [];
  var detectedPartyName = '';

  lines.forEach(function(rawLine) {
    var line = rawLine.trim();
    if (!line) return;

    if (/this message was deleted|media omitted|message deleted/i.test(line)) {
      return;
    }

    var partyMatch = line.match(/^\[.?\]\s([^:]+):/) || line.match(/^\]\s*([^:]+):/);
    if (partyMatch) {
      if (!detectedPartyName) {
        var rawName = partyMatch[1];
        detectedPartyName = rawName.replace(/(?:\+?\d{1,3}[\s-]?)?\d{10}/g, '')
                                   .replace(/[~+]/g, '')
                                   .trim();
      }
      line = line.substring(line.indexOf(':') + 1).trim();
    } else {
      line = line.replace(/^\[.?\]\s/g, '').replace(/^\]\s*/g, '').trim();
    }

    if (!line) return;

    line = line.replace(/\b\d{1,2}:\d{2}\s*(?:am|pm)?\b/gi, '').trim();
    line = line.replace(/\b\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}\b/g, '').trim();
    line = line.replace(/(?:\+?\d{1,3}[\s-]?)?\d{10}/g, '').trim();
    line = line.replace(/^Forwarded\s*/i, '').trim();
    line = line.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();

    if (/^(total|grand total|gali|desawar|dbsg|rs\.|inr|₹)/i.test(line)) {
      return;
    }

    if (line.length > 0) {
      cleanedLines.push(line);
    }
  });

  return {
    detectedPartyName: detectedPartyName,
    cleanedLines: cleanedLines
  };
}

/**
 * Into / Bracket Cut-off Quick Bulk Parser
 */
export function parseQuickBulk(rawInputText, manualAmountInput) {
  var cleanResult = cleanQuickBulkText(rawInputText);
  var lines = cleanResult.cleanedLines;

  if (!lines || lines.length === 0) {
    return {
      partyName: cleanResult.detectedPartyName || '',
      items: [],
      unparsedLines: [],
      grandTotal: 0
    };
  }

  var manualAmt = manualAmountInput ? parseInt(manualAmountInput, 10) : null;
  var allResults = [];
  var pendingHouses = [];
  var unparsedLines = [];
  var grandTotal = 0;

  lines.forEach(function(cleanLine) {
    if (!cleanLine) return;

    // 1. चेक करें कि इस लाइन में 'into' या ब्रैकेट वाला अमाउंट है या नहीं
    var amtMatch = cleanLine.match(/into\s*(\d+)/i) || 
                   cleanLine.match(/\((\d+)\)/) || 
                   cleanLine.match(/=\s*(?:into\s*)?(\d+)/i) ||
                   cleanLine.match(/=\s*(\d+)/);

    var currentLineAmount = amtMatch ? parseInt(amtMatch[1], 10) : null;

    // 2. लाइन में से रेट वाले शब्दों को हटाकर नंबर निकालें
    var lineWithoutAmt = cleanLine.replace(/into\s*\d+/gi, '')
                                  .replace(/\(\d+\)/g, '')
                                  .replace(/=\s*(?:into\s*)?\d+/gi, '')
                                  .replace(/=\s*\d+/g, '');

    var itemsInLine = lineWithoutAmt
      .split(/[\s,\.\/\-]+/)
      .map(function(item) { return item.trim(); })
      .filter(function(item) { return item.length > 0; });

    itemsInLine.forEach(function(item) {
      if (!isNaN(item) && item.length <= 2) {
        var formattedNum = item.length === 1 ? '0' + item : item;
        pendingHouses.push(formattedNum);
      } else {
        unparsedLines.push(item);
      }
    });

    // 3. 🎯 कट-ऑफ लॉजिक: जैसे ही रेट (Into / Bracket) मिला, पिछले सभी जमा घरों को वही रेट देकर ब्लॉक बंद करें
    if (currentLineAmount) {
      pendingHouses.forEach(function(house) {
        allResults.push({
          houseNumber: house,
          amount: currentLineAmount
        });
        grandTotal += currentLineAmount;
      });
      // बकेट खाली करें ताकि अगले घर इसमें मिक्स न हों
      pendingHouses = []; 
    }
  });

  // 4. अगर मैसेज के अंत में कोई घर बचे हैं और उनका कोई into/bracket नहीं था, तो Manual Amount से भरें
  if (pendingHouses.length > 0 && manualAmt) {
    pendingHouses.forEach(function(house) {
      allResults.push({
        houseNumber: house,
        amount: manualAmt
      });
      grandTotal += manualAmt;
    });
  }

  return {
    partyName: cleanResult.detectedPartyName || '',
    items: allResults,
    unparsedLines: unparsedLines,
    grandTotal: grandTotal
  };
}