import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCLP } from '@/lib/currency';
import type { User, CajaDiaria } from '@/types';

interface CajaManagerProps {
  user: User;
}

export default function CajaManager({ user }: CajaManagerProps) {
  const [cajaAbierta, setCajaAbierta] = useState<CajaDiaria | null>(null);
  const [cajaInicial, setCajaInicial] = useState<string>('');
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totales, setTotales] = useState({
    total_efectivo: 0,
    total_tarjeta: 0,
    total_transferencia: 0,
    total_general: 0,
    total_vueltos: 0,
    cantidad_ventas: 0,
  });

  useEffect(() => {
    cargarCajaAbierta();
  }, [user.sucursal_id]);

  useEffect(() => {
    if (cajaAbierta) {
      cargarTotales();
    }
  }, [cajaAbierta]);

  async function cargarCajaAbierta() {
    try {
      const { data, error } = await supabase
        .rpc('get_caja_abierta_hoy', { p_sucursal_id: user.sucursal_id || null });

      if (error) throw error;

      if (data && data.length > 0) {
        setCajaAbierta(data[0]);
      } else {
        setCajaAbierta(null);
      }
    } catch (err: any) {
      console.error('Error cargando caja:', err);
      setError('Error al cargar caja: ' + (err.message || 'Error desconocido'));
    }
  }

  async function cargarTotales() {
    if (!cajaAbierta) return;

    try {
      const fecha = new Date(cajaAbierta.fecha).toISOString().split('T')[0];
      const { data, error } = await supabase
        .rpc('calcular_totales_ventas_dia', {
          p_fecha: fecha,
          p_sucursal_id: user.sucursal_id || null,
        });

      if (error) throw error;

      if (data && data.length > 0) {
        setTotales(data[0]);
      }
    } catch (err: any) {
      console.error('Error cargando totales:', err);
    }
  }

  async function abrirCaja() {
    if (!cajaInicial || parseFloat(cajaInicial) < 0) {
      setError('Ingresa un monto válido para la caja inicial');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('caja_diaria')
        .insert({
          sucursal_id: user.sucursal_id,
          usuario_id: user.id,
          fecha: new Date().toISOString().split('T')[0],
          caja_inicial: parseFloat(cajaInicial),
          estado: 'abierta',
          observaciones: observaciones.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      setCajaAbierta(data);
      setCajaInicial('');
      setObservaciones('');
    } catch (err: any) {
      console.error('Error abriendo caja:', err);
      setError('Error al abrir caja: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  }

  async function cerrarCaja() {
    if (!cajaAbierta) return;

    try {
      setLoading(true);
      setError(null);

      const cajaFinal = cajaAbierta.caja_inicial + totales.total_efectivo - totales.total_vueltos;

      const { data, error } = await supabase
        .from('caja_diaria')
        .update({
          caja_final: cajaFinal,
          estado: 'cerrada',
          cerrada_at: new Date().toISOString(),
          observaciones: observaciones.trim() || cajaAbierta.observaciones || null,
        })
        .eq('id', cajaAbierta.id)
        .select()
        .single();

      if (error) throw error;

      setCajaAbierta(null);
      setObservaciones('');
    } catch (err: any) {
      console.error('Error cerrando caja:', err);
      setError('Error al cerrar caja: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  }

  const cajaFinalCalculada = cajaAbierta
    ? cajaAbierta.caja_inicial + totales.total_efectivo - totales.total_vueltos
    : 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Gestión de Caja Diaria</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {!cajaAbierta ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Caja Inicial *
            </label>
            <input
              type="number"
              value={cajaInicial}
              onChange={(e) => setCajaInicial(e.target.value)}
              placeholder="0"
              min="0"
              step="100"
              className="w-full px-3 py-2 border border-gray-300 bg-white rounded-lg text-gray-900 text-lg font-semibold focus:ring-2 focus:ring-brand focus:border-brand"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observaciones (opcional)
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 bg-white rounded-lg text-gray-900 focus:ring-2 focus:ring-brand focus:border-brand"
              placeholder="Notas sobre la apertura de caja..."
            />
          </div>

          <button
            onClick={abrirCaja}
            disabled={loading || !cajaInicial}
            className="w-full py-3 bg-brand text-white rounded-lg font-semibold hover:bg-brand-dark disabled:opacity-50 transition-colors shadow-sm"
          >
            {loading ? 'Abriendo...' : 'Abrir Caja'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-800 mb-2">✓ Caja Abierta</h3>
            <p className="text-sm text-green-700">
              Abierta el {new Date(cajaAbierta.created_at).toLocaleDateString('es-CL', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Caja Inicial</p>
              <p className="text-2xl font-bold text-gray-900">{formatCLP(cajaAbierta.caja_inicial)}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Caja Final Estimada</p>
              <p className="text-2xl font-bold text-gray-900">{formatCLP(cajaFinalCalculada)}</p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Resumen de Ventas del Día</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Ventas en Efectivo:</span>
                <span className="font-semibold text-gray-900">{formatCLP(totales.total_efectivo)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Ventas con Tarjeta:</span>
                <span className="font-semibold text-gray-900">{formatCLP(totales.total_tarjeta)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Ventas por Transferencia:</span>
                <span className="font-semibold text-gray-900">{formatCLP(totales.total_transferencia)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="text-gray-700 font-medium">Total General:</span>
                <span className="font-bold text-gray-900">{formatCLP(totales.total_general)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Vueltos Entregados:</span>
                <span className="font-semibold text-red-600">-{formatCLP(totales.total_vueltos)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="text-gray-700 font-medium">Total de Ventas:</span>
                <span className="font-semibold text-gray-900">{totales.cantidad_ventas}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observaciones para el cierre (opcional)
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 bg-white rounded-lg text-gray-900 focus:ring-2 focus:ring-brand focus:border-brand"
              placeholder="Notas sobre el cierre de caja..."
            />
          </div>

          <button
            onClick={cerrarCaja}
            disabled={loading}
            className="w-full py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {loading ? 'Cerrando...' : 'Cerrar Caja'}
          </button>
        </div>
      )}
    </div>
  );
}
