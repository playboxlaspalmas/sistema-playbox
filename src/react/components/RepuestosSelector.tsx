import { useState, useEffect } from 'react';
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
  const [loading, setLoading] = useState(false);

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
      const { data, error } = await supabase
        .from('dispositivos')
        .select('*')
        .eq('marca', dispositivoMarca)
        .eq('modelo', dispositivoModelo)
        .eq('activo', true)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setDispositivoSeleccionado(data.id);
      }
    } catch (err) {
      console.error('Error buscando dispositivo:', err);
    }
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

  const agregarRepuesto = (repuesto: Repuesto) => {
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

      {/* Selector de dispositivo si no coincide con el dispositivo de la orden */}
      {(!dispositivoSeleccionado || !dispositivoMarca || !dispositivoModelo) && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Seleccionar Dispositivo para Repuestos
          </label>
          <select
            value={dispositivoSeleccionado || ''}
            onChange={(e) => setDispositivoSeleccionado(e.target.value || null)}
            className="w-full border border-slate-300 rounded-md px-3 py-2"
          >
            <option value="">Seleccionar dispositivo...</option>
            {dispositivos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.marca} {d.modelo}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Lista de repuestos disponibles */}
      {dispositivoSeleccionado && (
        <div className="bg-slate-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-slate-700 mb-3">Repuestos Disponibles</h4>
          {loading ? (
            <p className="text-slate-600 text-sm">Cargando repuestos...</p>
          ) : repuestos.length === 0 ? (
            <p className="text-slate-600 text-sm">No hay repuestos disponibles para este dispositivo</p>
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
                    disabled={repuesto.stock_actual <= 0}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Agregar
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
