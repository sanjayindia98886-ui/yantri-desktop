import React, { useState, useEffect, useRef } from 'react';
// नए मॉड्यूलर व्हाट्सएप पार्सर से इम्पोर्ट करें
import { parseWhatsAppMessage } from '../../utils/whatsapp';
import { parseQuickBulk } from '../../utils/whatsapp/quickBulkParser';

const WhatsAppPasteModal = ({ isOpen, onClose, onConfirmEntries }) => {
  const [rawText, setRawText] = useState('');

  // Quick Bulk Single Amount State
  const [quickBulkText, setQuickBulkText] = useState('');
  const [quickAmount, setQuickAmount] = useState('');

  // LocalStorage से एरर टेक्स्ट लोड करें
  const [errorText, setErrorText] = useState(() => {
    return localStorage.getItem('pending_whatsapp_error_text') || '';
  });

  const [parsedResult, setParsedResult] = useState({ parsedEntries: [], unparsedLines: [], detectedPartyName: '', grandTotal: 0 });
  const [errorParsedResult, setErrorParsedResult] = useState({ parsedEntries: [], unparsedLines: [], grandTotal: 0 });
  const textareaRef = useRef(null);

  // Focus & Initial Auto-parse
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (textareaRef.current) textareaRef.current.focus();
      }, 50);

      const savedError = localStorage.getItem('pending_whatsapp_error_text') || '';
      if (savedError) {
        setErrorText(savedError);
        try {
          const fixResult = parseWhatsAppMessage(savedError);
          setErrorParsedResult(fixResult || { parsedEntries: [], unparsedLines: [], grandTotal: 0 });
        } catch (e) {
          console.error("Error parsing saved text", e);
        }
      }
    }
  }, [isOpen]);

  // Sync errorText with LocalStorage
  useEffect(() => {
    if (errorText) {
      localStorage.setItem('pending_whatsapp_error_text', errorText);
    } else {
      localStorage.removeItem('pending_whatsapp_error_text');
    }
  }, [errorText]);

  // Global ESC & Ctrl + Q for Close
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'Escape' || (e.ctrlKey && (e.key === 'q' || e.key === 'Q'))) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleGlobalKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // 1. Main Textarea Change Handler (Instant Valid Parsing)
  const handleMainTextChange = (e) => {
    const text = e.target.value;
    setRawText(text);

    // 🔥 अगर इनपुट बॉक्स खाली है, तो तुरंत सारा रिजल्ट और टोटल 0 सेट करें
    if (!text || !text.trim()) {
      setParsedResult({ parsedEntries: [], unparsedLines: [], detectedPartyName: '', grandTotal: 0 });
      return;
    }

    try {
      const result = parseWhatsAppMessage(text);
      setParsedResult(result || { parsedEntries: [], unparsedLines: [], grandTotal: 0 });

      // Send unparsed lines to error box
      const unparsed = result && result.unparsedLines ? result.unparsedLines.join('\n') : '';
      setErrorText(unparsed);

      if (unparsed) {
        const fixResult = parseWhatsAppMessage(unparsed);
        setErrorParsedResult(fixResult || { parsedEntries: [], unparsedLines: [], grandTotal: 0 });
      } else {
        setErrorParsedResult({ parsedEntries: [], unparsedLines: [], grandTotal: 0 });
      }
    } catch (err) {
      console.error("Parse Error:", err);
    }
  };

  // 2. Error Textarea Change Handler
  const handleErrorTextChange = (e) => {
    const text = e.target.value;
    setErrorText(text);

    if (!text || !text.trim()) {
      setErrorParsedResult({ parsedEntries: [], unparsedLines: [], grandTotal: 0 });
      return;
    }

    try {
      const fixResult = parseWhatsAppMessage(text);
      setErrorParsedResult(fixResult || { parsedEntries: [], unparsedLines: [], grandTotal: 0 });
    } catch (err) {
      console.error("Error box parse error:", err);
    }
  };

  // 3. Simple Quick Bulk Change Handler (No Connection to Error Box)
  const handleQuickBulkChange = (text, amt) => {
    setQuickBulkText(text);
    setQuickAmount(amt);
  };

  // 4. Manual Clear Button for Error Box
  const handleClearErrorBox = () => {
    setErrorText('');
    setErrorParsedResult({ parsedEntries: [], unparsedLines: [], grandTotal: 0 });
    localStorage.removeItem('pending_whatsapp_error_text');
  };

  // 5. Confirm Valid Data Function (FIXED SUBMIT LOGIC)
  const handleConfirmValidData = () => {
    if (parsedResult && parsedResult.parsedEntries && parsedResult.parsedEntries.length > 0) {
      if (typeof onConfirmEntries === 'function') {
        onConfirmEntries(parsedResult);
      }

      // 🔥 सबमिट होने के बाद बायाँ बॉक्स और Valid Total तुरंत 0 और साफ़ करें
      setRawText('');
      setParsedResult({ parsedEntries: [], unparsedLines: [], detectedPartyName: '', grandTotal: 0 });

      // अगर कोई अनपार्स एरर लाइन नहीं बची है तो मोडल बंद कर दें
      if (!errorText.trim()) {
        onClose();
      }
    }
  };

  // 6. Confirm Error Data Function
  const handleConfirmErrorData = () => {
    if (errorParsedResult && errorParsedResult.parsedEntries && errorParsedResult.parsedEntries.length > 0) {
      if (typeof onConfirmEntries === 'function') {
        onConfirmEntries(errorParsedResult);
      }

      const remainingUnparsed = errorParsedResult.unparsedLines ? errorParsedResult.unparsedLines.join('\n') : '';
      setErrorText(remainingUnparsed);

      if (remainingUnparsed) {
        try {
          const newFixResult = parseWhatsAppMessage(remainingUnparsed);
          setErrorParsedResult(newFixResult || { parsedEntries: [], unparsedLines: [], grandTotal: 0 });
        } catch (e) {
          console.error(e);
        }
      } else {
        setErrorParsedResult({ parsedEntries: [], unparsedLines: [], grandTotal: 0 });
        onClose();
      }
    }
  };

  // 7. Confirm Quick Bulk Function
  const handleConfirmQuickBulk = () => {
    if (!quickBulkText.trim()) {
      alert('कृपया नंबर या लिस्ट पेस्ट करें!');
      return;
    }

    const bulkParsed = parseQuickBulk(quickBulkText, quickAmount);

    if (!bulkParsed || !bulkParsed.items || bulkParsed.items.length === 0) {
      alert('कोई वैलिड घर/नंबर नहीं मिला या अमाउंट नहीं मिला!');
      return;
    }

    let totalSum = 0;
    const formattedEntries = bulkParsed.items.map(function (item) {
      totalSum += item.amount;
      return {
        number: item.houseNumber,
        amount: item.amount,
        type: 'DIRECT'
      };
    });

    const payload = {
      parsedEntries: formattedEntries,
      unparsedLines: [],
      detectedPartyName: bulkParsed.partyName || '',
      grandTotal: totalSum
    };

    if (typeof onConfirmEntries === 'function') {
      onConfirmEntries(payload);
    }

    setQuickBulkText('');
    setQuickAmount('');
    onClose();
  };

  // Ctrl + Enter Key Handler
  const handleMainKeyDown = (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      handleConfirmValidData();
    }
  };

  const isMainSubmitDisabled = !parsedResult || !parsedResult.parsedEntries || parsedResult.parsedEntries.length === 0;
  const hasUnfixedErrors = errorText.trim().length > 0 && errorParsedResult.unparsedLines && errorParsedResult.unparsedLines.length > 0;

  // Calculate Live Quick Bulk Total
  const currentQuickResult = parseQuickBulk(quickBulkText, quickAmount);
  const quickTotalAmt = currentQuickResult ? currentQuickResult.grandTotal : 0;

  const placeholderText = 'यहाँ WhatsApp मैसेज पेस्ट करें...\n\n' +
    'सपोर्टेड फॉर्मेट्स:\n' +
    '• 21.76.98=275 / Plt=50\n' +
    '• 6A / 6666A = 50 (अंदर)\n' +
    '• 6B / 666B = 50 (बाहर)\n' +
    '• 7 AB(100) / 111 AB-100 (अंदर+बाहर)\n' +
    '• 666.555 B. Into 300 (मल्टी सिक्का)';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(10, 10, 15, 0.85)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 99999
      }}
    >
      <div style={{
        width: '95%',
        maxWidth: '1100px',
        backgroundColor: '#18191c',
        border: '1px solid #2d3139',
        borderRadius: '8px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'Segoe UI, sans-serif'
      }}>
        {/* Header Bar */}
        <div style={{
          padding: '12px 20px',
          backgroundColor: '#202226',
          borderBottom: '1px solid #2d3139',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '16px', fontWeight: '600', color: '#e1e3e6' }}>
              WhatsApp Bulk Import Engine
            </span>
            <span style={{ fontSize: '11px', backgroundColor: '#2b303b', color: '#8a93a2', padding: '2px 8px', borderRadius: '4px' }}>
              Press Ctrl + Q or ESC to Exit
            </span>
            {parsedResult && parsedResult.detectedPartyName ? (
              <span style={{ fontSize: '12px', backgroundColor: '#1e3a8a', color: '#93c5fd', padding: '2px 8px', borderRadius: '4px' }}>
                Party: {parsedResult.detectedPartyName}
              </span>
            ) : null}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#8a93a2', fontSize: '18px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* --- ⚡ Top New Wide Box: Quick Bulk Entry --- */}
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#12161f',
          borderBottom: '1px solid #2d3139',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <label style={{ color: '#38bdf8', fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
            ⚡ Quick Bulk Single-Amount Import (लंबी लिस्ट + ब्रैकेट/अमाउंट)
          </label>
          
          <textarea
            rows="5"
            style={{
              width: '100%',
              backgroundColor: '#0a0d14',
              border: '1px solid #253346',
              borderRadius: '6px',
              color: '#38bdf8',
              padding: '10px 12px',
              fontSize: '13px',
              fontFamily: 'Consolas, monospace',
              outline: 'none',
              resize: 'vertical',
              boxSizing: 'border-box',
              lineHeight: '1.6'
            }}
            placeholder="यहाँ लंबी लिस्ट पेस्ट करें (उदा: 70,72,73...22,77(50) या Into 60 वाले मैसेज)..."
            value={quickBulkText}
            onChange={(e) => handleQuickBulkChange(e.target.value, quickAmount)}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
            <span style={{ fontSize: '13px', color: '#8a93a2' }}>
              Quick Bulk Total: <strong style={{ color: '#38bdf8', fontSize: '16px' }}>₹{quickTotalAmt}</strong>
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '12px', color: '#8a93a2' }}>Amt:</span>
              <input
                type="number"
                placeholder="अमाउंट (ऑप्शनल)"
                value={quickAmount}
                onChange={(e) => handleQuickBulkChange(quickBulkText, e.target.value)}
                style={{
                  width: '130px',
                  backgroundColor: '#0a0d14',
                  border: '1px solid #253346',
                  borderRadius: '4px',
                  color: '#ffffff',
                  padding: '6px 10px',
                  fontSize: '12px',
                  outline: 'none'
                }}
              />
              <button
                onClick={handleConfirmQuickBulk}
                style={{
                  padding: '6px 18px',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '12px'
                }}
              >
                Submit Quick Bulk
              </button>
            </div>
          </div>
        </div>

        {/* Dual Box Container */}
        <div style={{ padding: '16px', display: 'flex', gap: '16px' }}>

          {/* Main WhatsApp Paste Box */}
          <div style={{ flex: 1.3, display: 'flex', flexDirection: 'column' }}>
            <label style={{ color: '#00f2fe', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>
              📋 WhatsApp Message Box (Paste Ctrl + V) [Ctrl + Enter to Submit]
            </label>
            <textarea
              ref={textareaRef}
              rows="12"
              style={{
                width: '100%',
                backgroundColor: '#0f1012',
                border: '1px solid #2b303b',
                borderRadius: '6px',
                color: '#00f2fe',
                padding: '12px',
                fontSize: '13px',
                fontFamily: 'Consolas, monospace',
                outline: 'none',
                resize: 'none',
                boxSizing: 'border-box'
              }}
              placeholder={placeholderText}
              value={rawText}
              onChange={handleMainTextChange}
              onKeyDown={handleMainKeyDown}
            />
            <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#8a93a2' }}>
                Valid Total: <strong style={{ color: '#22c55e', fontSize: '16px' }}>₹{parsedResult ? parsedResult.grandTotal : 0}</strong>
              </span>
              <button
                onClick={handleConfirmValidData}
                disabled={isMainSubmitDisabled}
                style={{
                  padding: '8px 16px',
                  backgroundColor: !isMainSubmitDisabled ? '#16a34a' : '#2b303b',
                  color: !isMainSubmitDisabled ? '#ffffff' : '#636b78',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: !isMainSubmitDisabled ? 'pointer' : 'not-allowed',
                  fontWeight: 'bold',
                  fontSize: '12px'
                }}
              >
                1. सही डेटा सबमिट करें (Ctrl + Enter)
              </button>
            </div>
          </div>

          {/* Error / Unparsed Lines Area */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: hasUnfixedErrors ? '#221215' : '#122215',
            padding: '12px',
            borderRadius: '6px',
            border: hasUnfixedErrors ? '1px solid #5c1d24' : '1px solid #1d5c28'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ color: hasUnfixedErrors ? '#ea868f' : '#86ea9a', fontSize: '13px', fontWeight: 'bold' }}>
                {hasUnfixedErrors ? '⚠️ Unparsed / Error Lines (सुधारें)' : '✅ All Lines Fixed / Clear'}
              </label>

              {errorText.trim() ? (
                <button
                  onClick={handleClearErrorBox}
                  style={{
                    backgroundColor: '#3c181c',
                    color: '#ea868f',
                    border: '1px solid #842029',
                    borderRadius: '4px',
                    padding: '2px 8px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                  title="इस बॉक्स को पूरा खाली करें"
                >
                  🗑️ क्लियर करें
                </button>
              ) : null}
            </div>

            <textarea
              rows="10"
              style={{
                width: '100%',
                backgroundColor: hasUnfixedErrors ? '#120708' : '#071208',
                border: hasUnfixedErrors ? '1px solid #842029' : '1px solid #208435',
                borderRadius: '4px',
                color: hasUnfixedErrors ? '#f8d7da' : '#d7f8de',
                padding: '10px',
                fontSize: '13px',
                fontFamily: 'Consolas, monospace',
                outline: 'none',
                resize: 'none',
                boxSizing: 'border-box'
              }}
              placeholder="जो लाइनें पार्स नहीं होंगी वे यहाँ दिखेंगी..."
              value={errorText}
              onChange={handleErrorTextChange}
            />
            <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#ea868f' }}>
                Fixed Amt: <strong style={{ color: '#22c55e', fontSize: '15px' }}>₹{errorParsedResult ? errorParsedResult.grandTotal : 0}</strong>
              </span>
              <button
                onClick={handleConfirmErrorData}
                disabled={!errorParsedResult || !errorParsedResult.parsedEntries || errorParsedResult.parsedEntries.length === 0}
                style={{
                  padding: '8px 16px',
                  backgroundColor: (errorParsedResult && errorParsedResult.parsedEntries && errorParsedResult.parsedEntries.length > 0) ? '#b02a37' : '#3c181c',
                  color: (errorParsedResult && errorParsedResult.parsedEntries && errorParsedResult.parsedEntries.length > 0) ? '#ffffff' : '#742a2a',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: (errorParsedResult && errorParsedResult.parsedEntries && errorParsedResult.parsedEntries.length > 0) ? 'pointer' : 'not-allowed',
                  fontWeight: 'bold',
                  fontSize: '12px'
                }}
              >
                2. सुधारा डेटा सबमिट करें
              </button>
            </div>
          </div>

        </div>

        {/* Footer Bar */}
        <div style={{
          padding: '10px 20px',
          backgroundColor: '#141517',
          borderTop: '1px solid #2d3139',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '6px 16px',
              backgroundColor: '#2b303b',
              color: '#c5cdd9',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '12px'
            }}
          >
            कैंसल / बंद करें (Ctrl + Q)
          </button>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppPasteModal;