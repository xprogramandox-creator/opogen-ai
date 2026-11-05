import { NextResponse } from "next/server";
import { exigirAdminPanel } from "@/lib/admin-panel-auth";

type SaldoMoneda = {
  moneda: string;
  saldo: number;
};

type EstadoDeepSeek = {
  disponible: boolean;
  saldo?: number;
  moneda?: string;
  saldos?: SaldoMoneda[];
  codigo?: string;
  error?: string;
  actualizadoEn?: string;
};

type EstadoGemini = {
  estado: "ok" | "error";
  detalle?: string;
};

const TIMEOUT_MS = 8_000;
const TASA_USD_EUR_POR_DEFECTO = 0.92;

function obtenerTasaUsdEur(): number {
  const valor = Number(process.env.USD_TO_EUR_RATE);

  return Number.isFinite(valor) && valor > 0
    ? valor
    : TASA_USD_EUR_POR_DEFECTO;
}

function convertirSaldoAMonedaLocal(
  saldos: SaldoMoneda[],
): SaldoMoneda[] {
  const tasa = obtenerTasaUsdEur();

  return saldos.map((item) => {
    if (item.moneda.toUpperCase() !== "USD") {
      return item;
    }

    return {
      moneda: "EUR",
      saldo: Math.round(item.saldo * tasa * 100) / 100,
    };
  });
}

function errorControlado(codigo: string, error: string) {
  return { codigo, error };
}

async function consultarDeepSeek(): Promise<EstadoDeepSeek> {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();

  if (!apiKey) {
    return {
      disponible: false,
      ...errorControlado("NO_CONFIGURADA", "DeepSeek no está configurado."),
      actualizadoEn: new Date().toISOString(),
    };
  }

  try {
    const respuesta = await fetch("https://api.deepseek.com/user/balance", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!respuesta.ok) {
      return {
        disponible: false,
        ...errorControlado(
          "ERROR_API",
          `DeepSeek respondió con el código ${respuesta.status}.`,
        ),
        actualizadoEn: new Date().toISOString(),
      };
    }

    const datos = (await respuesta.json()) as {
      balance_infos?: Array<{
        currency?: unknown;
        total_balance?: unknown;
      }>;
    };

    const saldos: SaldoMoneda[] = [];

    for (const info of datos.balance_infos ?? []) {
      const moneda =
        typeof info.currency === "string" && info.currency.trim()
          ? info.currency.trim()
          : "";
      const saldo = Number(info.total_balance);

      if (moneda && Number.isFinite(saldo)) {
        saldos.push({ moneda, saldo });
      }
    }

    if (saldos.length === 0) {
      return {
        disponible: false,
        ...errorControlado(
          "ERROR_API",
          "DeepSeek no devolvió un saldo válido.",
        ),
        actualizadoEn: new Date().toISOString(),
      };
    }

    const saldosConvertidos = convertirSaldoAMonedaLocal(saldos);

    return {
      disponible: true,
      saldo: saldosConvertidos[0].saldo,
      moneda: saldosConvertidos[0].moneda,
      saldos: saldosConvertidos,
      actualizadoEn: new Date().toISOString(),
    };
  } catch (error) {
    return {
      disponible: false,
      ...errorControlado(
        "ERROR_API",
        error instanceof Error && error.name === "TimeoutError"
          ? "La consulta a DeepSeek ha agotado el tiempo de espera."
          : "No se pudo conectar con DeepSeek.",
      ),
      actualizadoEn: new Date().toISOString(),
    };
  }
}

async function consultarGemini(): Promise<EstadoGemini> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    return { estado: "error", detalle: "NO_CONFIGURADA" };
  }

  try {
    const respuesta = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1",
      {
        headers: {
          "x-goog-api-key": apiKey,
          Accept: "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );

    if (!respuesta.ok) {
      return {
        estado: "error",
        detalle:
          respuesta.status === 429
            ? "LIMITE_EXCEDIDO"
            : `HTTP_${respuesta.status}`,
      };
    }

    return { estado: "ok" };
  } catch (error) {
    return {
      estado: "error",
      detalle:
        error instanceof Error && error.name === "TimeoutError"
          ? "TIMEOUT"
          : "ERROR_RED",
    };
  }
}

export async function GET(request: Request) {
  const acceso = await exigirAdminPanel(request);

  if (acceso instanceof NextResponse) {
    return acceso;
  }

  const [deepseek, gemini] = await Promise.all([
    consultarDeepSeek(),
    consultarGemini(),
  ]);

  return NextResponse.json(
    {
      deepseek,
      gemini,
      actualizadoEn: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
