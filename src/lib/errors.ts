// Erros de domínio com código estável; a UI traduz para mensagens em pt-BR.
export type AppErrorCode =
  | "not_found"
  | "forbidden"
  | "conflict"
  | "validation"
  | "pending_confirmation"
  | "invalid_state";

export class AppError extends Error {
  constructor(
    readonly code: AppErrorCode,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const notFound = () => new AppError("not_found", "Registro não encontrado.");
export const forbidden = () => new AppError("forbidden", "Você não tem permissão para esta ação.");
