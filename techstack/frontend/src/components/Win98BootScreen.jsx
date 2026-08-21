import React, { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { playWin98Startup } from '../services/win98Audio'

export default function Win98BootScreen({ onComplete }) {
  const [progress, setProgress] = useState(0)
  const [started, setStarted] = useState(false)
  const intervalRef = useRef(null)

  const handleStartBoot = () => {
    if (started) return
    setStarted(true)
    playWin98Startup()

    intervalRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(intervalRef.current)
          setTimeout(onComplete, 400)
          return 100
        }
        return p + 10
      })
    }, 100)
  }

  useEffect(() => {
    // Attempt automatic playback if browser allows it
    const autoTimer = setTimeout(() => {
      handleStartBoot()
    }, 100)

    const keyListener = () => handleStartBoot()
    window.addEventListener('keydown', keyListener, { once: true })

    return () => {
      clearTimeout(autoTimer)
      clearInterval(intervalRef.current)
      window.removeEventListener('keydown', keyListener)
    }
  }, [])

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onClick={handleStartBoot}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        backgroundColor: '#000000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '30px 20px',
        color: '#ffffff',
        fontFamily: '"MS Sans Serif", Tahoma, Arial, sans-serif',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      {/* Top BIOS Banner */}
      <div style={{ fontSize: '11px', color: '#808080', letterSpacing: '0.05em' }}>
        MemWault Modular BIOS v3.0 (C) 2026 Mehul Jain & MemWault Team
      </div>

      {/* Main Authentic Windows 98 Boot Banner */}
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
              fontSize: '34px',
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
              Personal Digital Archive Edition
            </div>
          </div>
        </div>

        {/* Nostalgic Segmented 3D Progress Bar */}
        <div style={{ width: '100%', maxWidth: '360px' }}>
          <div style={{
            height: '18px',
            backgroundColor: '#000000',
            border: '2px solid #808080',
            boxShadow: 'inset 2px 2px #000000, inset -1px -1px #ffffff',
            padding: '2px',
            display: 'flex',
            gap: '2px',
            boxSizing: 'border-box',
          }}>
            {Array.from({ length: 20 }).map((_, i) => {
              const active = (i / 20) * 100 <= progress
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    backgroundColor: active ? '#0000ff' : '#000030',
                    background: active ? 'linear-gradient(180deg, #6090ff 0%, #0000c0 100%)' : 'none',
                    borderRadius: '1px',
                    transition: 'background-color 0.1s ease',
                  }}
                />
              )
            })}
          </div>

          <div style={{
            marginTop: '10px',
            fontSize: '11px',
            color: '#a0a0a0',
            display: 'flex',
            justifyContent: 'space-between',
          }}>
            <span>Starting MemWault 98...</span>
            <span style={{ color: '#ffcc00' }}>{started ? 'Loading System...' : 'Click to start'}</span>
          </div>
        </div>
      </div>

      {/* Bottom Hint */}
      <div style={{ fontSize: '10px', color: '#606060' }}>
        Press any key or click anywhere to skip
      </div>
    </motion.div>
  )
}
