# Sistema Playbox - Gestión de Órdenes de Servicio

Sistema completo de gestión para talleres de reparación de dispositivos móviles y electrónicos.

## Características Principales

- ✅ Gestión de órdenes de servicio con múltiples equipos
- ✅ Sistema de stock separado (Accesorios y Repuestos)
- ✅ Punto de venta (POS) con código de barras
- ✅ Gestión de caja diaria con control de efectivo
- ✅ Reportes de ventas en PDF
- ✅ Gestión masiva de stock
- ✅ Control de inventario y movimientos
- ✅ Sistema de firmas digitales en órdenes
- ✅ Dashboard con métricas en tiempo real

## Tecnologías

- **Frontend**: Astro + React + TypeScript
- **Estilos**: Tailwind CSS
- **Base de Datos**: Supabase (PostgreSQL)
- **PDF**: jsPDF
- **Deploy**: Vercel

## Configuración Inicial

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/sistema-playbox.git
cd sistema-playbox
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env` basado en `.env.example`:

```env
PUBLIC_SUPABASE_URL=tu_url_de_supabase
PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
```

### 4. Configurar la base de datos

Ejecuta los siguientes scripts SQL en orden:

1. `database/setup_completo.sql` - Crea toda la estructura de la base de datos
2. `database/migracion_stock_repuestos.sql` - Migración de stock y repuestos
3. `database/migracion_caja_reportes.sql` - Migración de caja y reportes
4. `database/crear_usuarios_iniciales.sql` - Crea usuarios iniciales (opcional)

### 5. Ejecutar en desarrollo

```bash
npm run dev
```

### 6. Build para producción

```bash
npm run build
```

## Despliegue en Vercel

1. Conecta tu repositorio de GitHub con Vercel
2. Configura las variables de entorno en Vercel:
   - `PUBLIC_SUPABASE_URL`
   - `PUBLIC_SUPABASE_ANON_KEY`
3. Vercel detectará automáticamente el framework Astro
4. El despliegue se realizará automáticamente en cada push a la rama principal

## Estructura del Proyecto

```
sistema-playbox/
├── src/
│   ├── react/
│   │   ├── components/     # Componentes React
│   │   ├── Dashboard.tsx    # Dashboard principal
│   │   └── Login.tsx        # Página de login
│   ├── lib/                 # Utilidades y funciones
│   ├── styles/              # Estilos globales
│   └── pages/               # Páginas Astro
├── database/                # Scripts SQL
├── public/                  # Archivos estáticos
└── package.json
```

## Funcionalidades Clave

### Gestión de Stock

- **Accesorios**: Categorizados (fundas, cargadores, micas, cables, etc.)
- **Repuestos**: Asociados a dispositivos específicos
- **Gestión masiva**: Importación desde CSV o creación múltiple

### Sistema de Caja

- Apertura y cierre de caja diaria
- Control de efectivo recibido y vueltos
- Cálculo automático de caja final

### Reportes

- Reportes por día, semana, mes o rango personalizado
- Exportación a PDF
- Desglose por método de pago

## Licencia

Este proyecto es privado y de uso interno.

## Soporte

Para problemas o consultas, contacta al equipo de desarrollo.
