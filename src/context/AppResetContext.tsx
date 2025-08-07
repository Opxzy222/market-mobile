// context/AppResetContext.tsx
import React, { createContext, useContext } from 'react';

interface AppResetContextType {
  resetAppState: () => void;
}

export const AppResetContext = createContext<AppResetContextType>({
  resetAppState: () => {},
});

export const useAppReset = () => useContext(AppResetContext);