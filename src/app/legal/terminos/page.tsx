import type { Metadata } from 'next'
import { LEGAL_UPDATED_AT } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Términos de Uso | Nexus',
}

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 sm:p-12">
          <h1 className="text-3xl font-extrabold text-slate-900 mb-1">Términos de Uso</h1>
          <p className="text-sm text-slate-400 mb-8">Última actualización: {LEGAL_UPDATED_AT}</p>

          <section className="space-y-6 text-slate-700 text-[15px] leading-relaxed">
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">1. Aceptación de los Términos</h2>
            <p>
              Al registrarse y utilizar Nexus, el Socio acepta íntegramente estos Términos de Uso.
              La aceptación se realiza mediante un checkbox obligatorio durante el registro.
            </p>
            <p>Si no está de acuerdo con alguna disposición, no debe utilizar el servicio.</p>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">2. Definiciones</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Nexus / Plataforma</strong>: sistema tecnológico de gestión de catálogo digital y pedidos, accesible a través de Internet.</li>
              <li><strong>Socio / Titular</strong>: persona que registra una cuenta y opera una tienda en la Plataforma.</li>
              <li><strong>Colaborador</strong>: persona autorizada por el Socio para acceder al dashboard de administración con permisos limitados.</li>
              <li><strong>Cliente / Cliente Final</strong>: persona que realiza pedidos a través del catálogo público.</li>
              <li><strong>Dashboard</strong>: interfaz privada de administración de la tienda.</li>
              <li><strong>Catálogo Público</strong>: página web pública donde se muestran los productos de la tienda y se reciben pedidos.</li>
              <li><strong>PCC</strong>: Panel de Control Centralizado, interfaz de administración general de la plataforma.</li>
            </ul>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">3. Registro y Cuenta</h2>

            <h3 className="text-lg font-bold text-slate-800 mt-4 mb-2">3.1 Registro</h3>
            <p>Para registrarse, el Socio debe proporcionar su nombre completo, nombre de la tienda, número de WhatsApp y una contraseña, además de aceptar estos Términos y la Política de Privacidad. El número de WhatsApp es el identificador principal de la cuenta.</p>

            <h3 className="text-lg font-bold text-slate-800 mt-4 mb-2">3.2 Responsabilidad sobre la Cuenta</h3>
            <p>El Socio es responsable de:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Mantener la confidencialidad de su contraseña</li>
              <li>Todas las actividades realizadas desde su cuenta</li>
              <li>Notificar inmediatamente cualquier acceso no autorizado</li>
              <li>Proporcionar y mantener información veraz</li>
            </ul>

            <h3 className="text-lg font-bold text-slate-800 mt-4 mb-2">3.3 Colaboradores</h3>
            <p>
              El Socio puede registrar Colaboradores con acceso limitado al dashboard. Cada Colaborador
              tiene su propia contraseña y permisos configurables (productos, pedidos, dashboard general).
              El Socio es el único responsable de la gestión y supervisión de sus Colaboradores. Los
              Colaboradores no tienen método de recuperación independiente. La gestión de sus cuentas debe
              realizarla el Socio desde el dashboard.
            </p>

            <h3 className="text-lg font-bold text-slate-800 mt-4 mb-2">3.4 Recuperación de Cuenta</h3>
            <p>El Socio dispone de los siguientes métodos para recuperar el acceso:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Código de verificación</strong>: código generado durante el registro, visible una sola vez, que puede ser regenerado desde el dashboard.</li>
              <li><strong>Preguntas de recuperación</strong>: preguntas de seguridad configurables desde el dashboard.</li>
              <li><strong>Asistencia del equipo de Nexus</strong>: el equipo de Nexus puede generar un enlace de recuperación temporal con expiración corta.</li>
            </ul>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">4. El Servicio</h2>

            <h3 className="text-lg font-bold text-slate-800 mt-4 mb-2">4.1 Funcionalidades</h3>
            <p>Nexus proporciona:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Catálogo digital público para mostrar productos con precios, imágenes, descripciones y variantes</li>
              <li>Dashboard privado para gestionar productos, pedidos, configuración y colaboradores</li>
              <li>Recepción y notificación de pedidos vía WhatsApp y notificaciones push</li>
              <li>Herramientas complementarias de gestión comercial</li>
            </ul>

            <h3 className="text-lg font-bold text-slate-800 mt-4 mb-2">4.2 Limitaciones</h3>
            <p>
              Nexus NO procesa pagos. Los pagos se acuerdan directamente entre el Socio y el Cliente.
              Nexus no tiene acceso a medios de pago ni datos financieros de los Clientes. Nexus no actúa
              como intermediario en las transacciones comerciales. La relación comercial es exclusivamente
              entre el Socio y el Cliente.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">5. Planes Comerciales y Suscripciones</h2>

            <h3 className="text-lg font-bold text-slate-800 mt-4 mb-2">5.1 Planes</h3>
            <p>
              La plataforma ofrece planes comerciales con diferentes límites de productos y funcionalidades.
              Los precios y características de cada plan se configuran y publican desde el panel de
              administración de la plataforma.
            </p>

            <h3 className="text-lg font-bold text-slate-800 mt-4 mb-2">5.2 Período de Prueba</h3>
            <p>
              Las cuentas nuevas reciben un período de prueba gratuito con acceso completo a las
              funcionalidades básicas. La duración del período de prueba corresponde a la configuración
              comercial vigente al momento del registro.
            </p>

            <h3 className="text-lg font-bold text-slate-800 mt-4 mb-2">5.3 Sistema de Tokens</h3>
            <p>Las suscripciones se gestionan mediante un sistema interno de tokens. Los tokens son asignados a la cuenta del Socio por el equipo de Nexus.</p>

            <h3 className="text-lg font-bold text-slate-800 mt-4 mb-2">5.4 Fundadores</h3>
            <p>
              Los Socios designados como "fundadores" por Nexus están exentos de la lógica automática de
              suspensión. Esta designación es otorgada discrecionalmente por Nexus. Nexus podrá modificar,
              ampliar o retirar los beneficios de fundador en cualquier momento.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">6. Suspensión y Eliminación de Cuentas</h2>

            <h3 className="text-lg font-bold text-slate-800 mt-4 mb-2">6.1 Fases de Suspensión</h3>
            <p>Cuando una cuenta no tiene una suscripción activa, atraviesa las siguientes fases en el orden establecido:</p>
            <ol className="list-decimal pl-6 space-y-1">
              <li><strong>Acceso completo</strong>: el Socio puede acceder al dashboard y el catálogo permanece activo.</li>
              <li><strong>Suspensión del dashboard</strong>: el Socio pierde acceso al panel de administración, pero el catálogo público y los pedidos existentes pueden permanecer accesibles.</li>
              <li><strong>Suspensión del catálogo</strong>: el catálogo público deja de estar disponible.</li>
              <li><strong>Eliminación</strong>: la cuenta y sus datos asociados se marcan para eliminación definitiva.</li>
            </ol>
            <p>
              La duración de cada fase corresponde a la configuración comercial vigente, que puede ser
              actualizada periódicamente. La información detallada sobre los plazos aplicables está
              disponible a través del canal de soporte de la plataforma.
            </p>

            <h3 className="text-lg font-bold text-slate-800 mt-4 mb-2">6.2 Reactivación</h3>
            <p>Una cuenta suspendida podrá ser reactivada una vez regularizada la situación comercial correspondiente y siempre que la cuenta no haya alcanzado una fase irreversible de eliminación.</p>

            <h3 className="text-lg font-bold text-slate-800 mt-4 mb-2">6.3 Excepción para Fundadores</h3>
            <p>Los Socios designados como fundadores no están sujetos al proceso de suspensión automática descrito en esta sección.</p>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">7. Propiedad Intelectual</h2>

            <h3 className="text-lg font-bold text-slate-800 mt-4 mb-2">7.1 Software de Nexus</h3>
            <p>
              El software, la arquitectura, el diseño y todos los componentes técnicos de Nexus son
              propiedad de sus titulares. El Socio recibe una licencia limitada, no exclusiva e
              intransferible para usar el servicio mientras su cuenta esté activa.
            </p>

            <h3 className="text-lg font-bold text-slate-800 mt-4 mb-2">7.2 Contenido del Socio</h3>
            <p>
              Los contenidos que el Socio publique en la plataforma (logos, imágenes, descripciones,
              nombres comerciales) son de su propiedad. El Socio otorga a Nexus una licencia para
              almacenar, reproducir y mostrar dichos contenidos con el único propósito de operar el
              servicio. El Socio declara tener los derechos necesarios sobre los contenidos que publica
              y que estos no infringen derechos de terceros.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">8. Responsabilidad del Comerciante</h2>
            <p>El Socio es el único responsable ante sus Clientes por:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>La calidad, disponibilidad y entrega de los productos ofrecidos</li>
              <li>Los precios, descuentos y promociones publicados</li>
              <li>El cumplimiento de garantías y obligaciones comerciales</li>
              <li>La gestión de devoluciones, cambios y reclamaciones</li>
              <li>La veracidad de las descripciones y especificaciones de los productos</li>
              <li>Obtener el consentimiento de sus Clientes para el tratamiento de sus datos personales, cuando sea requerido por la ley</li>
            </ul>
            <p>Nexus es un proveedor de infraestructura tecnológica y no asume responsabilidad por las transacciones comerciales entre el Socio y sus Clientes.</p>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">9. Responsabilidad de Nexus</h2>

            <h3 className="text-lg font-bold text-slate-800 mt-4 mb-2">9.1 Limitación</h3>
            <p>Nexus proporciona el servicio "tal cual" y "según disponibilidad", dentro de los estándares comercialmente razonables para un servicio de su tipo.</p>
            <p>Nexus no será responsable por:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Daños directos o indirectos derivados del uso o la imposibilidad de uso del servicio</li>
              <li>Pérdida de datos, ingresos u oportunidades de negocio</li>
              <li>Interrupciones causadas por proveedores de infraestructura externos (Supabase, Vercel, servicios de terceros)</li>
              <li>Actos de fuerza mayor</li>
              <li>Daños derivados de la relación comercial entre el Socio y sus Clientes</li>
            </ul>

            <h3 className="text-lg font-bold text-slate-800 mt-4 mb-2">9.2 Límite Máximo</h3>
            <p>La responsabilidad total de Nexus no superará el monto total pagado por el Socio en los 12 meses anteriores al hecho que originó la reclamación.</p>

            <h3 className="text-lg font-bold text-slate-800 mt-4 mb-2">9.3 Disponibilidad</h3>
            <p>Nexus realizará esfuerzos comercialmente razonables para mantener el servicio disponible, sujeto a ventanas de mantenimiento programado, dependencia de servicios de infraestructura de terceros y el estado de la cuenta del Socio según su plan y suscripción.</p>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">10. Uso Permitido y Prohibido</h2>

            <h3 className="text-lg font-bold text-slate-800 mt-4 mb-2">10.1 Usos Permitidos</h3>
            <p>El Socio puede utilizar la Plataforma para operar un catálogo digital de productos lícitos y gestionar los pedidos de sus Clientes.</p>

            <h3 className="text-lg font-bold text-slate-800 mt-4 mb-2">10.2 Usos Prohibidos</h3>
            <p>Queda prohibido:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Utilizar Nexus para la venta de productos ilegales</li>
              <li>Suplantar identidades</li>
              <li>Publicar contenido falso o engañoso</li>
              <li>Intentar vulnerar la seguridad de la Plataforma</li>
              <li>Realizar extracción automatizada de datos sin autorización</li>
              <li>Registrar múltiples cuentas con el mismo número de WhatsApp</li>
              <li>Compartir la contraseña con personas no autorizadas</li>
            </ul>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">11. Terminación</h2>

            <h3 className="text-lg font-bold text-slate-800 mt-4 mb-2">11.1 Por el Socio</h3>
            <p>El Socio puede cancelar su cuenta en cualquier momento desde el dashboard.</p>

            <h3 className="text-lg font-bold text-slate-800 mt-4 mb-2">11.2 Por Nexus</h3>
            <p>Nexus puede suspender o terminar una cuenta si:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>El Socio viola estos Términos</li>
              <li>Se detecta actividad fraudulenta o ilegal</li>
              <li>Así lo requiere una obligación legal</li>
            </ul>

            <h3 className="text-lg font-bold text-slate-800 mt-4 mb-2">11.3 Efectos</h3>
            <p>Tras la terminación, el acceso al servicio se desactiva y los datos se gestionan según el timeline de suspensión y eliminación descrito en la Sección 6.</p>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">12. Legislación Aplicable y Jurisdicción</h2>
            <p>Estos Términos se rigen por las leyes de la República Dominicana. Las controversias se someten a los tribunales competentes de la República Dominicana.</p>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">13. Modificaciones</h2>
            <p>Nexus puede modificar estos Términos. Los cambios se notifican a través del dashboard. El uso continuado del servicio después de la notificación constituye aceptación de los nuevos términos.</p>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">14. Contacto</h2>
            <p>
              Para consultas sobre estos Términos de Uso, el Socio puede contactar a Nexus a través del
              número de WhatsApp configurado como contacto oficial de soporte en la plataforma.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
