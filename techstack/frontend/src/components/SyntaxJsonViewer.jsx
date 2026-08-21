import React, { useState } from 'react'
import { Copy, Check, FileText, Code2, Terminal } from 'lucide-react'
import { getSettings } from '../services/settings'
import { playWin98Click } from '../services/win98Audio'

/**
 * Era-Appropriate Syntax Highlighted JSON Code Viewer
 * Features authentic Windows 98 Notepad / Visual Studio 6.0 IDE styling when in Win98 theme.
 */
export default function SyntaxJsonViewer({ data, filename = "DATA_STREAM.JSON" }) {
  const [copied, setCopied] = useState(false)
  const settings = getSettings()
  const isWin98 = settings.themeId === 'win98'

  const jsonString = JSON.stringify(data, null, 2) || '{}'
  const lines = jsonString.split('\n')

  const handleCopy = () => {
    if (isWin98) playWin98Click()
    navigator.clipboard.writeText(jsonString)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Tokenize and syntax highlight a single line of JSON
  const renderHighlightedLine = (line) => {
    // Match key-value pairs
    const keyValRegex = /^(\s*)(".*?")(\s*:\s*)(.*)$/
    const match = line.match(keyValRegex)

    if (match) {
      const [, indent, key, colon, value] = match
      return (
        <span>
          <span style={{ whiteSpace: 'pre' }}>{indent}</span>
          <span style={{ color: isWin98 ? '#000080' : '#4fc1ff', fontWeight: isWin98 ? 600 : 'normal' }}>
            {key}
          </span>
          <span style={{ color: isWin98 ? '#000000' : '#d4d4d4' }}>{colon}</span>
          {renderValueToken(value)}
        </span>
      )
    }

    // Fallback line parsing
    return <span>{renderValueToken(line)}</span>
  }

  const renderValueToken = (valStr) => {
    // Strings in quotes
    if (valStr.startsWith('"')) {
      const endsWithComma = valStr.endsWith(',')
      const cleanVal = endsWithComma ? valStr.slice(0, -1) : valStr
      return (
        <span>
          <span style={{ color: isWin98 ? '#800000' : '#ce9178' }}>{cleanVal}</span>
          {endsWithComma && <span style={{ color: isWin98 ? '#000000' : '#d4d4d4' }}>,</span>}
        </span>
      )
    }

    // Booleans & Null
    if (/^(true|false|null)/.test(valStr)) {
      const endsWithComma = valStr.endsWith(',')
      const cleanVal = endsWithComma ? valStr.slice(0, -1) : valStr
      return (
        <span>
          <span style={{ color: isWin98 ? '#0000ff' : '#569cd6', fontWeight: isWin98 ? 'bold' : 600 }}>
            {cleanVal}
          </span>
          {endsWithComma && <span style={{ color: isWin98 ? '#000000' : '#d4d4d4' }}>,</span>}
        </span>
      )
    }

    // Numbers
    if (/^-?\d+(\.\d+)?/.test(valStr)) {
      const endsWithComma = valStr.endsWith(',')
      const cleanVal = endsWithComma ? valStr.slice(0, -1) : valStr
      return (
        <span>
          <span style={{ color: isWin98 ? '#0000aa' : '#b5cea8', fontWeight: isWin98 ? 600 : 'normal' }}>
            {cleanVal}
          </span>
          {endsWithComma && <span style={{ color: isWin98 ? '#000000' : '#d4d4d4' }}>,</span>}
        </span>
      )
    }

    // Structural brackets / braces
    return <span style={{ color: isWin98 ? '#000000' : '#ffd700' }}>{valStr}</span>
  }

  // ═══════════════════════════════════════════════════════════
  // 1. AUTHENTIC WINDOWS 98 NOTEPAD / DEVSTUDIO 98 CODE VIEWER
  // ═══════════════════════════════════════════════════════════
  if (isWin98) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#c0c0c0',
        border: '1px solid #000000',
        boxShadow: 'inset 1px 1px #ffffff, inset -1px -1px #808080',
        fontFamily: '"MS Sans Serif", Tahoma, Arial, sans-serif',
        fontSize: '11px',
        color: '#000000',
        userSelect: 'text',
        boxSizing: 'border-box',
        width: '100%',
        maxWidth: '100%',
      }}>
        {/* Notepad Title Bar */}
        <div style={{
          background: 'linear-gradient(90deg, #000080 0%, #1084d0 100%)',
          color: '#ffffff',
          fontWeight: 'bold',
          padding: '2px 4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <FileText size={12} color="#ffffff" />
            <span>{filename} - Notepad (Syntax Highlighting)</span>
          </div>
          <button
            onClick={handleCopy}
            style={{
              backgroundColor: '#c0c0c0',
              border: '1px solid #000',
              boxShadow: 'inset 1px 1px #fff, inset -1px -1px #808080',
              padding: '1px 6px',
              fontSize: '10px',
              fontWeight: 'bold',
              cursor: 'pointer',
              color: '#000000',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {copied ? <Check size={10} color="#008000" /> : <Copy size={10} />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>

        {/* Notepad Classic Menu Bar */}
        <div style={{
          display: 'flex',
          gap: '12px',
          padding: '2px 6px',
          backgroundColor: '#c0c0c0',
          borderBottom: '1px solid #808080',
          boxShadow: '0 1px 0 #ffffff',
          fontSize: '11px',
          color: '#000000',
          userSelect: 'none',
        }}>
          <span><u>F</u>ile</span>
          <span><u>E</u>dit</span>
          <span><u>S</u>earch</span>
          <span><u>H</u>elp</span>
        </div>

        {/* 3D Sunken White Code Viewport with Line Numbers */}
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #000000',
          boxShadow: 'inset 1px 1px #808080, inset -1px -1px #dfdfdf, inset 2px 2px #000, inset -2px -2px #ffffff',
          display: 'flex',
          maxHeight: '440px',
          overflowY: 'auto',
          overflowX: 'auto',
          margin: '2px',
        }}>
          {/* Line Numbers Gutter */}
          <div style={{
            backgroundColor: '#efefef',
            borderRight: '1px solid #c0c0c0',
            padding: '6px 6px 6px 4px',
            textAlign: 'right',
            userSelect: 'none',
            color: '#808080',
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '12px',
            lineHeight: '1.45',
          }}>
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>

          {/* Syntax Highlighted JSON Code Body */}
          <pre style={{
            margin: 0,
            padding: '6px 10px',
            fontFamily: '"Courier New", "Fixedsys", Courier, monospace',
            fontSize: '12px',
            lineHeight: '1.45',
            color: '#000000',
            whiteSpace: 'pre',
            wordBreak: 'normal',
            tabSize: 2,
            flex: 1,
          }}>
            {lines.map((line, idx) => (
              <div key={idx}>
                {renderHighlightedLine(line)}
              </div>
            ))}
          </pre>
        </div>

        {/* Windows 98 Status Bar */}
        <div style={{
          display: 'flex',
          gap: '2px',
          padding: '2px 0 0 0',
          backgroundColor: '#c0c0c0',
          height: '18px',
          boxSizing: 'border-box',
          fontSize: '11px',
        }}>
          <div style={{
            flex: 2,
            display: 'flex',
            alignItems: 'center',
            padding: '0 4px',
            boxShadow: 'inset 1px 1px #808080, inset -1px -1px #ffffff',
            color: '#000000',
          }}>
            <span>{lines.length} Lines • JSON Data Stream</span>
          </div>
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            padding: '0 4px',
            boxShadow: 'inset 1px 1px #808080, inset -1px -1px #ffffff',
            color: '#000000',
          }}>
            <span>Windows (CRLF)</span>
          </div>
          <div style={{
            width: '90px',
            display: 'flex',
            alignItems: 'center',
            padding: '0 4px',
            boxShadow: 'inset 1px 1px #808080, inset -1px -1px #ffffff',
            color: '#000000',
          }}>
            <span>ANSI UTF-8</span>
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════
  // 2. MODERN THEME CODE VIEWER (Dark Glassmorphic & Clean)
  // ═══════════════════════════════════════════════════════════
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#18181b',
      borderRadius: '16px',
      border: '1px solid var(--ios-border, rgba(255,255,255,0.1))',
      boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
      overflow: 'hidden',
      width: '100%',
    }}>
      {/* Modern Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        backgroundColor: '#121214',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        fontSize: '12px',
        color: '#a1a1aa',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Code2 size={15} color="var(--ios-accent, #007aff)" />
          <span style={{ fontWeight: 600, color: '#f4f4f5' }}>{filename}</span>
          <span style={{ fontSize: '11px', opacity: 0.6 }}>({lines.length} lines)</span>
        </div>

        <button
          onClick={handleCopy}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderRadius: '8px',
            backgroundColor: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#f4f4f5',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          {copied ? <Check size={14} color="#34c759" /> : <Copy size={14} />}
          <span>{copied ? 'Copied' : 'Copy JSON'}</span>
        </button>
      </div>

      {/* Code Body with Line Numbers */}
      <div style={{
        display: 'flex',
        maxHeight: '480px',
        overflowY: 'auto',
        overflowX: 'auto',
        backgroundColor: '#18181b',
      }}>
        {/* Line Numbers */}
        <div style={{
          padding: '12px 10px',
          textAlign: 'right',
          color: '#52525b',
          fontSize: '12px',
          fontFamily: 'monospace',
          lineHeight: '1.5',
          userSelect: 'none',
          borderRight: '1px solid rgba(255,255,255,0.05)',
        }}>
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Code Content */}
        <pre style={{
          margin: 0,
          padding: '12px 16px',
          fontFamily: 'monospace',
          fontSize: '12px',
          lineHeight: '1.5',
          color: '#d4d4d4',
          whiteSpace: 'pre',
          tabSize: 2,
          flex: 1,
        }}>
          {lines.map((line, idx) => (
            <div key={idx}>
              {renderHighlightedLine(line)}
            </div>
          ))}
        </pre>
      </div>
    </div>
  )
}
