import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Aviso Legal",
  description:
    "Información legal y datos identificativos del titular de OpoGen AI.",
};

export default function AvisoLegalPage() {
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
            Aviso Legal
          </h1>

          <p className="mt-4 text-sm text-[var(--txt3)]">
            Última actualización: 7 de noviembre de 2026
          </p>

          <p className="mt-6 text-base leading-8 text-[var(--txt2)]">
            En cumplimiento de la Ley 34/2002, de 11 de julio, de Servicios
            de la Sociedad de la Información y de Comercio Electrónico
            (LSSI-CE), se informa a las personas usuarias de los datos
            identificativos del titular de este sitio web.
          </p>

          <h2 className="mt-10 font-serif text-2xl font-medium text-[var(--azul)]">
            1. Datos identificativos del titular
          </h2>

          <ul className="mt-4 list-disc space-y-2 pl-6 text-base leading-8 text-[var(--txt2)]">
            <li>
              <strong className="text-[var(--txt)]">Titular:</strong>{" "}
              Manuel Pujante Noguera
            </li>
            <li>
              <strong className="text-[var(--txt)]">NIF:</strong>{" "}
              27457112B
            </li>
            <li>
              <strong className="text-[var(--txt)]">Domicilio:</strong>{" "}
              Calle Gracia
            </li>
            <li>
              <strong className="text-[var(--txt)]">Correo electrónico:</strong>{" "}
              <a
                href="mailto:soporte@opogenai.com"
                className="font-semibold text-[var(--azul)] underline underline-offset-4 hover:text-[var(--azul-hover)]"
              >
                soporte@opogenai.com
              </a>
            </li>
            <li>
              <strong className="text-[var(--txt)]">Dominio:</strong>{" "}
              opogenai.com
            </li>
          </ul>

          <h2 className="mt-10 font-serif text-2xl font-medium text-[var(--azul)]">
            2. Objeto de la web
          </h2>

          <p className="mt-4 text-base leading-8 text-[var(--txt2)]">
            OpoGen AI es una plataforma educativa digital que utiliza
            inteligencia artificial para generar tests, resúmenes y material
            de estudio personalizado a partir de los apuntes o temas
            facilitados por las personas usuarias.
          </p>

          <p className="mt-4 text-base leading-8 text-[var(--txt2)]">
            El acceso a la web atribuye la condición de usuario e implica la
            aceptación de este Aviso Legal, de la Política de Privacidad y
            de las condiciones de uso del servicio.
          </p>

          <h2 className="mt-10 font-serif text-2xl font-medium text-[var(--azul)]">
            3. Condiciones de acceso y uso
          </h2>

          <p className="mt-4 text-base leading-8 text-[var(--txt2)]">
            La persona usuaria se compromete a utilizar el sitio web y sus
            servicios de forma lícita, diligente y respetuosa, absteniéndose
            de realizar actividades que puedan dañar el funcionamiento de la
            plataforma, afectar a otros usuarios o vulnerar derechos de
            terceros.
          </p>

          <p className="mt-4 text-base leading-8 text-[var(--txt2)]">
            Queda prohibido el acceso automatizado no autorizado, la
            extracción masiva de contenidos, la introducción de código
            malicioso y cualquier uso que pueda comprometer la seguridad o
            disponibilidad del servicio. La persona usuaria es responsable
            de custodiar sus credenciales de acceso.
          </p>

          <h2 className="mt-10 font-serif text-2xl font-medium text-[var(--azul)]">
            4. Propiedad intelectual e industrial
          </h2>

          <p className="mt-4 text-base leading-8 text-[var(--txt2)]">
            Todos los contenidos propios de esta web —textos, diseños,
            logotipos, código fuente, estructura, imágenes y elementos
            gráficos— son titularidad de Manuel Pujante Noguera o se
            utilizan con autorización. Queda prohibida su reproducción,
            distribución, comunicación pública o transformación sin
            autorización expresa y por escrito.
          </p>

          <p className="mt-4 text-base leading-8 text-[var(--txt2)]">
            Los apuntes y archivos subidos por las personas usuarias
            pertenecen a quien los aporta. La plataforma únicamente los
            utiliza para prestar el servicio solicitado, conforme a la
            Política de Privacidad.
          </p>

          <h2 className="mt-10 font-serif text-2xl font-medium text-[var(--azul)]">
            5. Responsabilidad
          </h2>

          <p className="mt-4 text-base leading-8 text-[var(--txt2)]">
            Los tests y contenidos generados mediante inteligencia
            artificial son herramientas de apoyo al estudio y no garantizan
            la superación de exámenes oficiales ni sustituyen el criterio de
            un profesional. El titular no responde del uso que se haga de
            dichos contenidos.
          </p>

          <p className="mt-4 text-base leading-8 text-[var(--txt2)]">
            Tampoco se garantiza la disponibilidad ininterrumpida del
            servicio ni la ausencia de errores técnicos, aunque se adoptarán
            medidas razonables para restablecer el funcionamiento y
            minimizar las incidencias.
          </p>

          <h2 className="mt-10 font-serif text-2xl font-medium text-[var(--azul)]">
            6. Enlaces a terceros
          </h2>

          <p className="mt-4 text-base leading-8 text-[var(--txt2)]">
            La web puede incluir enlaces a servicios de terceros, como la
            pasarela de pago Stripe o proveedores de inteligencia
            artificial. El titular no controla dichos servicios ni asume
            responsabilidad por sus contenidos, políticas de privacidad o
            condiciones de uso.
          </p>

          <h2 className="mt-10 font-serif text-2xl font-medium text-[var(--azul)]">
            7. Protección de datos
          </h2>

          <p className="mt-4 text-base leading-8 text-[var(--txt2)]">
            El tratamiento de datos personales se rige por la{" "}
            <Link
              href="/legal/privacidad"
              className="font-semibold text-[var(--azul)] underline underline-offset-4 hover:text-[var(--azul-hover)]"
            >
              Política de Privacidad
            </Link>
            , que forma parte de este Aviso Legal.
          </p>

          <h2 className="mt-10 font-serif text-2xl font-medium text-[var(--azul)]">
            8. Cookies
          </h2>

          <p className="mt-4 text-base leading-8 text-[var(--txt2)]">
            La información sobre las cookies y tecnologías equivalentes se
            encuentra en el apartado{" "}
            <Link
              href="/legal/privacidad#cookies"
              className="font-semibold text-[var(--azul)] underline underline-offset-4 hover:text-[var(--azul-hover)]"
            >
              Cookies y almacenamiento local
            </Link>{" "}
            de la Política de Privacidad.
          </p>

          <h2 className="mt-10 font-serif text-2xl font-medium text-[var(--azul)]">
            9. Legislación aplicable y jurisdicción
          </h2>

          <p className="mt-4 text-base leading-8 text-[var(--txt2)]">
            La relación entre el titular y la persona usuaria se rige por la
            legislación española. Para la resolución de controversias, las
            partes se someten a los Juzgados y Tribunales de Albacete,
            salvo que la normativa aplicable establezca otro fuero.
          </p>

          <p className="mt-10 border-t border-[var(--th)] pt-6 text-base leading-8 text-[var(--txt2)]">
            Para cualquier consulta relacionada con este Aviso Legal, puedes
            escribir a{" "}
            <a
              href="mailto:soporte@opogenai.com"
              className="font-semibold text-[var(--azul)] underline underline-offset-4 hover:text-[var(--azul-hover)]"
            >
              soporte@opogenai.com
            </a>
            .
          </p>
        </article>
      </section>
    </main>
  );
}
