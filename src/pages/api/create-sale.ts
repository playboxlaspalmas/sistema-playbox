import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL as string;
const serviceRoleKey =
  (import.meta.env.SUPABASE_SERVICE_ROLE_KEY as string) ||
  (import.meta.env.PUBLIC_SUPABASE_SERVICE_ROLE_KEY as string);

function generarNumeroVenta(): string {
  const año = new Date().getFullYear();
  const rand = randomBytes(4).toString("hex").toUpperCase();
  return `V-${año}-${Date.now()}-${rand}`;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Supabase envs no configuradas" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await request.json();
    const usuarioId = body.usuario_id ? String(body.usuario_id) : null;
    const sucursalId = body.sucursal_id ? String(body.sucursal_id) : null;

    if (!usuarioId) {
      return new Response(JSON.stringify({ error: "usuario_id es obligatorio" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let venta = null;
    let error: any = null;
    const maxRetries = 8;

    for (let intento = 0; intento < maxRetries; intento++) {
      const numeroVenta = generarNumeroVenta();
      const response = await adminClient
        .from("ventas")
        .insert({
          numero_venta: numeroVenta,
          usuario_id: usuarioId,
          sucursal_id: sucursalId,
          total: 0,
          metodo_pago: "EFECTIVO",
          estado: "pendiente",
        })
        .select()
        .single();

      venta = response.data;
      error = response.error;

      if (!error) break;

      if (
        error.code === "23505" ||
        error.message?.includes("duplicate key") ||
        error.message?.includes("venta_numero_venta_key")
      ) {
        continue;
      }

      break;
    }

    if (error || !venta) {
      return new Response(
        JSON.stringify({ error: error?.message || "Error creando venta" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ success: true, venta }), {
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
