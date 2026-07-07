import React, { useEffect, useState, useRef } from 'react';
import { format } from 'date-fns';

/**
 * Renders an iOS Photos style fast scrubber on the right edge of the screen.
 * @param {Array} items - Array of items containing a date field
 * @param {Function} getDate - Function to extract a Date object from an item
 * @param {string} scrollContainerSelector - CSS selector for the scrolling container
 */
export default function FastScrollbar({ items, getDate, scrollContainerSelector = '.ios-main-content' }) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0); // 0 to 1
  const trackRef = useRef(null);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      let p = (e.clientY - rect.top) / rect.height;
      p = Math.max(0, Math.min(1, p));
      setDragProgress(p);

      const container = document.querySelector(scrollContainerSelector);
      if (container) {
        container.scrollTop = p * (container.scrollHeight - container.clientHeight);
      }
    };

    const handleMouseUp = () => setIsDragging(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove, { passive: false });
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, scrollContainerSelector]);

  // Optionally listen to scroll to update indicator position when not dragging
  useEffect(() => {
    const container = document.querySelector(scrollContainerSelector);
    if (!container) return;

    const handleScroll = () => {
      if (isDragging) return;
      const p = container.scrollTop / (container.scrollHeight - container.clientHeight || 1);
      setDragProgress(p);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    // init
    handleScroll();
    
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isDragging, scrollContainerSelector, items.length]);

  if (!items || items.length < 20) return null; // Don't show if few items

  // Get current date being hovered/scrolled to
  const index = Math.min(Math.floor(dragProgress * items.length), items.length - 1);
  const currentDate = index >= 0 ? getDate(items[index]) : null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: '100px',
        right: '12px',
        bottom: '100px',
        width: '30px',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Date Indicator Popout */}
      {isDragging && currentDate && (
        <div style={{
          position: 'absolute',
          right: '40px',
          top: `calc(${dragProgress * 100}% - 16px)`,
          background: 'var(--ios-glass)',
          backdropFilter: 'blur(20px) saturate(200%)',
          color: 'var(--ios-text-primary)',
          padding: '6px 14px',
          borderRadius: '16px',
          fontWeight: 700,
          fontSize: '14px',
          boxShadow: 'var(--ios-shadow-lg)',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          {format(currentDate, 'MMM yyyy')}
        </div>
      )}

      {/* Track */}
      <div 
        ref={trackRef}
        onMouseDown={(e) => {
          setIsDragging(true);
          const rect = e.currentTarget.getBoundingClientRect();
          let p = (e.clientY - rect.top) / rect.height;
          p = Math.max(0, Math.min(1, p));
          setDragProgress(p);
          const container = document.querySelector(scrollContainerSelector);
          if (container) {
            container.scrollTop = p * (container.scrollHeight - container.clientHeight);
          }
        }}
        onTouchStart={(e) => {
          setIsDragging(true);
          const rect = e.currentTarget.getBoundingClientRect();
          let p = (e.touches[0].clientY - rect.top) / rect.height;
          p = Math.max(0, Math.min(1, p));
          setDragProgress(p);
        }}
        style={{
          width: '16px',
          height: '100%',
          background: isDragging ? 'var(--ios-glass)' : 'transparent',
          borderRadius: '8px',
          cursor: 'ns-resize',
          position: 'relative',
          transition: 'background 0.2s',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        {/* Thumb */}
        <div style={{
          position: 'absolute',
          top: `calc(${dragProgress * 100}%)`,
          transform: 'translateY(-50%)',
          width: '6px',
          height: isDragging ? '24px' : '32px',
          background: isDragging ? 'var(--ios-accent)' : 'rgba(150,150,150,0.4)',
          borderRadius: '4px',
          transition: 'height 0.2s, background 0.2s'
        }} />
      </div>
    </div>
  );
}
