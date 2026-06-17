# 🌺 Orchid Monitoring — Guía de Instalación

## Requisitos

- **Node.js 18+** — [nodejs.org](https://nodejs.org)
- **pnpm** (reemplaza a npm, más seguro y rápido)
- **MySQL 8+** corriendo en tu máquina

---

## 1. Instalar pnpm (una sola vez)

```bash
npm install -g pnpm
```

---

## 2. Configurar el entorno

Copia `.env.example` a `.env` y edita tu contraseña de MySQL:

```bash
cp .env.example .env
```

Edita el `.env`:
```
DB_PASSWORD=tu_password_real_de_mysql
```

Los demás valores ya están correctos por defecto.

---

## 3. Crear la base de datos

En MySQL Workbench o en terminal:

```sql
source database/schema.sql
```

O desde terminal:
```bash
mysql -u root -p < database/schema.sql
```

---

## 4. Instalar dependencias

```bash
pnpm install
```

---

## 5. Iniciar el servidor

```bash
# Producción
pnpm start

# Desarrollo (recarga automática)
pnpm dev
```

Abrir en el navegador: **http://localhost:3000**

---

## Páginas disponibles

| URL | Descripción |
|-----|-------------|
| `/` | Dashboard principal |
| `/dashboard` | Monitoreo en tiempo real |
| `/sensors` | Gestión de sensores |
| `/schedule` | Calendario de riego |
| `/history` | Historial de lecturas |

---

## Por qué pnpm en vez de npm

- **Sin vulnerabilidades de hoisting**: pnpm aísla los paquetes correctamente, evitando que dependencias no declaradas accedan al código
- **Más rápido**: usa un store global, no duplica paquetes entre proyectos
- **Más seguro**: no ejecuta scripts de instalación de forma implícita

---

## Correcciones aplicadas en esta versión

1. `DB_PORT` corregido de `3000` a `3306` (puerto real de MySQL)
2. `models/Sensor.js` reescrito de ESM (`import/export`) a CommonJS (`require`) — el original crasheaba al iniciar
3. `models/Reading.js` ídem — mismo problema
4. Métodos faltantes agregados: `Sensor.getActive()`, `Reading.getWithAlerts()`, `Reading.getByPeriod()`, `Reading.getStatistics()`
5. Migrado a **pnpm** para gestión de paquetes más segura
