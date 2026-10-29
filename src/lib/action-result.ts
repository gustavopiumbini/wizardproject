import { AppError } from "./errors";
import { logger } from "./logger";

export type ActionState = {
  status: "idle" | "ok" | "error" | "pending_confirmation";
  message?: string;
  pending?: number;
  version?: number;
  savedAt?: string;
};

export const idleState: ActionState = { status: "idle" };

/** Converte erro em estado para a UI sem vazar detalhes internos. */
export function toErrorState(error: unknown): ActionState {
  if (error instanceof AppError) {
    if (error.code === "pending_confirmation") {
      const pending = Number(error.details?.pending ?? 0);
      return { status: "pending_confirmation", pending, message: error.message };
    }
    return { status: "error", message: error.message };
  }
  logger.error("action.failed", { error });
  return { status: "error", message: "Não foi possível concluir. Tente novamente." };
}
