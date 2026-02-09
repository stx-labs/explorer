import type { ThemeProviderProps } from 'next-themes';
import { ThemeProvider, useTheme } from 'next-themes';
import * as React from 'react';
import { useCallback } from 'react';
import { useCookies } from 'react-cookie';

export interface ColorModeProviderProps extends ThemeProviderProps {}

export function ColorModeProvider(props: ColorModeProviderProps) {
  return (
    <ThemeProvider
      attribute="class"
      disableTransitionOnChange
      enableSystem={true}
      defaultTheme="system"
      {...props}
    />
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
    colorMode: resolvedTheme || 'system',
    setColorMode,
    toggleColorMode,
  };
}

export function useColorModeValue<T>(light: T, dark: T) {
  const { colorMode } = useColorMode();
  return colorMode === 'light' ? light : dark;
}
