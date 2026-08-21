import React, { useEffect, useRef } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { motion } from 'framer-motion';
import { getSettings } from '../services/settings';

// ── Per-Theme QR Code Configurations ───────────────────────────
const THEME_QR_CONFIGS = {
  win98: {
    width: 200,
    height: 200,
    type: 'svg',
    qrOptions: { errorCorrectionLevel: 'H' },
    dotsOptions: {
      type: 'square',
      color: '#000080',
    },
    cornersSquareOptions: {
      type: 'square',
      color: '#000080',
    },
    cornersDotOptions: {
      type: 'square',
      color: '#000000',
    },
    backgroundOptions: {
      color: '#c0c0c0',
    },
  },

  y2k: {
    width: 200,
    height: 200,
    type: 'svg',
    qrOptions: { errorCorrectionLevel: 'H' },
    dotsOptions: {
      type: 'extra-rounded',
      gradient: {
        type: 'linear',
        rotation: Math.PI / 4,
        colorStops: [
          { offset: 0, color: '#00f0ff' },
          { offset: 0.5, color: '#a855f7' },
          { offset: 1, color: '#ff007a' },
        ]
      }
    },
    cornersSquareOptions: {
      type: 'extra-rounded',
      color: '#00f0ff',
    },
    cornersDotOptions: {
      type: 'dot',
      color: '#ff007a',
    },
    backgroundOptions: {
      color: '#090a10',
    },
  },

  'field-notes': {
    width: 200,
    height: 200,
    type: 'svg',
    qrOptions: { errorCorrectionLevel: 'H' },
    dotsOptions: {
      type: 'rounded',
      color: '#2b1810',
    },
    cornersSquareOptions: {
      type: 'extra-rounded',
      color: '#2b1810',
    },
    cornersDotOptions: {
      type: 'dot',
      color: '#c87d43',
    },
    backgroundOptions: {
      color: '#f5ede0',
    },
  },

  darkroom: {
    width: 200,
    height: 200,
    type: 'svg',
    qrOptions: { errorCorrectionLevel: 'H' },
    dotsOptions: {
      type: 'dots',
      gradient: {
        type: 'radial',
        colorStops: [
          { offset: 0, color: '#ff5a36' },
          { offset: 1, color: '#b91c1c' },
        ]
      }
    },
    cornersSquareOptions: {
      type: 'square',
      color: '#ff5a36',
    },
    cornersDotOptions: {
      type: 'square',
      color: '#ff9500',
    },
    backgroundOptions: {
      color: '#0e0c0c',
    },
  },

  observatory: {
    width: 200,
    height: 200,
    type: 'svg',
    qrOptions: { errorCorrectionLevel: 'H' },
    dotsOptions: {
      type: 'classy',
      gradient: {
        type: 'linear',
        rotation: Math.PI / 3,
        colorStops: [
          { offset: 0, color: '#fef08a' },
          { offset: 1, color: '#d97706' },
        ]
      }
    },
    cornersSquareOptions: {
      type: 'extra-rounded',
      color: '#e2b858',
    },
    cornersDotOptions: {
      type: 'dot',
      color: '#fbbf24',
    },
    backgroundOptions: {
      color: '#0b101b',
    },
  },

  polaroid: {
    width: 200,
    height: 200,
    type: 'svg',
    qrOptions: { errorCorrectionLevel: 'H' },
    dotsOptions: {
      type: 'rounded',
      color: '#262626',
    },
    cornersSquareOptions: {
      type: 'extra-rounded',
      color: '#171717',
    },
    cornersDotOptions: {
      type: 'dot',
      color: '#66a8a6',
    },
    backgroundOptions: {
      color: '#ffffff',
    },
  },

  monolith: {
    width: 200,
    height: 200,
    type: 'svg',
    qrOptions: { errorCorrectionLevel: 'H' },
    dotsOptions: {
      type: 'square',
      color: '#ffffff',
    },
    cornersSquareOptions: {
      type: 'square',
      color: '#ffffff',
    },
    cornersDotOptions: {
      type: 'square',
      color: '#a0a5b5',
    },
    backgroundOptions: {
      color: '#000000',
    },
  },

  insta2016: {
    width: 200,
    height: 200,
    type: 'svg',
    qrOptions: { errorCorrectionLevel: 'H' },
    dotsOptions: {
      type: 'rounded',
      gradient: {
        type: 'linear',
        rotation: Math.PI / 4,
        colorStops: [
          { offset: 0, color: '#fdf497' },
          { offset: 0.3, color: '#fd5949' },
          { offset: 0.6, color: '#d6249f' },
          { offset: 1, color: '#285aeb' },
        ]
      }
    },
    cornersSquareOptions: {
      type: 'extra-rounded',
      color: '#d6249f',
    },
    cornersDotOptions: {
      type: 'dot',
      color: '#fd5949',
    },
    backgroundOptions: {
      color: '#ffffff',
    },
  },

  basic: {
    width: 200,
    height: 200,
    type: 'svg',
    qrOptions: { errorCorrectionLevel: 'M' },
    dotsOptions: {
      type: 'rounded',
      color: '#007aff',
    },
    cornersSquareOptions: {
      type: 'extra-rounded',
      color: '#007aff',
    },
    cornersDotOptions: {
      type: 'dot',
      color: '#007aff',
    },
    backgroundOptions: {
      color: '#ffffff',
    },
  }
};

// ── Themed QR Code Master Card ─────────────────────────────────
export default function ThemedQRCodeCard({ url, title, caption }) {
  const qrRef = useRef(null);
  const qrCodeInstance = useRef(null);
  const settings = getSettings();
  const themeId = settings.themeId || 'darkroom';

  useEffect(() => {
    const config = THEME_QR_CONFIGS[themeId] || THEME_QR_CONFIGS.darkroom;

    qrCodeInstance.current = new QRCodeStyling({
      ...config,
      data: url || 'https://memwault.app',
    });

    if (qrRef.current) {
      qrRef.current.innerHTML = '';
      qrCodeInstance.current.append(qrRef.current);
    }
  }, [themeId, url]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
      {themeId === 'win98' && <Win98WindowFrame qrRef={qrRef} title={title} />}
      {themeId === 'y2k' && <Y2KChromeFrame qrRef={qrRef} />}
      {themeId === 'field-notes' && <FieldNotesPaperFrame qrRef={qrRef} caption={caption} />}
      {themeId === 'polaroid' && <PolaroidFrame qrRef={qrRef} caption={caption} />}
      {themeId === 'darkroom' && <DarkroomTrayFrame qrRef={qrRef} />}
      {themeId === 'observatory' && <ObservatoryAstrolabeFrame qrRef={qrRef} />}
      {themeId === 'monolith' && <MonolithFrame qrRef={qrRef} />}
      {themeId === 'insta2016' && <Insta2016Frame qrRef={qrRef} />}
      {(themeId === 'basic' || themeId === 'vault-classic' || themeId === 'cabinet-1974' || themeId === 'scriptorium' || themeId === 'mid-century' || themeId === 'aqua' || themeId === 'ios7' || themeId === 'material' || themeId === 'neumorphic') && (
        <StandardFrame qrRef={qrRef} themeId={themeId} />
      )}
    </div>
  );
}

// ── 1. Windows 98 Window Frame ──
export function Win98WindowFrame({ qrRef, title = "C:\\MEMWAULT\\QR_UPLOAD.EXE" }) {
  return (
    <div style={{
      width: '260px',
      background: '#c0c0c0',
      boxShadow: 'inset 1px 1px #fff, inset -1px -1px #000, 2px 2px 0px rgba(0,0,0,0.5)',
      border: '2px solid #dfdfdf',
      padding: '3px',
      fontFamily: '"MS Sans Serif", Tahoma, sans-serif'
    }}>
      <div style={{
        background: 'linear-gradient(90deg, #000080, #1084d0)',
        color: '#fff',
        padding: '3px 6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '11px',
        fontWeight: 'bold',
        letterSpacing: '0.5px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>💾</span>
          <span>{title}</span>
        </div>
        <div style={{ display: 'flex', gap: '2px' }}>
          <button style={{ width: '14px', height: '14px', background: '#c0c0c0', border: '1px outset #fff', fontSize: '9px', lineHeight: 1, padding: 0, fontWeight: 'bold' }}>?</button>
          <button style={{ width: '14px', height: '14px', background: '#c0c0c0', border: '1px outset #fff', fontSize: '9px', lineHeight: 1, padding: 0, fontWeight: 'bold' }}>×</button>
        </div>
      </div>

      <div style={{
        margin: '6px 3px 3px 3px',
        padding: '10px',
        background: '#c0c0c0',
        border: '2px inset #fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <div ref={qrRef} />
        <div style={{ fontSize: '11px', color: '#000', marginTop: '8px', textAlign: 'center' }}>
          Scan to transmit data [PORT: 8000]
        </div>
      </div>
    </div>
  );
}

// ── 2. Y2K Chrome Frame ──
export function Y2KChromeFrame({ qrRef }) {
  return (
    <div style={{
      width: '270px',
      padding: '16px',
      borderRadius: '24px',
      background: 'linear-gradient(135deg, #e2e8f0 0%, #94a3b8 50%, #475569 100%)',
      boxShadow: '0 20px 40px rgba(0,240,255,0.3), inset 0 2px 4px rgba(255,255,255,0.8), inset 0 -2px 4px rgba(0,0,0,0.6)',
      position: 'relative'
    }}>
      {/* 4 Hex Screws */}
      {[{ top: '8px', left: '8px' }, { top: '8px', right: '8px' }, { bottom: '8px', left: '8px' }, { bottom: '8px', right: '8px' }].map((style, i) => (
        <div key={i} style={{
          position: 'absolute',
          ...style,
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, #f1f5f9 20%, #475569 80%)',
          boxShadow: 'inset 0 1px 1px #000, 0 1px 1px rgba(255,255,255,0.8)'
        }} />
      ))}

      <div style={{
        background: '#090a10',
        borderRadius: '16px',
        padding: '12px',
        border: '2px solid #00f0ff',
        boxShadow: 'inset 0 0 16px rgba(0,240,255,0.3)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <div style={{ fontSize: '10px', color: '#00f0ff', letterSpacing: '2px', marginBottom: '8px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
          ✦ SYNC PROTOCOL v2.0 ✦
        </div>
        <div ref={qrRef} />
      </div>
    </div>
  );
}

// ── 3. Field Notes Kraft Paper Frame ──
export function FieldNotesPaperFrame({ qrRef, caption = "CATALOG NO. 74-A" }) {
  return (
    <div style={{
      width: '260px',
      background: '#f5ede0',
      padding: '16px',
      borderRadius: '8px',
      boxShadow: '0 10px 30px rgba(43,24,16,0.3), inset 0 0 30px rgba(139,69,19,0.12)',
      border: '1px solid #d4c4b0',
      position: 'relative',
      backgroundImage: `
        linear-gradient(to right, rgba(139,69,19,0.08) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(139,69,19,0.08) 1px, transparent 1px)
      `,
      backgroundSize: '16px 16px'
    }}>
      <div style={{
        position: 'absolute',
        top: '8px',
        right: '12px',
        border: '1.5px solid #dc2626',
        color: '#dc2626',
        padding: '2px 6px',
        fontSize: '9px',
        fontWeight: 800,
        borderRadius: '3px',
        transform: 'rotate(6deg)',
        letterSpacing: '1px'
      }}>
        ARCHIVE
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
        <div ref={qrRef} />
      </div>

      <div style={{
        marginTop: '12px',
        fontSize: '11px',
        fontWeight: 700,
        color: '#5c3a21',
        textAlign: 'center',
        fontFamily: 'var(--font-mono)',
        letterSpacing: '1px'
      }}>
        {caption}
      </div>
    </div>
  );
}

// ── 4. Polaroid Instant Frame ──
export function PolaroidFrame({ qrRef, caption = "Mobile Uplink 📷" }) {
  return (
    <motion.div 
      initial={{ rotate: -2 }}
      whileHover={{ rotate: 0, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      style={{
        width: '250px',
        background: '#ffffff',
        padding: '12px 12px 20px 12px',
        borderRadius: '4px',
        boxShadow: '0 15px 35px rgba(0,0,0,0.35)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        border: '1px solid rgba(0,0,0,0.06)'
      }}
    >
      <div style={{
        background: '#fafafa',
        padding: '4px',
        boxShadow: 'inset 0 0 4px rgba(0,0,0,0.2)',
        borderRadius: '2px'
      }}>
        <div ref={qrRef} />
      </div>

      {/* Polaroid Spectrum Ribbon */}
      <div style={{ display: 'flex', width: '100%', height: '4px', marginTop: '14px', borderRadius: '1px', overflow: 'hidden' }}>
        <div style={{ flex: 1, background: '#00a3e0' }} />
        <div style={{ flex: 1, background: '#78be20' }} />
        <div style={{ flex: 1, background: '#ffcd00' }} />
        <div style={{ flex: 1, background: '#e03a3e' }} />
      </div>

      <div style={{
        marginTop: '8px',
        fontFamily: '"Caveat", "Comic Sans MS", cursive',
        fontSize: '18px',
        color: '#374151',
        letterSpacing: '0.5px'
      }}>
        {caption}
      </div>
    </motion.div>
  );
}

// ── 5. Darkroom Developing Tray Frame ──
export function DarkroomTrayFrame({ qrRef }) {
  return (
    <div style={{
      width: '260px',
      background: '#120505',
      padding: '14px',
      borderRadius: '12px',
      border: '2.5px solid #ff5a36',
      boxShadow: '0 0 30px rgba(255,90,54,0.35), inset 0 0 15px rgba(255,90,54,0.2)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{ width: '12px', height: '8px', borderRadius: '2px', background: '#260c0c', border: '1px solid #ff5a36' }} />
        ))}
      </div>
      <div ref={qrRef} />
      <div style={{ color: '#ff5a36', fontSize: '10px', fontFamily: 'var(--font-mono)', marginTop: '10px', letterSpacing: '2px' }}>
        SAFELIGHT • 35MM EMULSION
      </div>
    </div>
  );
}

// ── 6. Observatory Astrolabe Frame ──
export function ObservatoryAstrolabeFrame({ qrRef }) {
  return (
    <div style={{
      width: '260px',
      height: '260px',
      borderRadius: '50%',
      background: 'radial-gradient(circle, #0f172a 40%, #020617 100%)',
      border: '3px solid #e2b858',
      boxShadow: '0 0 25px rgba(226,184,88,0.3), inset 0 0 15px rgba(226,184,88,0.2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative'
    }}>
      <div style={{ position: 'absolute', top: '6px', fontSize: '9px', color: '#fbbf24', fontWeight: 700 }}>N 0°</div>
      <div style={{ position: 'absolute', bottom: '6px', fontSize: '9px', color: '#fbbf24', fontWeight: 700 }}>S 180°</div>
      <div style={{ position: 'absolute', left: '6px', fontSize: '9px', color: '#fbbf24', fontWeight: 700 }}>W 270°</div>
      <div style={{ position: 'absolute', right: '6px', fontSize: '9px', color: '#fbbf24', fontWeight: 700 }}>E 90°</div>
      <div ref={qrRef} style={{ borderRadius: '12px', overflow: 'hidden' }} />
    </div>
  );
}

// ── 7. Monolith Brutalist Frame ──
export function MonolithFrame({ qrRef }) {
  return (
    <div style={{
      width: '260px',
      background: '#000000',
      padding: '16px',
      border: '2px solid #ffffff',
      boxShadow: '6px 6px 0px #ffffff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#fff', fontFamily: 'var(--font-mono)', marginBottom: '8px', letterSpacing: '1px' }}>
        <span>SEC // 001</span>
        <span>MONOLITH</span>
      </div>
      <div ref={qrRef} />
      <div style={{ width: '100%', textAlign: 'left', fontSize: '9px', color: '#71717a', fontFamily: 'var(--font-mono)', marginTop: '8px' }}>
        RAW DATA TRANSFER
      </div>
    </div>
  );
}

// ── 8. Instagram 2016 Frame ──
export function Insta2016Frame({ qrRef }) {
  return (
    <div style={{
      width: '250px',
      background: '#ffffff',
      padding: '16px',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 10px 30px rgba(225,48,108,0.2)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      <div style={{
        height: '4px',
        width: '100%',
        borderRadius: '2px',
        marginBottom: '12px',
        background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)'
      }} />
      <div ref={qrRef} />
      <div style={{ marginTop: '10px', fontSize: '12px', fontWeight: 700, color: '#e1306c', letterSpacing: '0.5px' }}>
        Scan to Upload Story
      </div>
    </div>
  );
}

// ── Fallback Standard Card Frame ──
export function StandardFrame({ qrRef, themeId }) {
  return (
    <div style={{
      padding: '12px',
      borderRadius: '16px',
      background: '#ffffff',
      boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div ref={qrRef} />
    </div>
  );
}
