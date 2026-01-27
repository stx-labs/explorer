'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

interface BtcStackingContextType {
  isEnabled: boolean;
  currentAnswer: string;
  toggle: () => void;
  randomizeAnswer: () => void;
}

const BtcStackingContext = createContext<BtcStackingContextType>({
  isEnabled: false,
  currentAnswer: '',
  toggle: () => {},
  randomizeAnswer: () => {},
});

const BTC_STACKING_STORAGE_KEY = 'btc-stacking-enabled';

// Collection of positive affirmations, including some ridiculous ones for fun
const YES_ANSWERS = [
  'YES!',
  'ABSOLUTELY!',
  'YOU BET!',
  'DEFINITELY!',
  'FOR SURE!',
  '100%!',
  'WITHOUT A DOUBT!',
  'ABSOLUTELY YES!',
  'YES, IT WILL!',
  'OF COURSE!',
  'CERTAINLY!',
  'INDEED!',
  'MOST DEFINITELY!',
  'ABSOLUTELY POSITIVELY!',
  'WITHOUT QUESTION!',
  'YOU CAN COUNT ON IT!',
  'NO DOUBT ABOUT IT!',
  'ABSOLUTELY GUARANTEED!',
  'YES, ABSOLUTELY!',
  'FOR CERTAIN!',
  'POSITIVELY!',
  'SURE THING!',
  'YOU GOT IT!',
  'ABSOLUTELY, YES!',
  'YES, DEFINITELY!',
  'WITHOUT A SHADOW OF A DOUBT!',
  'ABSOLUTELY, WITHOUT QUESTION!',
  'YES, FOR SURE!',
  'YES, INDEED!',
  'MOST CERTAINLY!',
  'ABSOLUTELY, POSITIVELY!',
  'YES, WITHOUT DOUBT!',
  'ABSOLUTELY, DEFINITELY!',
  'YES, ABSOLUTELY YES!',
  'FOR ABSOLUTE CERTAINTY!',
  'YES, YOU BET!',
  'ABSOLUTELY, FOR SURE!',
  'YES, WITHOUT QUESTION!',
  'ABSOLUTELY, MOST DEFINITELY!',
  'GUARANTEED!',
  '10000%!',
  'ONE MILLION PERCENT!',
  'INFINITELY YES!',
  'BEYOND ANY SHADOW OF A DOUBT!',
  'ABSOLUTELY, POSITIVELY, DEFINITELY, FOR SURE!',
  'YES TO THE MOON!',
  'ABSOLUTELY GUARANTEED TIMES INFINITY!',
  '100% CERTAIN, NO QUESTIONS ASKED!',
  'YES WITH ALL CAPS AND EXCLAMATION MARKS!!!',
  'ABSOLUTELY, WITHOUT A SINGLE DOUBT IN THE UNIVERSE!',
];

function getRandomAnswer(): string {
  return YES_ANSWERS[Math.floor(Math.random() * YES_ANSWERS.length)];
}

export function BtcStackingProvider({ children }: { children: React.ReactNode }) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState('');

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(BTC_STACKING_STORAGE_KEY);
    if (stored !== null) {
      const enabled = stored === 'true';
      setIsEnabled(enabled);
      if (enabled) {
        setCurrentAnswer(getRandomAnswer());
      }
    }
  }, []);

  const toggle = useCallback(() => {
    setIsEnabled(prev => {
      const newValue = !prev;
      localStorage.setItem(BTC_STACKING_STORAGE_KEY, String(newValue));
      // Randomize answer every time toggle changes
      if (newValue) {
        setCurrentAnswer(getRandomAnswer());
      }
      return newValue;
    });
  }, []);

  const randomizeAnswer = useCallback(() => {
    if (isEnabled) {
      setCurrentAnswer(getRandomAnswer());
    }
  }, [isEnabled]);

  return (
    <BtcStackingContext.Provider value={{ isEnabled, currentAnswer, toggle, randomizeAnswer }}>
      {children}
    </BtcStackingContext.Provider>
  );
}

export function useBtcStacking() {
  return useContext(BtcStackingContext);
}
