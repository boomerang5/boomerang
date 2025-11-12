"use client";

import { useEffect } from 'react';

/**
 * Componente que silencia warnings específicos de cookies
 * Solo se ejecuta en el cliente
 */
export default function CookieWarningsSuppressor() {
  useEffect(() => {
    // Interceptar console.error para filtrar warnings específicos de cookies
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    console.error = function (...args) {
      const message = args.join(' ');

      // Filtrar errores específicos de parsing de cookies
      if (message.includes('Failed to parse cookie string') ||
        message.includes('base64-eyJ') ||
        message.includes('is not valid JSON')) {
        // Silenciar este error específico
        return;
      }

      // Permitir todos los otros errores
      originalConsoleError.apply(console, args);
    };

    console.warn = function (...args) {
      const message = args.join(' ');

      // Filtrar warnings específicos de cookies
      if (message.includes('Failed to parse cookie string') ||
        message.includes('base64-eyJ') ||
        message.includes('is not valid JSON')) {
        // Silenciar este warning específico
        return;
      }

      // Permitir todos los otros warnings
      originalConsoleWarn.apply(console, args);
    };

    // También interceptar errores no manejados relacionados con cookies
    const handleError = (event: ErrorEvent) => {
      if (event.message &&
        (event.message.includes('Failed to parse cookie string') ||
          event.message.includes('base64-eyJ'))) {
        event.preventDefault();
        return false;
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason &&
        event.reason.message &&
        (event.reason.message.includes('Failed to parse cookie string') ||
          event.reason.message.includes('base64-eyJ'))) {
        event.preventDefault();
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Cleanup al desmontar
    return () => {
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Este componente no renderiza nada visible
  return null;
}