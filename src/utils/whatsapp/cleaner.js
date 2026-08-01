export function cleanWhatsAppLines(textInput) {
  if (!textInput || typeof textInput !== 'string') {
    return { detectedPartyName: '', cleanedLines: [] };
  }

  var lines = textInput.split(/\r?\n/);
  var cleanedLines = [];
  var detectedPartyName = '';

  lines.forEach(function(rawLine) {
    var line = rawLine.trim();
    if (!line) return;

    // STEP 1: WhatsApp System Messages / Media Trash ignore करें
    if (/this message was deleted|media omitted|message deleted/i.test(line)) {
      return;
    }

    // STEP 2: Header + Party Name Extract (उदा: [12:36 am, 27/7/2026] Baby😍 S Shyam:)
    var partyMatch = line.match(/^\[.?\]\s([^:]+):/);
    if (partyMatch) {
      if (!detectedPartyName) {
        // नाम में से फोन नंबर, प्लस या ~ सिंबल साफ करें
        var rawName = partyMatch[1];
        detectedPartyName = rawName.replace(/(?:\+?\d{1,3}[\s-]?)?\d{10}/g, '')
                                   .replace(/[~+]/g, '')
                                   .trim();
      }
      // हेडर का हिस्सा ([... ] Name:) लाइन से काटकर अलग करें
      line = line.substring(line.indexOf(':') + 1).trim();
    }

    if (!line) return;

    // STEP 3: बिना नाम वाले ब्रैकेट हेडर साफ़ करें (उदा: [, ] या [12:30 pm])
    line = line.replace(/^\[.?\]\s/g, '').trim();

    // STEP 4: Forwarded message tags साफ़ करें
    line = line.replace(/^Forwarded\s*/i, '').trim();

    // STEP 5: अलग-अलग तरह के टाइमस्टैम्प्स हटाएँ (उदा: 12:36 am, 13:10, 7:10 pm)
    line = line.replace(/\b\d{1,2}:\d{2}\s*(?:am|pm)?\b/gi, '').trim();

    // STEP 6: तारीख के फॉर्मेट्स साफ़ करें (उदा: 27/7/2026, 27/07/26)
    line = line.replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, '').trim();

    // STEP 7: फ़ोन नंबर पूरी तरह साफ़ करें
    line = line.replace(/(?:\+?\d{1,3}[\s-]?)?\d{10}/g, '').trim();

    // STEP 8: फालतू स्पेस या स्पेशल ज़ीरो-विड्थ कैरेक्टर्स हटाएँ
    line = line.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();

    // STEP 9: अगर साफ़ होने के बाद भी कुछ काम का डेटा बचा है, तो ही लिस्ट में डालें
    if (line.length > 0) {
      cleanedLines.push(line);
    }
  });

  return {
    detectedPartyName: detectedPartyName,
    cleanedLines: cleanedLines
  };
}