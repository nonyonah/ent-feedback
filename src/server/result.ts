import "server-only";

import { ZodError } from "zod";

export const errorCodes = [
  "validation",
  "unauthenticated",
  "forbidden",
  "not_found",
  "conflict",
  "rate_limited",
  "retryable",
  "internal",
] as const;

export type ErrorCode = (typeof errorCodes)[number];

export type FieldErrors = Record<string, string[]>;

export type AppError = {
  code: ErrorCode;
  message: string;
  retryable: boolean;
  fieldErrors?: FieldErrors;
  details?: Record<string, unknown>;
};

export const httpStatusByErrorCode: Record<ErrorCode, number> = {
  validation: 400,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  retryable: 503,
  internal: 500,
};

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: AppError };

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function fail<T = never>(error: AppError): Result<T> {
  return { ok: false, error };
}

export class ServiceError extends Error {
  readonly code: ErrorCode;
  readonly retryable: boolean;
  readonly fieldErrors?: FieldErrors;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    options?: {
      retryable?: boolean;
      fieldErrors?: FieldErrors;
      details?: Record<string, unknown>;
      cause?: unknown;
    },
  ) {
    super(message, { cause: options?.cause });
    this.name = "ServiceError";
    this.code = code;
    this.retryable = options?.retryable ?? code === "retryable";
    this.fieldErrors = options?.fieldErrors;
    this.details = options?.details;
  }
}

export function validationError(message: string, fieldErrors?: FieldErrors): ServiceError {
  return new ServiceError("validation", message, { fieldErrors });
}

export function fromZodError(error: ZodError): ServiceError {
  const fieldErrors: FieldErrors = {};

  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
  }

  return new ServiceError("validation", "The submitted data is invalid.", { fieldErrors });
}

export function isAppError(error: unknown): error is AppError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    errorCodes.includes((error as { code: ErrorCode }).code)
  );
}

export function toAppError(error: unknown): AppError {
  if (error instanceof ServiceError) {
    return {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      fieldErrors: error.fieldErrors,
      details: error.details,
    };
  }

  if (error instanceof ZodError) {
    return toAppError(fromZodError(error));
  }

  if (isAppError(error)) {
    return error;
  }

  console.error("Unhandled service error", error);

  return {
    code: "internal",
    message: "Something went wrong. Please try again.",
    retryable: true,
  };
}

export async function runService<T>(operation: () => Promise<T>): Promise<Result<T>> {
  try {
    return ok(await operation());
  } catch (error) {
    return fail(toAppError(error));
  }
}

export function toResponse<T>(result: Result<T>): Response {
  if (result.ok) {
    return Response.json({ ok: true, data: result.data });
  }

  return Response.json(
    {
      ok: false,
      error: {
        code: result.error.code,
        message: result.error.message,
        retryable: result.error.retryable,
        fieldErrors: result.error.fieldErrors,
        details: result.error.details,
      },
    },
    { status: httpStatusByErrorCode[result.error.code] },
  );
}
