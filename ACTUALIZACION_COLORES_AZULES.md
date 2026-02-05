# Actualización de Colores - Azul Estilo Facebook

## Cambios Realizados

### 1. Configuración de Tailwind (`tailwind.config.cjs`)
- ✅ Colores principales cambiados a azul Facebook (#1877F2)
- ✅ Paleta de grises para fondos (#F0F2F5 estilo Facebook)
- ✅ Textos en grises oscuros (#050505, #65676B)

### 2. Estilos Globales (`src/styles/global.css`)
- ✅ Fondo cambiado a gris claro (#F0F2F5)
- ✅ Inputs con fondo blanco y bordes grises
- ✅ Focus en azul Facebook
- ✅ Scrollbar estilo Facebook

### 3. Componentes Actualizados

#### Dashboard y Layout
- ✅ `Dashboard.tsx` - Fondo gris claro
- ✅ `Header` - Fondo blanco, texto gris oscuro
- ✅ `Sidebar` - Fondo blanco, botones azules

#### Formularios
- ✅ `Login.tsx` - Fondo blanco, inputs estilo Facebook
- ✅ `OrderForm.tsx` - Botones azules, inputs blancos
- ✅ `Settings.tsx` - Pestañas azules, botones azules

#### Dashboards
- ✅ `AdminDashboard.tsx` - Botones azules

### 4. Colores Principales

**Azules:**
- Principal: `#1877F2` (brand)
- Oscuro: `#166FE5` (brand-dark)
- Claro: `#42A5F5` (brand-light)

**Grises:**
- Fondo: `#F0F2F5` (gray-50)
- Bordes: `#CCCCCC` (gray-300)
- Texto principal: `#050505` (casi negro)
- Texto secundario: `#65676B` (gray-600)

**Blancos:**
- Fondo de cards: `#FFFFFF`
- Inputs: `#FFFFFF`

## Componentes que Necesitan Actualización Manual

Algunos componentes pueden tener referencias a colores antiguos. Buscar y reemplazar:

```bash
# Buscar referencias antiguas
bg-brand-dark → bg-white o bg-gray-50
text-brand-dark-text → text-gray-900
border-brand-dark-border → border-gray-200
bg-brand-light → bg-brand
```

## Próximos Pasos

1. Revisar componentes que aún usan `slate-` en lugar de `gray-`
2. Actualizar todos los botones para usar `bg-brand` en lugar de `bg-brand-light`
3. Verificar que todos los inputs tengan fondo blanco
4. Asegurar que las cards tengan fondo blanco y sombras sutiles

## Nota

Los cambios son compatibles con el sistema existente. Los colores `brand`, `brand-light`, y `brand-dark` ahora apuntan a los azules de Facebook en lugar de los dorados anteriores.
