import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { playWin98Startup } from '../services/win98Audio'

export default function Win98BootScreen({ onComplete }) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Play startup chime
    try {
      playWin98Startup()
    } catch (e) {
      console.warn('Audio play prevented', e)
    }

    // Progress bar animation
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval)
          setTimeout(onComplete, 350)
          return 100
        }
        return p + 8
      })
    }, 120)

    const timer = setTimeout(() => {
      onComplete()
    }, 2500)

    return () => {
      clearInterval(interval)
      clearTimeout(timer)
    }
  }, [onComplete])

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      onClick={onComplete}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        backgroundColor: '#000000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '40px 20px',
        color: '#ffffff',
        fontFamily: '"MS Sans Serif", Tahoma, Arial, sans-serif',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      {/* Top spacing */}
      <div style={{ fontSize: '11px', color: '#808080', letterSpacing: '0.05em' }}>
        MemWault BIOS v3.0 ACPI-Compliant
      </div>

      {/* Main Logo & Clouds Banner */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: '20px',
        maxWidth: '520px',
        width: '100%',
      }}>
        {/* Banner with 3D retro gradient */}
        <div style={{
          position: 'relative',
          padding: '30px 40px',
          background: 'linear-gradient(180deg, #001040 0%, #104080 30%, #3070b0 60%, #80b0e0 85%, #d0e8ff 100%)',
          borderRadius: '4px',
          border: '2px solid #808080',
          boxShadow: '0 0 40px rgba(0, 128, 255, 0.3)',
          width: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '14px',
        }}>
          {/* Authentic Win98 MemWault Pixel Logo */}
          <img
            src="/win98-memwault-logo.png"
            alt="MemWault 98"
            style={{
              width: '80px',
              height: '80px',
              imageRendering: 'pixelated',
              filter: 'drop-shadow(2px 3px 0px rgba(0,0,0,0.6))',
            }}
          />

          <div>
            <div style={{
              fontSize: '32px',
              fontWeight: 900,
              letterSpacing: '-1px',
              color: '#ffffff',
              textShadow: '3px 3px 0px #000040, -1px -1px 0px #80b0ff',
              lineHeight: 1.1,
            }}>
              MemWault<span style={{ color: '#ffcc00', fontStyle: 'italic', marginLeft: '6px' }}>98</span>
            </div>
            <div style={{
              fontSize: '11px',
              color: '#002060',
              fontWeight: 800,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              marginTop: '4px',
            }}>
              Personal Archive Edition
            </div>
          </div>
        </div>

        <div style={{ fontSize: '13px', color: '#cccccc' }}>
          Starting MemWault 98 Operating Environment...
        </div>
      </div>

      {/* Bottom Progress Bar */}
      <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
        <div style={{
          width: '100%',
          height: '18px',
          backgroundColor: '#000000',
          border: '1px solid #808080',
          boxShadow: 'inset 1px 1px 0px #404040',
          padding: '2px',
          display: 'flex',
          gap: '2px',
        }}>
          {Array.from({ length: 18 }).map((_, i) => {
            const active = (i / 18) * 100 <= progress
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: '100%',
                  backgroundColor: active ? '#0000ff' : 'transparent',
                  background: active ? 'linear-gradient(180deg, #6699ff 0%, #0033cc 60%, #000088 100%)' : 'transparent',
                  borderRadius: '1px',
                }}
              />
            )
          })}
        </div>
        <div style={{ fontSize: '10px', color: '#666666' }}>
          Click anywhere to skip
        </div>
      </div>
    </motion.div>
  )
}
