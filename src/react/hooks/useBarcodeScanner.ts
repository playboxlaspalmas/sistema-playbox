import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook para capturar escaneos de código de barras desde cualquier pantalla
 * La pistola de código de barras actúa como teclado, así que capturamos eventos de teclado
 */
export function useBarcodeScanner(
  onScan: (barcode: string) => void,
  options: {
    enabled?: boolean;
    minLength?: number; // Longitud mínima para considerar un código válido
    timeout?: number; // Tiempo máximo entre caracteres (ms)
  } = {}
) {
  const {
    enabled = true,
    minLength = 3,
    timeout = 100, // 100ms entre caracteres es típico de escáneres
  } = options;

  const bufferRef = useRef<string>('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearBuffer = useCallback(() => {
    bufferRef.current = '';
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      // Ignorar si está deshabilitado
      if (!enabled) return;

      // Ignorar si el usuario está escribiendo en un input/textarea
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Si el input tiene el atributo data-barcode-scanner="enabled", sí procesar
        if (target.getAttribute('data-barcode-scanner') !== 'enabled') {
          clearBuffer();
          return;
        }
      }

      // Si es Enter, procesar el código acumulado
      if (event.key === 'Enter') {
        event.preventDefault();
        const code = bufferRef.current.trim();
        if (code.length >= minLength) {
          onScan(code);
        }
        clearBuffer();
        return;
      }

      // Si es Escape, limpiar buffer
      if (event.key === 'Escape') {
        clearBuffer();
        return;
      }

      // Agregar carácter al buffer
      if (event.key.length === 1) {
        bufferRef.current += event.key;

        // Limpiar timeout anterior
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        // Establecer nuevo timeout para limpiar buffer si no hay más caracteres
        timeoutRef.current = setTimeout(() => {
          clearBuffer();
        }, timeout);
      }
    },
    [enabled, minLength, timeout, onScan, clearBuffer]
  );

  useEffect(() => {
    if (!enabled) {
      clearBuffer();
      return;
    }

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      clearBuffer();
    };
  }, [enabled, handleKeyPress, clearBuffer]);

  return {
    clearBuffer,
  };
}
