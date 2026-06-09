import type { Metadata } from 'next'
import { LEGAL_UPDATED_AT } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Política de Privacidad | Nexus',
}

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 sm:p-12">
          <h1 className="text-3xl font-extrabold text-slate-900 mb-1">Política de Privacidad</h1>
          <p className="text-sm text-slate-400 mb-8">Última actualización: {LEGAL_UPDATED_AT}</p>

          <section className="space-y-6 text-slate-700 text-[15px] leading-relaxed">
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">1. Responsable del Tratamiento</h2>
            <p>
              Nexus es una plataforma tecnológica de gestión de catálogo digital y pedidos para comercios.
            </p>
            <p>
              Para efectos de esta Política de Privacidad, se distinguen dos roles:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Nexus como Responsable del Tratamiento</strong> — respecto a los datos necesarios
                para la operación de la plataforma, incluyendo: datos de las cuentas de los Socios, datos de
                Colaboradores, datos técnicos de navegación y seguridad, registros de acceso y autenticación,
                y configuración de la plataforma.
              </li>
              <li>
                <strong>El Socio como Responsable del Tratamiento</strong> — respecto a los datos de sus
                Clientes Finales. Nexus actúa como proveedor tecnológico y encargado del tratamiento respecto
                a estos datos, proporcionando la infraestructura para que el Socio los gestione.
              </li>
            </ul>
            <p>
              El contacto oficial de la plataforma se publica dinámicamente desde el panel de configuración
              y se muestra en las páginas de registro, inicio de sesión y recuperación de cuenta.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">2. Datos que Recopilamos</h2>

            <h3 className="text-lg font-bold text-slate-800 mt-6 mb-2">2.1 Datos que Nexus recopila como Responsable del Tratamiento</h3>

            <p className="font-semibold text-slate-800">Datos del Socio (titular de la cuenta):</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Nombre completo del socio — identificación del titular</li>
              <li>Nombre de la tienda — identificación comercial</li>
              <li>Número de WhatsApp — identificador de cuenta, autenticación y notificaciones</li>
              <li>Contraseña — autenticación (almacenada con hash)</li>
              <li>País y moneda — configuración regional</li>
              <li>Tipo de negocio — personalización del servicio</li>
              <li>Dirección y RNC — facturación fiscal (proporcionados voluntariamente)</li>
              <li>Correo electrónico — recuperación y notificaciones (proporcionado voluntariamente)</li>
              <li>Preguntas de recuperación — seguridad de la cuenta (proporcionadas voluntariamente)</li>
              <li>Código de verificación — recuperación de cuenta</li>
            </ul>

            <p className="font-semibold text-slate-800 mt-4">Datos de Colaboradores:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Nombre completo — identificación</li>
              <li>Número de WhatsApp — identificador de cuenta</li>
              <li>Contraseña — autenticación</li>
              <li>Permisos asignados — control de acceso al dashboard</li>
            </ul>

            <p className="font-semibold text-slate-800 mt-4">Datos técnicos:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Dirección IP — seguridad y prevención de accesos no autorizados</li>
              <li>Agente de usuario (user-agent) — identificación del dispositivo</li>
              <li>Identificador de dispositivo (hash) — detección de nuevos dispositivos</li>
              <li>Cookies de sesión (httpOnly) — autenticación</li>
              <li>Almacenamiento local del navegador — funcionalidad del servicio (carrito, preferencias)</li>
            </ul>

            <h3 className="text-lg font-bold text-slate-800 mt-6 mb-2">2.2 Datos que Nexus procesa en nombre del Socio</h3>
            <p>
              Son los datos que el Socio recopila de sus Clientes a través del catálogo público. Nexus los
              almacena y procesa como infraestructura tecnológica, bajo las instrucciones del Socio:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Nombre del cliente — gestión del pedido</li>
              <li>Número de teléfono / WhatsApp — contacto para entrega</li>
              <li>Notas del pedido — preparación y entrega</li>
              <li>Productos, cantidades y precios del pedido — gestión comercial</li>
            </ul>

            <h3 className="text-lg font-bold text-slate-800 mt-6 mb-2">2.3 Información pública del catálogo</h3>
            <p>
              El catálogo público de cada tienda no requiere autenticación. La siguiente información es
              visible para cualquier visitante de Internet y su publicación es decisión y responsabilidad
              del Socio:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Nombre comercial y logo de la tienda</li>
              <li>Productos: nombre, descripción, precio, imágenes, stock y variantes</li>
              <li>Número de WhatsApp de la tienda para contacto directo</li>
              <li>Dirección, horario y redes sociales (según lo configurado por el Socio)</li>
              <li>Estado del pedido: cualquier persona con el número de pedido puede consultar su estado y productos incluidos</li>
            </ul>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">3. Finalidades del Tratamiento</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Operar el catálogo digital y gestionar productos — ejecución del contrato de servicios con el Socio</li>
              <li>Recibir, procesar y notificar pedidos — ejecución del contrato de servicios</li>
              <li>Autenticar al Socio y Colaboradores — ejecución del contrato</li>
              <li>Enviar notificaciones al Socio — interés legítimo</li>
              <li>Prevenir accesos no autorizados — interés legítimo</li>
              <li>Gestionar suscripciones y planes comerciales — ejecución del contrato</li>
              <li>Mantener copias de seguridad de los datos — interés legítimo</li>
              <li>Cumplir obligaciones fiscales (RNC) — obligación legal</li>
            </ul>
            <p>No se utilizan datos personales para elaboración de perfiles comerciales ni para publicidad comportamental.</p>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">4. Destinatarios de los Datos</h2>

            <p className="font-semibold text-slate-800">Supabase Inc.</p>
            <p>Nexus utiliza Supabase Inc. (San Francisco, California, EE.UU.) como proveedor de infraestructura de base de datos, autenticación y almacenamiento de archivos. Todos los datos de la plataforma se alojan en servicios de Supabase.</p>

            <p className="font-semibold text-slate-800 mt-3">Vercel Inc.</p>
            <p>La aplicación se despliega en Vercel Inc. (San Francisco, California, EE.UU.), que actúa como proveedor de alojamiento de la aplicación.</p>

            <p className="font-semibold text-slate-800 mt-3">Meta Platforms Inc. / WhatsApp</p>
            <p>Los pedidos se notifican al Socio mediante enlaces de WhatsApp generados en el navegador del Cliente. El mensaje puede incluir nombre del cliente, productos solicitados y total del pedido. Adicionalmente, la plataforma puede enviar alertas automáticas al número de soporte configurado mediante servicios externos de mensajería.</p>

            <p className="font-semibold text-slate-800 mt-3">Web Push (VAPID)</p>
            <p>Se utilizan notificaciones push del navegador para alertar al Socio sobre nuevos pedidos.</p>

            <p className="font-semibold text-slate-800 mt-3">Autoridades competentes</p>
            <p>Los datos podrán ser revelados cuando exista una obligación legal o requerimiento judicial válido.</p>
            <p>No se venden datos personales a terceros.</p>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">5. Transferencias Internacionales</h2>
            <p>Los datos se almacenan y procesan en servidores ubicados en Estados Unidos a través de Supabase Inc. y Vercel Inc. Las transferencias se realizan bajo las garantías contractuales adecuadas conforme a la legislación aplicable.</p>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">6. Conservación de Datos</h2>

            <p className="font-semibold text-slate-800">Datos de la cuenta del Socio</p>
            <p>Se conservan mientras la cuenta esté activa. Tras la desactivación o eliminación de la cuenta, los datos se conservan durante el período establecido en el timeline comercial vigente antes de su eliminación definitiva.</p>

            <p className="font-semibold text-slate-800 mt-3">Datos de pedidos y clientes</p>
            <p>Se conservan mientras la cuenta del Socio esté activa, ya que son necesarios para la operación del negocio.</p>

            <p className="font-semibold text-slate-800 mt-3">Datos técnicos y de seguridad</p>
            <p>Se conservan durante el período necesario para cumplir con las finalidades de seguridad y prevención de fraude para las que fueron recopilados.</p>

            <p className="font-semibold text-slate-800 mt-3">Datos en localStorage del navegador</p>
            <p>Nexus utiliza el almacenamiento local del navegador para las siguientes funciones: carrito de compras del cliente, preferencia de tema visual, último pedido realizado y configuración básica de la tienda. Estos datos pueden ser eliminados por el usuario desde la configuración de su navegador en cualquier momento.</p>

            <p className="font-semibold text-slate-800 mt-3">Cookies</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left px-3 py-2 border border-slate-200 font-semibold">Cookie</th>
                    <th className="text-left px-3 py-2 border border-slate-200 font-semibold">Propósito</th>
                    <th className="text-left px-3 py-2 border border-slate-200 font-semibold">Duración</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3 py-2 border border-slate-200 font-mono text-xs">nx_session</td>
                    <td className="px-3 py-2 border border-slate-200">Autenticación del Socio</td>
                    <td className="px-3 py-2 border border-slate-200">Duración de la sesión configurada</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 border border-slate-200 font-mono text-xs">nx_colaborador</td>
                    <td className="px-3 py-2 border border-slate-200">Autenticación del Colaborador</td>
                    <td className="px-3 py-2 border border-slate-200">Duración de la sesión configurada</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 border border-slate-200 font-mono text-xs">nx_pcc_session</td>
                    <td className="px-3 py-2 border border-slate-200">Sesión del panel de administración</td>
                    <td className="px-3 py-2 border border-slate-200">Duración de la sesión configurada</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-sm mt-2">Las cookies de autenticación son de tipo httpOnly, no accesibles desde JavaScript del navegador.</p>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">7. Derechos del Usuario</h2>
            <p>El Socio tiene los siguientes derechos sobre sus datos personales:</p>
            <ol className="list-decimal pl-6 space-y-1">
              <li><strong>Acceso</strong>: solicitar confirmación sobre si se están tratando sus datos</li>
              <li><strong>Rectificación</strong>: solicitar la corrección de datos inexactos</li>
              <li><strong>Supresión</strong>: solicitar la eliminación de sus datos</li>
              <li><strong>Limitación del tratamiento</strong>: solicitar que se restrinja el tratamiento</li>
              <li><strong>Portabilidad</strong>: recibir los datos en un formato estructurado</li>
              <li><strong>Oposición</strong>: oponerse al tratamiento para fines específicos</li>
            </ol>
            <p className="mt-3">
              Para ejercer estos derechos, el Socio debe contactar a Nexus a través del canal de soporte
              configurado en la plataforma.
            </p>
            <p>
              Los derechos de los Clientes Finales deben ser gestionados directamente con el Socio de la
              tienda correspondiente. Nexus, como proveedor tecnológico, proporcionará asistencia razonable
              al Socio para cumplir con dichas solicitudes.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">8. Seguridad de los Datos</h2>
            <p>
              Nexus implementa medidas de seguridad técnicas y organizativas comercialmente razonables para
              proteger los datos contra accesos no autorizados, pérdida o alteración, incluyendo:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Cifrado de las comunicaciones entre el navegador y los servidores</li>
              <li>Almacenamiento de contraseñas mediante funciones de hash con sal</li>
              <li>Tokenses de sesión firmados criptográficamente</li>
              <li>Limitación de intentos de inicio de sesión para prevenir ataques de fuerza bruta</li>
              <li>Monitoreo básico de nuevos dispositivos en cada inicio de sesión</li>
            </ul>
            <p className="mt-3">
              Sin embargo, ninguna medida de seguridad es absoluta. El Socio es responsable de mantener la
              confidencialidad de su contraseña y de notificar cualquier acceso no autorizado a su cuenta.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">9. Menores de Edad</h2>
            <p>El servicio no está dirigido a menores de 18 años. No se recopila intencionadamente información de menores.</p>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">10. Cambios en esta Política</h2>
            <p>Nexus se reserva el derecho de modificar esta política. Los cambios serán notificados a través del dashboard del Socio.</p>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">11. Contacto</h2>
            <p>
              Para consultas sobre esta Política de Privacidad, el Socio puede contactar a Nexus a través
              del número de WhatsApp publicado como contacto oficial de soporte en la plataforma,
              configurado dinámicamente desde el panel de administración.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
