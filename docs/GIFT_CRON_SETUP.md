# GIFT CRON SETUP — Regalos V3

## Activación manual (requerida para Beta)

La RPC `procesar_expiracion_reservados_v2()` existe en la base de datos (migración 078) pero **el scheduler nunca fue activado**.

### Prerrequisito

El extension `pg_cron` debe estar habilitada en el proyecto Supabase.

Para verificar:

```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

Si no aparece, habilitarla desde Supabase Dashboard → Database → Extensions → `pg_cron`.

### Comando exacto

Ejecutar **una sola vez** en Supabase SQL Editor:

```sql
SELECT cron.schedule(
  'gift-expiration',
  '0 */6 * * *',
  $$SELECT procesar_expiracion_reservados_v2()$$
);
```

Esto programa la ejecución de `procesar_expiracion_reservados_v2()` **cada 6 horas**.

### Qué hace

- Busca gifts en estado `RESERVED` donde `reserved_expires_at < NOW()`
- Los convierte a Gift Cards automáticamente usando `convertir_regalo_a_giftcard_v2()`
- Procesa hasta 50 gifts por ejecución (batch con `FOR UPDATE SKIP LOCKED`)
- Las Gift Cards resultantes heredan `gift_config.gift_card_expires_days` de la tienda
- Los gifts V1 (status=`approved`) NO son procesados — solo aplica a V2

### Verificar que está activo

```sql
SELECT * FROM cron.job WHERE jobname = 'gift-expiration';
```

### Desactivar

```sql
SELECT cron.unschedule('gift-expiration');
```

## Notas

- La función `handle_expired_gifts()` (V1, migración 005) **no tiene cron** y no se recomienda activar. Está siendo reemplazada por el flujo V2.
- `claimed_expires_days` **no tiene enforcement actualmente**. No existe `claimed_expires_at` ni RPC de expiración para CLAIMED.
