# Nexus Auth Context

## Estado actual

Nexus Core V2 usa actualmente autenticación basada en cookies personalizadas.

Cookies existentes:

* nx_session
* nx_colaborador
* nx_pcc_session

Actualmente:

* nx_session almacena directamente el id_tienda.
* nx_pcc_session usa el valor string "authenticated".
* middleware.ts protege rutas dashboard y onboarding.
* existe sistema de colaboradores.
* existe login-as para PCC.
* existe recuperación de contraseña.
* Supabase es usado como base de datos principal.
* NO usamos Supabase Auth todavía.

## Arquitectura actual

Stack:

* Next.js 16 App Router
* React 19
* Supabase
* Vercel

Auth actual:

* cookies manuales
* validaciones directas
* middleware simple
* sesiones no firmadas

## Problemas detectados

* cookies vulnerables
* sesiones no firmadas
* PCC demasiado abierto
* lógica auth distribuida
* falta expiración robusta
* falta invalidación de sesiones
* middleware básico
* riesgo de session spoofing

## Objetivos

NO rehacer todo el sistema.

Objetivos reales:

* endurecer seguridad
* introducir sesiones firmadas
* mantener compatibilidad actual
* hacer migración incremental
* NO romper gifts
* NO romper checkout
* NO romper PCC

## Reglas importantes

* NO refactorizar módulos no relacionados.
* NO mover archivos innecesariamente.
* Mantener compatibilidad actual.
* Mantener multi-tenant.
* Mantener estructura actual del proyecto.
* Priorizar cambios incrementales.
* Seguridad primero.

## Próximas fases

FASE 1:

* introducir session tokens firmados

FASE 2:

* tabla sessions

FASE 3:

* middleware robusto

FASE 4:

* endurecer PCC

FASE 5:

* auditoría y logs de auth
