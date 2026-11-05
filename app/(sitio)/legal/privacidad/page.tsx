import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidad",
  description:
    "Política de Privacidad de OpoGen AI: datos que recogemos, finalidades, base legal, conservación y derechos de los usuarios.",
};

export default function PoliticaPrivacidadPage() {
  return (
    <main id="contenido" className="bg-app min-h-app font-sans">
      <section className="mx-auto max-w-3xl px-5 py-10 sm:px-6 sm:py-14">
        <article className="rounded-3xl bg-[var(--card)] p-8 shadow-[var(--sombra)]">
          <Link
            href="/"
            className="mb-7 inline-flex items-center gap-2 rounded-xl border border-[var(--th)] bg-[var(--card2)] px-4 py-2 text-sm font-bold text-[var(--txt)] transition-colors hover:bg-[var(--suave2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)] focus-visible:ring-offset-2"
          >
            <span aria-hidden="true">←</span>
            Volver
          </Link>

          <h1 className="text-balance text-3xl font-bold tracking-tight text-[var(--txt)] sm:text-4xl">
            Política de Privacidad
          </h1>

          <p className="mt-5 leading-relaxed text-[var(--txt2)]">
            En OpoGen AI nos tomamos muy en serio tu privacidad. Esta política
            te explica qué datos recogemos, cómo los usamos y cómo los
            protegemos, en cumplimiento del Reglamento General de Protección
            de Datos (RGPD) y la Ley Orgánica de Protección de Datos y
            Garantía de los Derechos Digitales (LOPDGDD).
          </p>

          <h2 className="mt-8 text-xl font-bold text-[var(--txt)]">
            1. Responsable del Tratamiento
          </h2>

          <ul className="mt-3 list-disc space-y-1.5 pl-6 leading-relaxed text-[var(--txt2)]">
            <li>
              <strong className="text-[var(--txt)]">Identidad:</strong>{" "}
              opogenai (Manuel Pujante Noguera)
            </li>
            <li>
              <strong className="text-[var(--txt)]">NIF:</strong> 27457112B
            </li>
            <li>
              <strong className="text-[var(--txt)]">Dirección:</strong>{" "}
              Calle Gracia 20 4ºB, 02005 Albacete, España
            </li>
            <li>
              <strong className="text-[var(--txt)]">
                Correo electrónico:
              </strong>{" "}
              soporte@opogenai.com
            </li>
          </ul>

          <h2 className="mt-8 text-xl font-bold text-[var(--txt)]">
            2. ¿Qué datos recogemos y para qué?
          </h2>

          <p className="mt-3 leading-relaxed text-[var(--txt2)]">
            En OpoGen AI tratamos los datos personales con las siguientes
            finalidades:
          </p>

          <ul className="mt-3 list-disc space-y-3 pl-6 leading-relaxed text-[var(--txt2)]">
            <li>
              <strong className="text-[var(--txt)]">
                Datos de registro:
              </strong>{" "}
              Nombre, apellidos, número de teléfono y correo electrónico. Se
              utilizan para crear y gestionar tu cuenta de usuario, así como
              para enviarte correos de verificación o recuperación de
              contraseña.
            </li>
            <li>
              <strong className="text-[var(--txt)]">
                Datos de facturación (solo Plan Premium):
              </strong>{" "}
              DNI/NIE, dirección completa, ciudad, provincia, país y código
              postal. Se utilizan exclusivamente para la gestión fiscal y
              contable de tu suscripción.
            </li>
            <li>
              <strong className="text-[var(--txt)]">
                Datos de uso:
              </strong>{" "}
              Los archivos (PDFs, textos, imágenes) que subes a la
              plataforma, así como los resultados de tus tests y estadísticas
              de estudio. Se utilizan para generar los exámenes
              personalizados y mostrarte tu progreso.
            </li>
          </ul>

          <h2 className="mt-8 text-xl font-bold text-[var(--txt)]">
            3. Base Legal para el Tratamiento
          </h2>

          <p className="mt-3 leading-relaxed text-[var(--txt2)]">
            La base legal para el tratamiento de tus datos es:
          </p>

          <ul className="mt-3 list-disc space-y-1.5 pl-6 leading-relaxed text-[var(--txt2)]">
            <li>
              <strong className="text-[var(--txt)]">
                La ejecución de un contrato:
              </strong>{" "}
              Para la gestión de tu cuenta y la prestación del servicio de
              generación de tests.
            </li>
            <li>
              <strong className="text-[var(--txt)]">
                El consentimiento:
              </strong>{" "}
              Para el envío de correos de verificación y la aceptación de
              esta política.
            </li>
            <li>
              <strong className="text-[var(--txt)]">
                El cumplimiento de una obligación legal:
              </strong>{" "}
              Para la emisión de facturas y el cumplimiento de obligaciones
              fiscales (en el caso de usuarios Premium).
            </li>
          </ul>

          <h2 className="mt-8 text-xl font-bold text-[var(--txt)]">
            4. ¿Compartimos tus datos con terceros?
          </h2>

          <p className="mt-3 leading-relaxed text-[var(--txt2)]">
            Para poder ofrecerte el servicio, OpoGen AI utiliza los servicios
            de terceros proveedores que cumplen con el RGPD:
          </p>

          <ul className="mt-3 list-disc space-y-3 pl-6 leading-relaxed text-[var(--txt2)]">
            <li>
              <strong className="text-[var(--txt)]">Stripe:</strong> Utilizado
              para procesar los pagos de las suscripciones. Stripe no
              almacena los datos de tu tarjeta en nuestros servidores, sino
              que los gestiona de forma segura.
            </li>
            <li>
              <strong className="text-[var(--txt)]">
                Proveedores de Inteligencia Artificial (DeepSeek, Groq,
                Gemini):
              </strong>{" "}
              Los textos de tus apuntes son procesados por estos modelos para
              generar las preguntas. Estos proveedores no utilizan tus datos
              para fines publicitarios ni los almacenan de forma permanente.
            </li>
            <li>
              <strong className="text-[var(--txt)]">Resend:</strong> Utilizado
              para el envío de correos electrónicos transaccionales
              (verificación, recuperación de contraseña).
            </li>
          </ul>

          <h2 className="mt-8 text-xl font-bold text-[var(--txt)]">
            5. Conservación de los datos
          </h2>

          <p className="mt-3 leading-relaxed text-[var(--txt2)]">
            Tus datos se conservarán mientras tu cuenta esté activa.
          </p>

          <p className="mt-3 leading-relaxed text-[var(--txt2)]">
            Si eres usuario Freemium y no te suscribes, tus datos y archivos
            se conservarán mientras tu cuenta esté activa.
          </p>

          <p className="mt-3 leading-relaxed text-[var(--txt2)]">
            Si tu cuenta Premium caduca y pasas a ser Freemium, tus archivos
            se conservarán durante 30 días. Pasado ese tiempo, se borrarán de
            forma automática para liberar espacio en el servidor.
          </p>

          <p className="mt-3 leading-relaxed text-[var(--txt2)]">
            Los datos de facturación se conservarán durante el tiempo exigido
            por la legislación fiscal (generalmente, 5 años).
          </p>

          <h2 className="mt-8 text-xl font-bold text-[var(--txt)]">
            6. Menores de edad y la Zona Kids
          </h2>

          <p className="mt-3 leading-relaxed text-[var(--txt2)]">
            La Zona Kids está diseñada para menores de entre 3 y 12 años. En
            cumplimiento de la LOPDGDD, si un menor se registra en la
            plataforma, se presume que cuenta con el consentimiento de sus
            padres o tutores legales. Si eres padre, madre o tutor y
            descubres que tu hijo ha proporcionado datos sin tu
            consentimiento, puedes contactarnos para solicitar su eliminación.
          </p>

          <h2 className="mt-8 text-xl font-bold text-[var(--txt)]">
            7. Tus derechos
          </h2>

          <p className="mt-3 leading-relaxed text-[var(--txt2)]">
            Como usuario, tienes derecho a:
          </p>

          <ul className="mt-3 list-disc space-y-1.5 pl-6 leading-relaxed text-[var(--txt2)]">
            <li>Acceder a tus datos personales.</li>
            <li>Rectificar los datos inexactos.</li>
            <li>Suprimir tus datos (derecho al olvido).</li>
            <li>Limitar u oponerte al tratamiento de tus datos.</li>
            <li>
              Portabilidad: solicitar una copia de tus datos en un formato
              estructurado.
            </li>
          </ul>

          <p className="mt-3 leading-relaxed text-[var(--txt2)]">
            Para ejercer cualquiera de estos derechos, puedes escribirnos a:{" "}
            <a
              href="mailto:soporte@opogenai.com"
              className="font-semibold text-[var(--azul)] underline underline-offset-4 hover:text-[var(--azul-hover)]"
            >
              soporte@opogenai.com
            </a>
            , indicando en el asunto &quot;Protección de Datos&quot;.
          </p>

          <h2 className="mt-8 text-xl font-bold text-[var(--txt)]">
            8. Seguridad de los datos
          </h2>

          <p className="mt-3 leading-relaxed text-[var(--txt2)]">
            En OpoGen AI hemos implementado medidas técnicas y organizativas
            para garantizar la seguridad de tus datos, incluyendo el cifrado
            de contraseñas con Argon2id, protección contra ataques CSRF, y
            limitación de intentos de acceso. Sin embargo, ningún sistema es
            100% seguro, por lo que te recomendamos que mantengas tu
            contraseña a salvo.
          </p>

          <h2 className="mt-8 text-xl font-bold text-[var(--txt)]">
            9. Cambios en la Política de Privacidad
          </h2>

          <p className="mt-3 leading-relaxed text-[var(--txt2)]">
            OpoGen AI se reserva el derecho a modificar esta Política de
            Privacidad para adaptarla a novedades legislativas o cambios en el
            servicio. Te recomendamos que la revises periódicamente.
          </p>
        </article>
      </section>
    </main>
  );
}
