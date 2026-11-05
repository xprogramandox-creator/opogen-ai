import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import {
  obtenerPagosPorRango,
  redondearMoneda,
  registrarLog,
  sincronizarUsuarios,
  usuariosParaExportar,
} from "@/lib/admin-db";
import {
  exigirAdminPanel,
  limitarAccionAdmin,
  respuestaCsrfInvalida,
  verificarCsrfAdmin,
} from "@/lib/admin-panel-auth";
import { etiquetaTipoDocumento } from "@/lib/validacion";

type Filtros = {
  desde?: string;
  hasta?: string;
  tipo?: string;
  plan?: string;
  estado?: string;
};

function fechaCorta(iso: string | null): string {
  return formatearFecha(iso);
}

const FORMATO_FECHA_ES = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function formatearFecha(valor: string | null | undefined): string {
  if (!valor) return "—";

  const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor);

  if (partes) {
    return `${partes[3]}/${partes[2]}/${partes[1]}`;
  }

  const fecha = new Date(valor);

  return Number.isNaN(fecha.getTime())
    ? "—"
    : FORMATO_FECHA_ES.format(fecha);
}

function dinero(valor: number): string {
  return `${redondearMoneda(valor).toFixed(2).replace(".", ",")} €`;
}

export async function POST(request: Request) {
  const acceso = await exigirAdminPanel(request);
  if (acceso instanceof NextResponse) return acceso;

  if (!(await verificarCsrfAdmin(request))) {
    return respuestaCsrfInvalida();
  }

  if (!limitarAccionAdmin(request, "exportar")) {
    return NextResponse.json(
      { error: "Demasiadas exportaciones. Espera un minuto." },
      { status: 429 },
    );
  }

  const cuerpo: unknown = await request.json().catch(() => null);
  const datos = (cuerpo || {}) as {
    campos?: unknown;
    filtros?: unknown;
    plantilla?: unknown;
  };
  const campos = Array.isArray(datos.campos)
    ? datos.campos.filter(
        (campo): campo is string => typeof campo === "string",
      )
    : [];
  const filtros = (datos.filtros || {}) as Filtros;
  const plantilla = datos.plantilla === "hacienda";

  await sincronizarUsuarios();
  const usuarios = usuariosParaExportar();
  const usuariosPorClave = new Map(
    usuarios.map((usuario) => [usuario.clave, usuario]),
  );
  const tipo =
    filtros.tipo === "freemium" || filtros.tipo === "premium"
      ? filtros.tipo
      : undefined;
  const pagos = obtenerPagosPorRango({
    desde: filtros.desde,
    hasta: filtros.hasta,
    tipo,
    plan: filtros.plan,
    estado: filtros.estado,
    incluirCero: false,
    contexto: "facturacion",
  });
  const filas = pagos.flatMap((pago) => {
    const usuario = usuariosPorClave.get(pago.usuarioClave);
    return usuario ? [{ pago, usuario }] : [];
  });

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  let y = 18;

  const nuevaPagina = () => {
    doc.addPage();
    y = 18;
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(
    plantilla
      ? "Datos para Hacienda · OpoGen AI"
      : "Informe de usuarios y facturación · OpoGen AI",
    margin,
    y,
  );
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(
    `Generado: ${formatearFecha(new Date().toISOString())} · Moneda: EUR · Filtros: ${
      Object.entries(filtros)
        .filter(([, valor]) => Boolean(valor))
        .map(([clave, valor]) =>
          clave === "desde" || clave === "hasta"
            ? `${clave}=${formatearFecha(String(valor))}`
            : `${clave}=${valor}`,
        )
        .join(", ") || "ninguno"
    }`,
    margin,
    y,
  );
  y += 5;

  const columnas: Array<{ id: string; titulo: string; ancho: number }> = [
    { id: "usuario", titulo: "Usuario", ancho: 48 },
    { id: "datos", titulo: "Datos personales", ancho: 62 },
    { id: "plan", titulo: "Plan", ancho: 24 },
    { id: "precio", titulo: "Base", ancho: 22 },
    { id: "iva", titulo: "IVA", ancho: 20 },
    { id: "total", titulo: "Total", ancho: 24 },
    { id: "fechas", titulo: "Pago / Caducidad", ancho: 42 },
    { id: "uso", titulo: "Uso", ancho: 28 },
  ].filter((columna) => {
    if (columna.id === "usuario") return true;

    // La plantilla de Hacienda incluye siempre el desglose fiscal completo.
    if (
      plantilla &&
      ["datos", "plan", "precio", "iva", "total", "fechas"].includes(
        columna.id,
      )
    ) {
      return true;
    }

    if (columna.id === "datos") return campos.includes("datosPersonales");
    if (columna.id === "plan") return campos.includes("plan");
    if (columna.id === "precio") return campos.includes("precio");
    if (columna.id === "iva") return campos.includes("iva");
    if (columna.id === "total") return campos.includes("total");
    if (columna.id === "fechas") return campos.includes("fechas");
    if (columna.id === "uso") return campos.includes("zonaUso");
    return true;
  });

  const dibujarCabecera = () => {
    doc.setFillColor(30, 64, 175);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    let x = margin;
    for (const columna of columnas) {
      doc.rect(x, y - 4, columna.ancho, 7, "F");
      doc.text(columna.titulo, x + 1.5, y + 0.5);
      x += columna.ancho;
    }
    doc.setTextColor(30, 30, 30);
    y += 8;
  };

  dibujarCabecera();

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);

  for (const { pago, usuario } of filas) {
    if (y > pageHeight - 22) {
      nuevaPagina();
      dibujarCabecera();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
    }

    const nombreCompleto =
      usuario.nombreCompleto ||
      `${usuario.nombre} ${usuario.apellidos}`.trim();
    const documentoIdentidad = usuario.documentoIdentidad || "";
    const etiquetaDocumento = etiquetaTipoDocumento(
      usuario.tipoDocumento,
    );
    const datosPersonales = documentoIdentidad
      ? `${nombreCompleto}\n${etiquetaDocumento}: ${documentoIdentidad}`
      : nombreCompleto;

    const valores: Record<string, string> = {
      usuario: usuario.clave,
      datos: datosPersonales,
      plan: pago.plan || (usuario.rol === "freemium" ? "Free" : usuario.plan),
      precio: dinero(pago.precioBase),
      iva: dinero(pago.iva),
      total: dinero(pago.total),
      fechas: `${fechaCorta(pago.fecha)} / ${
        usuario.plan === "ilimitado"
          ? "Sin límite"
          : fechaCorta(usuario.fechaCaducidad)
      }`,
      uso: usuario.estado,
    };

    const altura = Math.max(
      8,
      ...columnas.map((columna) =>
        doc.splitTextToSize(valores[columna.id] || "—", columna.ancho - 3)
          .length * 3.5,
      ),
    );

    if (y + altura > pageHeight - 15) {
      nuevaPagina();
      dibujarCabecera();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
    }

    let x = margin;
    for (const columna of columnas) {
      doc.rect(x, y - 4, columna.ancho, altura, "S");
      doc.text(
        doc.splitTextToSize(valores[columna.id] || "—", columna.ancho - 3),
        x + 1.5,
        y,
      );
      x += columna.ancho;
    }
    y += altura + 1;
  }

  const totalBase = redondearMoneda(
    pagos.reduce((suma, pago) => suma + pago.precioBase, 0),
  );
  const totalIva = redondearMoneda(
    pagos.reduce((suma, pago) => suma + pago.iva, 0),
  );
  const total = redondearMoneda(
    pagos.reduce((suma, pago) => suma + pago.total, 0),
  );

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(
    `Totales fiscales · Base imponible: ${dinero(totalBase)} · IVA: ${dinero(
      totalIva,
    )} · Total: ${dinero(total)}`,
    margin,
    y,
  );
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(
    `Pagos incluidos: ${pagos.length} · Documento generado por el panel de administración.`,
    margin,
    y,
  );

  const paginas = doc.getNumberOfPages();
  for (let pagina = 1; pagina <= paginas; pagina += 1) {
    doc.setPage(pagina);
    doc.setFontSize(7);
    doc.text(
      `Página ${pagina} de ${paginas}`,
      pageWidth - margin,
      pageHeight - 6,
      { align: "right" },
    );
  }

  registrarLog(
    acceso.admin.clave,
    plantilla ? "Exportar PDF Hacienda" : "Exportar PDF panel",
    JSON.stringify({ campos, filtros }),
    acceso.ip,
  );

  return new NextResponse(Buffer.from(doc.output("arraybuffer")), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="opogen-informe.pdf"',
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    },
  });
}
