import type { ThemeProviderProps } from 'next-themes';
import { ThemeProvider, useTheme } from 'next-themes';
import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useCookies } from 'react-cookie';

export interface ColorModeProviderProps extends ThemeProviderProps {
  serverTheme?: string;
}

function ResolvedThemeCookieSync() {
  const { resolvedTheme } = useTheme();
  const [_, setCookie] = useCookies(['stacks-explorer-color-mode']);

  useEffect(() => {
    if (resolvedTheme === 'light' || resolvedTheme === 'dark') {
      setCookie('stacks-explorer-color-mode', resolvedTheme, {
        path: '/',
        maxAge: 31536000,
        sameSite: 'lax',
      });
    }
  }, [resolvedTheme, setCookie]);

  return null;
}

export function ColorModeProvider({ serverTheme, children, ...props }: ColorModeProviderProps) {
  const defaultTheme = serverTheme === 'dark' || serverTheme === 'light' ? serverTheme : 'system';

  return (
    <ThemeProvider
      attribute="class"
      disableTransitionOnChange
      enableSystem={true}
      defaultTheme={defaultTheme}
      {...props}
    >
      <ResolvedThemeCookieSync />
      {children}
    </ThemeProvider>
  );
}

export const useUpdateThemeCookie = () => {
  const [_, setCookie] = useCookies(['stacks-explorer-theme']);

  const setThemeCookie = useCallback(
    (theme: 'light' | 'dark' | 'system') => {
      setCookie('stacks-explorer-theme', theme, {
        path: '/',
        maxAge: 31536000, // 1 year in seconds
        sameSite: 'lax',
      });
    },
    [setCookie]
  );

  return setThemeCookie;
};

export function useColorMode() {
  const { resolvedTheme, setTheme } = useTheme();
  const setThemeCookie = useUpdateThemeCookie();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleColorMode = useCallback(() => {
    setTheme(resolvedTheme === 'light' ? 'dark' : 'light');
    setThemeCookie(resolvedTheme === 'light' ? 'dark' : 'light');
  }, [setTheme, setThemeCookie, resolvedTheme]);

  const setColorMode = useCallback(
    (theme: 'light' | 'dark' | 'system') => {
      setTheme(theme);
      setThemeCookie(theme);
    },
    [setTheme, setThemeCookie]
  );

  return {
    colorMode: mounted ? resolvedTheme || 'light' : 'light',
    setColorMode,
    toggleColorMode,
  };
}

export function useColorModeValue<T>(light: T, dark: T) {
  const { colorMode } = useColorMode();
  return colorMode === 'light' ? light : dark;
}
