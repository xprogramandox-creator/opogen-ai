export const MAX_PREGUNTAS_INVITADO = 5;
export const MAX_GENERACIONES_INVITADO = 3;
export const MENSAJE_LIMITE_INVITADO =
  "Has agotado tus 3 generaciones de invitado por hoy. Regístrate o inicia sesión para seguir generando tests.";

export type LimiteInvitadoPublico = {
  usos: number;
  restantes: number;
  maximo: number;
  agotado: boolean;
  mensaje: string;
};
