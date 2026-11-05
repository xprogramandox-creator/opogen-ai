import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Aviso Legal",
  description:
    "Información legal y datos identificativos del titular de OpoGen AI.",
};

export default function AvisoLegalPage() {
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
            Aviso Legal
          </h1>

          <p className="mt-5 leading-relaxed text-[var(--txt2)]">
            En cumplimiento de lo dispuesto en la Ley 34/2002, de 11 de
            julio, de Servicios de la Sociedad de la Información y de
            Comercio Electrónico (LSSI-CE), se informa a los usuarios de los
            datos identificativos del titular de este sitio web:
          </p>

          <h2 className="mt-8 text-xl font-bold text-[var(--txt)]">
            Datos del Titular
          </h2>

          <ul className="mt-3 list-disc space-y-1.5 pl-6 leading-relaxed text-[var(--txt2)]">
            <li>
              <strong className="text-[var(--txt)]">Titular:</strong> opogenai
            </li>
            <li>
              <strong className="text-[var(--txt)]">NIF / CIF:</strong>{" "}
              27457112B
            </li>
            <li>
              <strong className="text-[var(--txt)]">
                Domicilio fiscal:
              </strong>{" "}
              Calle Gracia 20 4ºB 02005 Albacete
            </li>
            <li>
              <strong className="text-[var(--txt)]">
                Correo electrónico de contacto:
              </strong>{" "}
              soporte@opogenai.com
            </li>
            <li>
              <strong className="text-[var(--txt)]">
                Nombre del dominio:
              </strong>{" "}
              opogenai.com
            </li>
          </ul>

          <h2 className="mt-8 text-xl font-bold text-[var(--txt)]">
            Objeto de la Web
          </h2>

          <p className="mt-3 leading-relaxed text-[var(--txt2)]">
            OpoGen AI es una plataforma educativa digital que utiliza
            inteligencia artificial para generar tests y exámenes
            personalizados a partir de los apuntes subidos por los usuarios o
            de temas escritos libremente.
          </p>

          <p className="mt-3 leading-relaxed text-[var(--txt2)]">
            El acceso a la web atribuye la condición de usuario e implica la
            aceptación plena y sin reservas de todas y cada una de las
            disposiciones incluidas en este Aviso Legal, así como en la
            Política de Privacidad.
          </p>

          <h2 className="mt-8 text-xl font-bold text-[var(--txt)]">
            Propiedad Intelectual e Industrial
          </h2>

          <p className="mt-3 leading-relaxed text-[var(--txt2)]">
            Todos los contenidos de esta página web (textos, imágenes,
            logotipos, código fuente, diseño gráfico, etc.) son propiedad
            exclusiva del titular o de terceros que han autorizado su uso.
            Queda terminantemente prohibida la reproducción, distribución,
            comunicación pública o transformación de dichos contenidos sin la
            autorización expresa y por escrito del titular.
          </p>

          <h2 className="mt-8 text-xl font-bold text-[var(--txt)]">
            Exención de Responsabilidad
          </h2>

          <p className="mt-3 leading-relaxed text-[var(--txt2)]">
            El titular no se hace responsable del mal uso que los usuarios
            puedan hacer de los contenidos generados por la inteligencia
            artificial. Los exámenes generados son herramientas de estudio y
            no garantizan la superación de ninguna prueba oficial.
          </p>

          <p className="mt-3 leading-relaxed text-[var(--txt2)]">
            Tampoco nos hacemos responsables de las interrupciones del
            servicio, errores técnicos o fallos en la red que puedan impedir
            el acceso a la plataforma.
          </p>

          <h2 className="mt-8 text-xl font-bold text-[var(--txt)]">
            Enlaces a Terceros
          </h2>

          <p className="mt-3 leading-relaxed text-[var(--txt2)]">
            Esta web puede contener enlaces a sitios web de terceros (como
            pasarelas de pago o servicios de IA). El titular no asume ninguna
            responsabilidad sobre el contenido o las políticas de privacidad
            de dichos sitios externos.
          </p>

          <h2 className="mt-8 text-xl font-bold text-[var(--txt)]">
            Legislación Aplicable y Jurisdicción
          </h2>

          <p className="mt-3 leading-relaxed text-[var(--txt2)]">
            La relación entre el titular y el usuario se regirá por la
            normativa española vigente. Para la resolución de cualquier
            controversia, las partes se someterán a los Juzgados y Tribunales
            de Albacete, renunciando a cualquier otro fuero que pudiera
            corresponderles.
          </p>
        </article>
      </section>
    </main>
  );
}
