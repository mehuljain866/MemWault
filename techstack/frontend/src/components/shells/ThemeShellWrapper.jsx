import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

  return (
    <AnimatePresence mode="wait">
      {themeId === 'win98' ? (
        <motion.div key="win98" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <Win98Shell onMenuClick={onMenuClick}>{children}</Win98Shell>
        </motion.div>
      ) : themeId === 'y2k' ? (
        <motion.div key="y2k" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <Y2KShell>{children}</Y2KShell>
        </motion.div>
      ) : themeId === 'aqua' ? (
        <motion.div key="aqua" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <AquaShell>{children}</AquaShell>
        </motion.div>
      ) : (
        <motion.div key="default" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
