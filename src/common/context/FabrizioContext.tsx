'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

interface FabrizioContextType {
  isEnabled: boolean;
  showNotFabrizio: boolean;
  toggle: () => void;
  toggleNotFabrizio: () => void;
}

const FabrizioContext = createContext<FabrizioContextType>({
  isEnabled: false,
  showNotFabrizio: false,
  toggle: () => {},
  toggleNotFabrizio: () => {},
});

const FABRIZIO_STORAGE_KEY = 'fabrizio-mode-enabled';
const NOT_FABRIZIO_STORAGE_KEY = 'not-fabrizio-enabled';

export function FabrizioProvider({ children }: { children: React.ReactNode }) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [showNotFabrizio, setShowNotFabrizio] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(FABRIZIO_STORAGE_KEY);
    if (stored !== null) {
      setIsEnabled(stored === 'true');
    }

    const storedNotFabrizio = localStorage.getItem(NOT_FABRIZIO_STORAGE_KEY);
    if (storedNotFabrizio !== null) {
      setShowNotFabrizio(storedNotFabrizio === 'true');
    }
  }, []);

  const toggle = useCallback(() => {
    setIsEnabled(prev => {
      const newValue = !prev;
      localStorage.setItem(FABRIZIO_STORAGE_KEY, String(newValue));
      // Disable "not fabrizio" if Fabrizio mode is disabled
      if (!newValue) {
        setShowNotFabrizio(false);
        localStorage.setItem(NOT_FABRIZIO_STORAGE_KEY, 'false');
      }
      return newValue;
    });
  }, []);

  const toggleNotFabrizio = useCallback(() => {
    setShowNotFabrizio(prev => {
      const newValue = !prev;
      localStorage.setItem(NOT_FABRIZIO_STORAGE_KEY, String(newValue));
      return newValue;
    });
  }, []);

  return (
    <FabrizioContext.Provider value={{ isEnabled, showNotFabrizio, toggle, toggleNotFabrizio }}>
      {children}
    </FabrizioContext.Provider>
  );
}

export function useFabrizio() {
  return useContext(FabrizioContext);
}
