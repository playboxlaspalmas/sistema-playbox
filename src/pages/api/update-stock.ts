import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL as string;
const serviceRoleKey =
  (import.meta.env.SUPABASE_SERVICE_ROLE_KEY as string) ||
  (import.meta.env.PUBLIC_SUPABASE_SERVICE_ROLE_KEY as string);

export const POST: APIRoute = async ({ request }) => {
  try {
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Supabase envs no configuradas" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await request.json();
    const productoId = String(body.producto_id || "").trim();
    const cantidad = Number(body.cantidad || 0);
    const usuarioId = body.usuario_id ? String(body.usuario_id) : null;
    const observaciones = body.observaciones ? String(body.observaciones) : null;

    if (!productoId || !Number.isFinite(cantidad) || cantidad === 0) {
      return new Response(
        JSON.stringify({ error: "Datos inválidos para actualizar stock" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: producto, error: productoError } = await adminClient
      .from("productos")
      .select("id, stock_actual")
      .eq("id", productoId)
      .single();

    if (productoError || !producto) {
      return new Response(
        JSON.stringify({ error: "Producto no encontrado" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const cantidadAnterior = producto.stock_actual || 0;
    const cantidadNueva = cantidadAnterior + cantidad;

    const { error: updateError } = await adminClient
      .from("productos")
      .update({ stock_actual: cantidadNueva })
      .eq("id", productoId);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: updateError.message || "Error actualizando stock" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { error: movimientoError } = await adminClient
      .from("inventario_movimientos")
      .insert({
        producto_id: productoId,
        tipo_movimiento: cantidad > 0 ? "compra" : "ajuste",
        cantidad,
        cantidad_anterior: cantidadAnterior,
        cantidad_nueva: cantidadNueva,
        usuario_id: usuarioId,
        observaciones: observaciones || (cantidad > 0 ? "Carga de stock" : "Ajuste de stock"),
      });

    if (movimientoError) {
      console.warn("[update-stock] Error registrando movimiento:", movimientoError);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || "Error interno" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
