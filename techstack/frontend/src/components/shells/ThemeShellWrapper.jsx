import React, { useState, useEffect } from 'react';
import { getSettings } from '../../services/settings';
import Win98Shell from './Win98Shell';
import Y2KShell from './Y2KShell';
import AquaShell from './AquaShell';

export default function ThemeShellWrapper({ children, onMenuClick }) {
  const [themeId, setThemeId] = useState(() => getSettings().themeId || 'darkroom');

  useEffect(() => {
    const handleUpdate = () => {
      const current = getSettings();
      setThemeId(current.themeId || 'darkroom');
    };

    window.addEventListener('storage', handleUpdate);
    window.addEventListener('memwault-settings-changed', handleUpdate);

    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('memwault-settings-changed', handleUpdate);
    };
  }, []);

  if (themeId === 'win98') {
    return <Win98Shell onMenuClick={onMenuClick}>{children}</Win98Shell>;
  }

  if (themeId === 'y2k') {
    return <Y2KShell>{children}</Y2KShell>;
  }

  if (themeId === 'aqua') {
    return <AquaShell>{children}</AquaShell>;
  }

  // Material World themes & flat modern themes render with clean responsive canvas
  return <>{children}</>;
}
