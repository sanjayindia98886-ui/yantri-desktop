// 1. Laddi Generator
export function calculateLaddi(from, to, amount) {
  const start = Number(from);
  const end = Number(to);
  if (isNaN(start) || isNaN(end) || !amount) return [];

  const result = [];
  for (let num = start; num <= end; num++) {
    let formatted = num < 10 ? '0' + num : String(num);
    if (num === 100) formatted = '00';
    result.push({ no: formatted, amount: String(amount) });
  }
  return result;
}

// 2. Pehada Generator (With Add 3 Logic)
export function calculatePehada(text, amt, add3) {
  const startNum = Number(text);
  if (isNaN(startNum) || !amt || startNum <= 0) return [];

  const result = [];
  const step = add3 ? 3 : startNum;

  for (let num = startNum; num <= 100; num += step) {
    let formatted = num < 10 ? '0' + num : String(num);
    if (num === 100) formatted = '00';
    result.push({ no: formatted, amount: String(amt) });
  }
  return result;
}

// 3. Haruf Generator
export function calculateHaruf(no, amount, type) {
  let hNo = String(no).trim();
  if (!hNo || !amount) return [];

  const digits = hNo.replace(/[^0-9]/g, '').split('');
  if (digits.length === 0) return [];

  const result = [];

  digits.forEach((d) => {
    const code = type === 'Ander' ? d + 'A' : d + 'B';
    result.push({ no: code, amount: String(amount) });
  });

  return result;
}

// 4. BULK Parser (F6 to F12)
export function parseBulkData(type, nosText, amount, palatAmount) {
  if (!nosText || !nosText.trim()) return [];

  const amtVal = String(amount || '');
  const result = [];
  const cleanInput = nosText.trim();

  // 1. Bulk (F6)
  if (type === 'Bulk (F6)') {
    const tokens = cleanInput.split('-').filter((t) => t.trim() !== '');
    tokens.forEach((t) => {
      let formatted = t.trim();
      if (formatted.length === 1) formatted = '0' + formatted;
      if (amtVal) result.push({ no: formatted, amount: amtVal });
    });
  } 
  // 2. Ander/Bahar Akhar (F12) - (इसे ऊपर रखा गया है ताकि F7 या F8 से पहले मैच हो जाए)
  else if (type.indexOf('Ander/Bahar') !== -1 || type.indexOf('F12') !== -1) {
    const digits = cleanInput.replace(/[^0-9]/g, '').split('');
    digits.forEach((d) => {
      if (amtVal) {
        result.push({ no: d + 'B', amount: amtVal }); // Bahar (1B)
        result.push({ no: d + 'A', amount: amtVal }); // Ander (1A)
      }
    });
  }
  // 3. Ander Akhar (F7)
  else if (type.indexOf('Ander') !== -1 || type.indexOf('F7') !== -1) {
    const digits = cleanInput.replace(/[^0-9]/g, '').split('');
    digits.forEach((d) => {
      if (amtVal) {
        result.push({ no: d + 'A', amount: amtVal });
      }
    });
  } 
  // 4. Bahar Akhar (F8)
  else if (type.indexOf('Bahar') !== -1 || type.indexOf('F8') !== -1) {
    const digits = cleanInput.replace(/[^0-9]/g, '').split('');
    digits.forEach((d) => {
      if (amtVal) {
        result.push({ no: d + 'B', amount: amtVal });
      }
    });
  } 
  // 5. Crossing with Jode (F9)
  else if (type.indexOf('Crossing with Jode') !== -1 || type.indexOf('F9') !== -1) {
    const digits = cleanInput.replace(/[^0-9]/g, '').split('');
    digits.forEach((d1) => {
      digits.forEach((d2) => {
        if (amtVal) result.push({ no: d1 + d2, amount: amtVal });
      });
    });
  } 
  // 6. Crossing without Jode (F10)
  else if (type.indexOf('Crossing without Jode') !== -1 || type.indexOf('F10') !== -1) {
    const digits = cleanInput.replace(/[^0-9]/g, '').split('');
    digits.forEach((d1) => {
      digits.forEach((d2) => {
        if (d1 !== d2 && amtVal) {
          result.push({ no: d1 + d2, amount: amtVal });
        }
      });
    });
  } 
  // 7. Palat (F11)
  else if (type && (type.includes('Palat') || type.indexOf('F11') !== -1)) {
    const mainAmt = Number(amount) || 0;
    const pAmt = Number(palatAmount) || 0;

    const cleanStr = cleanInput.replace(/[^0-9]/g, '');
    const tokens = [];

    if (cleanStr.length % 2 === 0 && cleanStr.length >= 2) {
      for (let i = 0; i < cleanStr.length; i += 2) {
        tokens.push(cleanStr.substring(i, i + 2));
      }
    } else {
      const rawTokens = cleanInput.split(/[\s,-]+/);
      rawTokens.forEach((t) => {
        let clean = t.replace(/[^0-9]/g, '');
        if (clean.length === 1) clean = '0' + clean;
        if (clean.length === 2) tokens.push(clean);
      });
    }

    tokens.forEach((formatted) => {
      if (mainAmt > 0) {
        result.push({ no: formatted, amount: String(mainAmt) });
      }
      const isJode = formatted[0] === formatted[1];
      if (pAmt > 0 && !isJode) {
        const revNum = formatted[1] + formatted[0];
        result.push({ no: revNum, amount: String(pAmt) });
      }
    });
  } 

  return result;
}