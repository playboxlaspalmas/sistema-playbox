import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCLP } from '@/lib/currency';
import type { Repuesto, Dispositivo, OrderRepuesto } from '@/types';

interface RepuestosSelectorProps {
  dispositivoMarca: string;
  dispositivoModelo: string;
  onRepuestosChange: (repuestos: OrderRepuesto[]) => void;
  repuestosIniciales?: OrderRepuesto[];
}

export default function RepuestosSelector({
  dispositivoMarca,
  dispositivoModelo,
  onRepuestosChange,
  repuestosIniciales = [],
}: RepuestosSelectorProps) {
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);
  const [repuestos, setRepuestos] = useState<Repuesto[]>([]);
  const [repuestosSeleccionados, setRepuestosSeleccionados] = useState<OrderRepuesto[]>(repuestosIniciales);
  const [dispositivoSeleccionado, setDispositivoSeleccionado] = useState<string | null>(null);
  const [dispositivoNombre, setDispositivoNombre] = useState<string>('');
  const [repuestoNombre, setRepuestoNombre] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showDispositivoSuggestions, setShowDispositivoSuggestions] = useState(false);
  const [showRepuestoSuggestions, setShowRepuestoSuggestions] = useState(false);
  const [dispositivoSuggestions, setDispositivoSuggestions] = useState<Dispositivo[]>([]);
  const [repuestoSuggestions, setRepuestoSuggestions] = useState<Repuesto[]>([]);
  
  const dispositivoInputRef = useRef<HTMLInputElement>(null);
  const repuestoInputRef = useRef<HTMLInputElement>(null);
  const dispositivoSuggestionsRef = useRef<HTMLDivElement>(null);
  const repuestoSuggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    cargarDispositivos();
  }, []);

  useEffect(() => {
    if (dispositivoMarca && dispositivoModelo) {
      buscarDispositivoPorMarcaModelo();
    }
  }, [dispositivoMarca, dispositivoModelo]);

  useEffect(() => {
    if (dispositivoSeleccionado) {
      cargarRepuestos(dispositivoSeleccionado);
    }
  }, [dispositivoSeleccionado]);

  useEffect(() => {
    onRepuestosChange(repuestosSeleccionados);
  }, [repuestosSeleccionados, onRepuestosChange]);

  // Cerrar sugerencias al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dispositivoSuggestionsRef.current && !dispositivoSuggestionsRef.current.contains(event.target as Node)) {
        setShowDispositivoSuggestions(false);
      }
      if (repuestoSuggestionsRef.current && !repuestoSuggestionsRef.current.contains(event.target as Node)) {
        setShowRepuestoSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const cargarDispositivos = async () => {
    try {
      const { data, error } = await supabase
        .from('dispositivos')
        .select('*')
        .eq('activo', true)
        .order('marca', { ascending: true })
        .order('modelo', { ascending: true });

      if (error) throw error;
      setDispositivos(data || []);
    } catch (err) {
      console.error('Error cargando dispositivos:', err);
    }
  };

  const buscarDispositivoPorMarcaModelo = async () => {
    try {
      // Buscar dispositivo que coincida con marca y modelo
      const { data, error } = await supabase
        .from('dispositivos')
        .select('*')
        .ilike('marca', `%${dispositivoMarca}%`)
        .ilike('modelo', `%${dispositivoModelo}%`)
        .eq('activo', true)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setDispositivoSeleccionado(data.id);
        setDispositivoNombre(`${data.marca} ${data.modelo}`);
      } else {
        // Si no se encuentra, usar el nombre completo como fallback
        setDispositivoNombre(`${dispositivoMarca} ${dispositivoModelo}`);
      }
    } catch (err) {
      console.error('Error buscando dispositivo:', err);
    }
  };

  const buscarDispositivos = (query: string) => {
    if (!query || query.length < 2) {
      setDispositivoSuggestions([]);
      setShowDispositivoSuggestions(false);
      return;
    }

    const queryLower = query.toLowerCase();
    const filtered = dispositivos.filter(d => 
      `${d.marca} ${d.modelo}`.toLowerCase().includes(queryLower) ||
      d.marca.toLowerCase().includes(queryLower) ||
      d.modelo.toLowerCase().includes(queryLower)
    );
    setDispositivoSuggestions(filtered.slice(0, 10));
    setShowDispositivoSuggestions(true);
  };

  const seleccionarDispositivo = (dispositivo: Dispositivo) => {
    setDispositivoSeleccionado(dispositivo.id);
    setDispositivoNombre(`${dispositivo.marca} ${dispositivo.modelo}`);
    setShowDispositivoSuggestions(false);
  };

  const cargarRepuestos = async (dispositivoId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('repuestos')
        .select('*, dispositivo:dispositivos(*)')
        .eq('dispositivo_id', dispositivoId)
        .eq('activo', true)
        .order('nombre', { ascending: true });

      if (error) throw error;
      setRepuestos(data || []);
    } catch (err) {
      console.error('Error cargando repuestos:', err);
    } finally {
      setLoading(false);
    }
  };

  const buscarRepuestos = (query: string) => {
    if (!query || query.length < 2) {
      setRepuestoSuggestions([]);
      setShowRepuestoSuggestions(false);
      return;
    }

    if (!dispositivoSeleccionado) {
      // Si no hay dispositivo seleccionado, buscar en todos los repuestos
      const queryLower = query.toLowerCase();
      const filtered = repuestos.filter(r => 
        r.nombre.toLowerCase().includes(queryLower)
      );
      setRepuestoSuggestions(filtered.slice(0, 10));
      setShowRepuestoSuggestions(true);
    } else {
      // Buscar solo en los repuestos del dispositivo seleccionado
      const queryLower = query.toLowerCase();
      const filtered = repuestos.filter(r => 
        r.nombre.toLowerCase().includes(queryLower)
      );
      setRepuestoSuggestions(filtered.slice(0, 10));
      setShowRepuestoSuggestions(true);
    }
  };

  const agregarRepuesto = (repuesto?: Repuesto) => {
    if (repuesto) {
      // Agregar repuesto existente
      const dispositivo = repuesto.dispositivo || dispositivos.find(d => d.id === repuesto.dispositivo_id);
      if (!dispositivo) return;

      const nuevoRepuesto: OrderRepuesto = {
        id: `temp-${Date.now()}`,
        order_id: '',
        repuesto_id: repuesto.id,
        repuesto_nombre: repuesto.nombre,
        dispositivo_marca: dispositivo.marca,
        dispositivo_modelo: dispositivo.modelo,
        cantidad: 1,
        precio_costo: repuesto.precio_costo,
        precio_venta: repuesto.precio_venta,
        subtotal: repuesto.precio_venta,
        created_at: new Date().toISOString(),
      };

      setRepuestosSeleccionados([...repuestosSeleccionados, nuevoRepuesto]);
      setRepuestoNombre('');
      setShowRepuestoSuggestions(false);
    } else if (repuestoNombre.trim() && dispositivoSeleccionado) {
      // Agregar repuesto manual (no existe en BD)
      const dispositivo = dispositivos.find(d => d.id === dispositivoSeleccionado);
      if (!dispositivo) return;

      const nuevoRepuesto: OrderRepuesto = {
        id: `temp-${Date.now()}`,
        order_id: '',
        repuesto_id: '', // No tiene ID porque no existe en BD
        repuesto_nombre: repuestoNombre.trim(),
        dispositivo_marca: dispositivo.marca,
        dispositivo_modelo: dispositivo.modelo,
        cantidad: 1,
        precio_costo: 0,
        precio_venta: 0,
        subtotal: 0,
        created_at: new Date().toISOString(),
      };

      setRepuestosSeleccionados([...repuestosSeleccionados, nuevoRepuesto]);
      setRepuestoNombre('');
      setShowRepuestoSuggestions(false);
    }
  };

  const eliminarRepuesto = (index: number) => {
    setRepuestosSeleccionados(repuestosSeleccionados.filter((_, i) => i !== index));
  };

  const actualizarCantidad = (index: number, cantidad: number) => {
    if (cantidad < 1) return;
    const nuevosRepuestos = [...repuestosSeleccionados];
    nuevosRepuestos[index].cantidad = cantidad;
    nuevosRepuestos[index].subtotal = nuevosRepuestos[index].precio_venta * cantidad;
    setRepuestosSeleccionados(nuevosRepuestos);
  };

  const actualizarPrecioVenta = (index: number, precio: number) => {
    if (precio < 0) return;
    const nuevosRepuestos = [...repuestosSeleccionados];
    nuevosRepuestos[index].precio_venta = precio;
    nuevosRepuestos[index].subtotal = precio * nuevosRepuestos[index].cantidad;
    setRepuestosSeleccionados(nuevosRepuestos);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-slate-900">Repuestos</h3>
        {dispositivoMarca && dispositivoModelo && (
          <span className="text-sm text-slate-600">
            {dispositivoMarca} {dispositivoModelo}
          </span>
        )}
      </div>

      {/* Selector de dispositivo con autocompletado - Solo mostrar si no está detectado automáticamente */}
      {!dispositivoSeleccionado && (
        <div className="relative">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Dispositivo para Repuestos
          </label>
          <input
            ref={dispositivoInputRef}
            type="text"
            value={dispositivoNombre}
            onChange={(e) => {
              setDispositivoNombre(e.target.value);
              buscarDispositivos(e.target.value);
            }}
            onFocus={() => {
              if (dispositivoNombre.length >= 2) {
                buscarDispositivos(dispositivoNombre);
              }
            }}
            placeholder="Escriba marca y modelo del dispositivo..."
            className="w-full border border-slate-300 rounded-md px-3 py-2"
          />
          {showDispositivoSuggestions && dispositivoSuggestions.length > 0 && (
            <div
              ref={dispositivoSuggestionsRef}
              className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
            >
              {dispositivoSuggestions.map((d) => (
                <div
                  key={d.id}
                  onClick={() => seleccionarDispositivo(d)}
                  className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-b-0"
                >
                  <div className="font-medium text-slate-900">{d.marca} {d.modelo}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mostrar dispositivo seleccionado */}
      {dispositivoSeleccionado && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-slate-900">
              Dispositivo: {dispositivoNombre}
            </span>
            <button
              onClick={() => {
                setDispositivoSeleccionado(null);
                setDispositivoNombre('');
                setRepuestos([]);
                setRepuestoNombre('');
              }}
              className="text-xs text-red-600 hover:text-red-800"
            >
              Cambiar
            </button>
          </div>
        </div>
      )}

      {/* Agregar repuesto - Solo mostrar si hay dispositivo seleccionado */}
      {dispositivoSeleccionado && (
        <div className="relative">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Agregar Repuesto
          </label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                ref={repuestoInputRef}
                type="text"
                value={repuestoNombre}
                onChange={(e) => {
                  setRepuestoNombre(e.target.value);
                  buscarRepuestos(e.target.value);
                }}
                onFocus={() => {
                  if (repuestoNombre.length >= 2) {
                    buscarRepuestos(repuestoNombre);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    agregarRepuesto();
                  }
                }}
                placeholder="Escriba el nombre del repuesto..."
                className="w-full border border-slate-300 rounded-md px-3 py-2"
              />
              {showRepuestoSuggestions && repuestoSuggestions.length > 0 && (
                <div
                  ref={repuestoSuggestionsRef}
                  className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
                >
                  {repuestoSuggestions.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => agregarRepuesto(r)}
                      className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-b-0"
                    >
                      <div className="font-medium text-slate-900">{r.nombre}</div>
                      <div className="text-xs text-slate-600">
                        Stock: {r.stock_actual} | Precio: {formatCLP(r.precio_venta)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => agregarRepuesto()}
              disabled={!repuestoNombre.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Agregar
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Escriba el nombre del repuesto o selecciónelo de las sugerencias. Puede agregar repuestos que no existan en el stock.
          </p>
        </div>
      )}

      {/* Lista de repuestos disponibles (solo si hay dispositivo seleccionado y hay repuestos en stock) */}
      {dispositivoSeleccionado && repuestos.length > 0 && (
        <div className="bg-slate-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-slate-700 mb-3">Repuestos Disponibles en Stock</h4>
          {loading ? (
            <p className="text-slate-600 text-sm">Cargando repuestos...</p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {repuestos.map((repuesto) => (
                <div
                  key={repuesto.id}
                  className="flex justify-between items-center p-2 bg-white rounded border border-slate-200"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{repuesto.nombre}</p>
                    <p className="text-xs text-slate-600">
                      Stock: {repuesto.stock_actual} | Precio: {formatCLP(repuesto.precio_venta)}
                    </p>
                  </div>
                  <button
                    onClick={() => agregarRepuesto(repuesto)}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    {repuesto.stock_actual <= 0 ? 'Agregar (sin stock)' : 'Agregar'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Repuestos seleccionados */}
      {repuestosSeleccionados.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <h4 className="text-sm font-medium text-slate-700 p-3 bg-slate-50 border-b">
            Repuestos Seleccionados ({repuestosSeleccionados.length})
          </h4>
          <div className="divide-y divide-slate-200">
            {repuestosSeleccionados.map((repuesto, index) => (
              <div key={index} className="p-3">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{repuesto.repuesto_nombre}</p>
                    <p className="text-xs text-slate-600">
                      {repuesto.dispositivo_marca} {repuesto.dispositivo_modelo}
                    </p>
                  </div>
                  <button
                    onClick={() => eliminarRepuesto(index)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      value={repuesto.cantidad}
                      onChange={(e) => actualizarCantidad(index, parseInt(e.target.value) || 1)}
                      className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Precio Venta</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={repuesto.precio_venta}
                      onChange={(e) => actualizarPrecioVenta(index, parseFloat(e.target.value) || 0)}
                      className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Subtotal</label>
                    <p className="text-sm font-medium text-slate-900 pt-1">
                      {formatCLP(repuesto.subtotal)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 bg-slate-50 border-t">
            <p className="text-sm font-medium text-slate-900 text-right">
              Total Repuestos: {formatCLP(
                repuestosSeleccionados.reduce((sum, r) => sum + r.subtotal, 0)
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
