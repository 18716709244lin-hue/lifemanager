import React, {createContext, useContext, useEffect, useState} from 'react';
import {THEMES, DEFAULT_THEME, getTheme} from './themes';
import {getThemeKey, saveThemeKey} from '../services/StorageService';

const ThemeContext = createContext({
  theme: THEMES[DEFAULT_THEME],
  themeKey: DEFAULT_THEME,
  setThemeKey: () => {},
});

export const ThemeProvider = ({children}) => {
  const [themeKey, setKey] = useState(DEFAULT_THEME);

  useEffect(() => {
    (async () => {
      const saved = await getThemeKey();
      if (saved && THEMES[saved]) {
        setKey(saved);
      }
    })();
  }, []);

  const setThemeKey = async (key) => {
    if (!THEMES[key]) return;
    setKey(key);
    await saveThemeKey(key);
  };

  return (
    <ThemeContext.Provider value={{theme: getTheme(themeKey), themeKey, setThemeKey}}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

export default ThemeContext;
