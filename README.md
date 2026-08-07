# Cuentas

Aplicación móvil offline para controlar depósitos, retiros y balances de diferentes perfiles de un negocio.

## Funciones principales

- Perfil principal en USDT con depósitos, retiros directos 1×1 y retiros CUP convertidos automáticamente.
- Tasas configurables para los tramos menores de 50 000, 50 000–99 999, 100 000–499 999 y desde 500 000 CUP.
- Perfiles CUP adicionales sin límite, cada uno con monto inicial y balance independiente.
- Balances positivos o negativos con precisión de tres decimales para USDT.
- Historial completo de movimientos con notas y eliminación controlada.
- Resúmenes diarios, semanales, mensuales o desde un corte personalizado.
- Informes de texto con montos agrupados, sumas, tasas y conversiones.
- Persistencia local mediante SQLite; no necesita conexión para operar.

## Stack

- Expo SDK 54
- React Native 0.81
- TypeScript
- React Navigation
- Expo SQLite

## Desarrollo

```powershell
npm.cmd install
npm.cmd start -- --lan
```

Escanea el QR con Expo Go desde un móvil conectado a la misma red.

## Validación

```powershell
npm.cmd run validate
```

Ejecuta la comprobación de tipos, las pruebas de cálculo contable y la validación de la configuración pública de Expo.

## Compilar APK de prueba

Requiere una sesión iniciada en EAS:

```powershell
eas.cmd login
eas.cmd project:info --non-interactive
npm.cmd run build:apk -- --non-interactive
```

El perfil `preview` produce un APK instalable para pruebas internas.

## Datos

La información permanece en la base SQLite local del dispositivo. Desinstalar la aplicación puede borrar esos datos; exporta los informes necesarios antes de hacerlo.
