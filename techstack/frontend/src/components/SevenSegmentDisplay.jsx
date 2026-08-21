import React from 'react'

/**
 * Authentic 7-Segment LED Digital Display
 * Renders glowing green/amber LED digits on a recessed black bezel.
 */
export default function SevenSegmentDisplay({ 
  value = 0, 
  digits = 4, 
  color = '#00ff66', 
  offColor = 'rgba(0, 255, 102, 0.08)',
  size = 28,
  glow = true
}) {
  const strVal = String(value).padStart(digits, '0')
  const charArray = strVal.split('')

  // 7-segment lookup map: a, b, c, d, e, f, g
  //  -- a --
  // |       |
  // f       b
  // |       |
  //  -- g --
  // |       |
  // e       c
  // |       |
  //  -- d --
  const SEGMENTS = {
    '0': [1, 1, 1, 1, 1, 1, 0],
    '1': [0, 1, 1, 0, 0, 0, 0],
    '2': [1, 1, 0, 1, 1, 0, 1],
    '3': [1, 1, 1, 1, 0, 0, 1],
    '4': [0, 1, 1, 0, 0, 1, 1],
    '5': [1, 0, 1, 1, 0, 1, 1],
    '6': [1, 0, 1, 1, 1, 1, 1],
    '7': [1, 1, 1, 0, 0, 0, 0],
    '8': [1, 1, 1, 1, 1, 1, 1],
    '9': [1, 1, 1, 1, 0, 1, 1],
    '-': [0, 0, 0, 0, 0, 0, 1],
    ' ': [0, 0, 0, 0, 0, 0, 0],
  }

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      backgroundColor: '#050505',
      padding: '4px 8px',
      border: '1px solid #000000',
      boxShadow: 'inset 1px 1px #404040, inset -1px -1px #101010, 0 1px 4px rgba(0,0,0,0.6)',
      userSelect: 'none',
    }}>
      {charArray.map((ch, idx) => {
        const segs = SEGMENTS[ch] || SEGMENTS[' ']
        return (
          <svg
            key={idx}
            width={size * 0.6}
            height={size}
            viewBox="0 0 54 90"
            style={{
              filter: glow ? `drop-shadow(0 0 4px ${color})` : 'none',
            }}
          >
            {/* Segment a (top horizontal) */}
            <polygon
              points="10,8  44,8  38,14 16,14"
              fill={segs[0] ? color : offColor}
            />
            {/* Segment b (top-right vertical) */}
            <polygon
              points="45,9  45,43 39,37 39,15"
              fill={segs[1] ? color : offColor}
            />
            {/* Segment c (bottom-right vertical) */}
            <polygon
              points="45,47 45,81 39,75 39,53"
              fill={segs[2] ? color : offColor}
            />
            {/* Segment d (bottom horizontal) */}
            <polygon
              points="10,82 44,82 38,76 16,76"
              fill={segs[3] ? color : offColor}
            />
            {/* Segment e (bottom-left vertical) */}
            <polygon
              points="9,47  15,53 15,75 9,81"
              fill={segs[4] ? color : offColor}
            />
            {/* Segment f (top-left vertical) */}
            <polygon
              points="9,9   15,15 15,37 9,43"
              fill={segs[5] ? color : offColor}
            />
            {/* Segment g (middle horizontal) */}
            <polygon
              points="11,45 16,42 38,42 43,45 38,48 16,48"
              fill={segs[6] ? color : offColor}
            />
          </svg>
        )
      })}
    </div>
  )
}
