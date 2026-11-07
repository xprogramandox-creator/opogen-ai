import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidad",
  description:
    "Política de Privacidad de OpoGen AI: responsable, finalidades, base legal, destinatarios, conservación, cookies y derechos.",
};

export default function PoliticaPrivacidadPage() {
  return (
    <main id="contenido" className="min-h-app bg-transparent font-sans">
      <section className="mx-auto max-w-3xl px-5 py-10 sm:px-6 sm:py-14">
        <article className="rounded-3xl border border-[var(--th)] bg-[var(--card)] p-6 shadow-[var(--sombra)] sm:p-10">
          <Link
            href="/"
            className="mb-7 inline-flex items-center gap-2 rounded-xl border border-[var(--th)] bg-[var(--card2)] px-4 py-2 text-sm font-bold text-[var(--txt)] transition-colors hover:bg-[var(--suave2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)] focus-visible:ring-offset-2"
          >
            <span aria-hidden="true">←</span>
            Volver
          </Link>

          <h1 className="font-serif text-balance text-3xl font-medium tracking-tight text-[var(--txt)] sm:text-4xl">
            Política de Privacidad
          </h1>

          <p className="mt-4 text-sm text-[var(--txt3)]">
            Última actualización: [Fecha de última actualización]
          </p>

          <p className="mt-6 text-base leading-8 text-[var(--txt2)]">
            En OpoGen AI tratamos los datos personales conforme al Reglamento
            (UE) 2016/679 (RGPD) y a la Ley Orgánica 3/2018 (LOPDGDD). Esta
            política explica qué datos recogemos, con qué finalidad, durante
            cuánto tiempo y cómo puedes ejercer tus derechos.
          </p>

          <h2 className="mt-10 font-serif text-2xl font-medium text-[var(--azul)]">
            1. Responsable del tratamiento
          </h2>

          <ul className="mt-4 list-disc space-y-2 pl-6 text-base leading-8 text-[var(--txt2)]">
            <li>
              <strong className="text-[var(--txt)]">Identidad:</strong>{" "}
              [Manuel Pujante Noguera]
            </li>
            <li>
              <strong className="text-[var(--txt)]">NIF:</strong>{" "}
              [27457112B]
            </li>
            <li>
              <strong className="text-[var(--txt)]">Dirección:</strong>{" "}
              [Calle Gracia]
            </li>
            <li>
              <strong className="text-[var(--txt)]">Correo:</strong>{" "}
              <a
                href="mailto:soporte@opogenai.com"
                className="font-semibold text-[var(--azul)] underline underline-offset-4 hover:text-[var(--azul-hover)]"
              >
                soporte@opogenai.com
              </a>
            </li>
          </ul>

          <h2 className="mt-10 font-serif text-2xl font-medium text-[var(--azul)]">
            2. Datos que recogemos
          </h2>

          <ul className="mt-4 list-disc space-y-3 pl-6 text-base leading-8 text-[var(--txt2)]">
            <li>
              <strong className="text-[var(--txt)]">Datos de registro:</strong>{" "}
              nombre, apellidos, teléfono y correo electrónico.
            </li>
            <li>
              <strong className="text-[var(--txt)]">
                Datos de facturación:
              </strong>{" "}
              documento de identidad, dirección, ciudad, provincia, país y
              código postal, solo para usuarios Premium.
            </li>
            <li>
              <strong className="text-[var(--txt)]">Datos de uso:</strong>{" "}
              tests, resultados, estadísticas de estudio y archivos que subes
              a la plataforma.
            </li>
            <li>
              <strong className="text-[var(--txt)]">Datos técnicos:</strong>{" "}
              cookies de sesión, CSRF, preferencia de tema e identificadores
              anónimos de analítica.
            </li>
          </ul>

          <h2 className="mt-10 font-serif text-2xl font-medium text-[var(--azul)]">
            3. Finalidad del tratamiento
          </h2>

          <ul className="mt-4 list-disc space-y-3 pl-6 text-base leading-8 text-[var(--txt2)]">
            <li>Crear, verificar y gestionar tu cuenta de usuario.</li>
            <li>
              Enviar correos de verificación, recuperación de contraseña y
              comunicaciones necesarias del servicio.
            </li>
            <li>
              Generar tests, resúmenes, estadísticas y demás funcionalidades
              solicitadas.
            </li>
            <li>
              Gestionar pagos, suscripciones, facturación y obligaciones
              fiscales.
            </li>
            <li>
              Prevenir fraudes, abusos y accesos no autorizados, y mantener la
              seguridad de la plataforma.
            </li>
            <li>
              Elaborar estadísticas agregadas de uso y mejorar el servicio.
            </li>
          </ul>

          <h2 className="mt-10 font-serif text-2xl font-medium text-[var(--azul)]">
            4. Base legal
          </h2>

          <ul className="mt-4 list-disc space-y-3 pl-6 text-base leading-8 text-[var(--txt2)]">
            <li>
              <strong className="text-[var(--txt)]">
                Ejecución de un contrato:
              </strong>{" "}
              para gestionar tu cuenta y prestar los servicios solicitados.
            </li>
            <li>
              <strong className="text-[var(--txt)]">Consentimiento:</strong>{" "}
              para el envío de determinadas comunicaciones y para el
              tratamiento de datos opcional.
            </li>
            <li>
              <strong className="text-[var(--txt)]">
                Cumplimiento de una obligación legal:
              </strong>{" "}
              para facturación, contabilidad y obligaciones fiscales.
            </li>
            <li>
              <strong className="text-[var(--txt)]">
                Interés legítimo:
              </strong>{" "}
              para seguridad, prevención de abusos y mejora del servicio,
              siempre que no prevalezcan tus derechos.
            </li>
          </ul>

          <h2 className="mt-10 font-serif text-2xl font-medium text-[var(--azul)]">
            5. Destinatarios y proveedores
          </h2>

          <p className="mt-4 text-base leading-8 text-[var(--txt2)]">
            No vendemos tus datos. Para prestar el servicio utilizamos
            proveedores que actúan como encargados del tratamiento o
            responsables independientes:
          </p>

          <ul className="mt-4 list-disc space-y-3 pl-6 text-base leading-8 text-[var(--txt2)]">
            <li>
              <strong className="text-[var(--txt)]">Stripe:</strong>{" "}
              procesamiento de pagos y suscripciones. Los datos de la tarjeta
              se gestionan directamente en Stripe.
            </li>
            <li>
              <strong className="text-[var(--txt)]">DeepSeek:</strong>{" "}
              generación de preguntas y procesamiento de texto.
            </li>
            <li>
              <strong className="text-[var(--txt)]">Gemini:</strong>{" "}
              generación y comprobaciones mediante inteligencia artificial.
            </li>
            <li>
              <strong className="text-[var(--txt)]">Resend:</strong> envío de
              correos transaccionales de verificación y recuperación.
            </li>
            <li>
              <strong className="text-[var(--txt)]">Groq:</strong> proveedor de
              respaldo de inteligencia artificial, cuando se utilice.
            </li>
            <li>
              <strong className="text-[var(--txt)]">Hetzner:</strong>{" "}
              alojamiento de la aplicación y de los archivos en servidores
              propios.
            </li>
          </ul>

          <p className="mt-4 text-base leading-8 text-[var(--txt2)]">
            Algunos proveedores pueden estar fuera del Espacio Económico
            Europeo. En esos casos se aplican garantías contractuales y
            medidas equivalentes conforme al RGPD.
          </p>

          <h2 className="mt-10 font-serif text-2xl font-medium text-[var(--azul)]">
            6. Plazo de conservación
          </h2>

          <ul className="mt-4 list-disc space-y-3 pl-6 text-base leading-8 text-[var(--txt2)]">
            <li>
              Los datos de la cuenta se conservan mientras la cuenta esté
              activa y durante los plazos legales aplicables.
            </li>
            <li>
              Los datos de facturación se conservan durante el tiempo exigido
              por la legislación fiscal, generalmente cinco años.
            </li>
            <li>
              Si una cuenta Premium pasa a Freemium, los archivos se
              conservan durante 30 días y después se eliminan.
            </li>
            <li>
              Los datos anónimos de analítica se conservan durante un periodo
              limitado y no permiten identificar a la persona.
            </li>
            <li>
              Las copias de seguridad se conservan durante el periodo
              necesario para garantizar la recuperación del servicio.
            </li>
          </ul>

          <h2 className="mt-10 font-serif text-2xl font-medium text-[var(--azul)]">
            7. Almacenamiento de archivos
          </h2>

          <p className="mt-4 text-base leading-8 text-[var(--txt2)]">
            Los archivos que subes se almacenan en servidores propios
            contratados con Hetzner, dentro de un volumen persistente de la
            aplicación. Cada cuenta dispone de su propia carpeta y sus
            archivos no se mezclan con los de otras personas usuarias.
          </p>

          <p className="mt-4 text-base leading-8 text-[var(--txt2)]">
            Para generar preguntas, enviamos a los proveedores de inteligencia
            artificial únicamente el texto necesario para la tarea solicitada.
            No cedemos el archivo completo ni utilizamos tus apuntes para
            fines publicitarios.
          </p>

          <h2
            id="cookies"
            className="mt-10 scroll-mt-28 font-serif text-2xl font-medium text-[var(--azul)]"
          >
            8. Cookies y almacenamiento local
          </h2>

          <p className="mt-4 text-base leading-8 text-[var(--txt2)]">
            Utilizamos cookies y tecnologías equivalentes estrictamente
            necesarias para el funcionamiento del servicio:
          </p>

          <ul className="mt-4 list-disc space-y-3 pl-6 text-base leading-8 text-[var(--txt2)]">
            <li>
              <strong className="text-[var(--txt)]">
                Cookie de sesión:
              </strong>{" "}
              mantiene tu sesión iniciada y es imprescindible para acceder a
              tu cuenta.
            </li>
            <li>
              <strong className="text-[var(--txt)]">Cookie CSRF:</strong>{" "}
              protege los formularios frente a peticiones no autorizadas.
            </li>
            <li>
              <strong className="text-[var(--txt)]">Preferencia de tema:</strong>{" "}
              recuerda si utilizas el modo claro u oscuro.
            </li>
            <li>
              <strong className="text-[var(--txt)]">
                Almacenamiento de sesión:
              </strong>{" "}
              usamos `sessionStorage` para un identificador anónimo de
              analítica y para recordar el email durante el flujo de pago.
              Se elimina al cerrar la pestaña.
            </li>
            <li>
              <strong className="text-[var(--txt)]">Cookies de Stripe:</strong>{" "}
              pueden establecerse durante el proceso de pago en el dominio de
              Stripe.
            </li>
          </ul>

          <p className="mt-4 text-base leading-8 text-[var(--txt2)]">
            No utilizamos cookies publicitarias ni de perfilado. Puedes
            configurar o eliminar las cookies desde tu navegador, aunque
            bloquear las cookies necesarias puede impedir el acceso a la
            cuenta.
          </p>

          <h2 className="mt-10 font-serif text-2xl font-medium text-[var(--azul)]">
            9. Derechos de las personas usuarias
          </h2>

          <p className="mt-4 text-base leading-8 text-[var(--txt2)]">
            Puedes ejercer los siguientes derechos:
          </p>

          <ul className="mt-4 list-disc space-y-2 pl-6 text-base leading-8 text-[var(--txt2)]">
            <li>Acceso a tus datos personales.</li>
            <li>Rectificación de datos inexactos o incompletos.</li>
            <li>Supresión de tus datos cuando ya no sean necesarios.</li>
            <li>Limitación u oposición al tratamiento.</li>
            <li>Portabilidad de tus datos en un formato estructurado.</li>
            <li>Retirada del consentimiento en cualquier momento.</li>
            <li>
              Reclamación ante la Agencia Española de Protección de Datos
              (AEPD).
            </li>
          </ul>

          <p className="mt-4 text-base leading-8 text-[var(--txt2)]">
            Para ejercerlos, escribe a{" "}
            <a
              href="mailto:soporte@opogenai.com"
              className="font-semibold text-[var(--azul)] underline underline-offset-4 hover:text-[var(--azul-hover)]"
            >
              soporte@opogenai.com
            </a>{" "}
            indicando el derecho que deseas ejercer y adjuntando la
            información necesaria para identificarte.
          </p>

          <h2 className="mt-10 font-serif text-2xl font-medium text-[var(--azul)]">
            10. Seguridad
          </h2>

          <p className="mt-4 text-base leading-8 text-[var(--txt2)]">
            Aplicamos medidas técnicas y organizativas para proteger la
            información: contraseñas con Argon2id, protección CSRF, límites
            de intentos, control de acceso al servidor y copias de seguridad.
            Ningún sistema es completamente infalible, por lo que te
            recomendamos custodiar tu contraseña y no compartirla.
          </p>

          <h2 className="mt-10 font-serif text-2xl font-medium text-[var(--azul)]">
            11. Menores y Zona Kids
          </h2>

          <p className="mt-4 text-base leading-8 text-[var(--txt2)]">
            La Zona Kids está dirigida a menores de entre 3 y 12 años. Si un
            menor se registra, se presume que cuenta con el consentimiento de
            sus padres, madres o tutores legales. Si eres tutor y detectas
            datos de un menor sin autorización, puedes solicitarnos su
            eliminación en soporte@opogenai.com.
          </p>

          <h2 className="mt-10 font-serif text-2xl font-medium text-[var(--azul)]">
            12. Cambios en esta política
          </h2>

          <p className="mt-4 text-base leading-8 text-[var(--txt2)]">
            Podemos actualizar esta Política de Privacidad para adaptarla a
            cambios legislativos o del servicio. Publicaremos la versión
            vigente con su fecha de actualización y, cuando el cambio sea
            relevante, lo comunicaremos por los medios habituales.
          </p>

          <p className="mt-10 border-t border-[var(--th)] pt-6 text-sm leading-7 text-[var(--txt3)]">
            Esta política se complementa con el{" "}
            <Link
              href="/legal/aviso-legal"
              className="font-semibold text-[var(--azul)] underline underline-offset-4"
            >
              Aviso Legal
            </Link>
            .
          </p>
        </article>
      </section>
    </main>
  );
}
