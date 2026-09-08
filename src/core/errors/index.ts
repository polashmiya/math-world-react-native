/**
 * Domain-wide error hierarchy (spec §54).
 * Every layer throws one of these so the UI can degrade gracefully instead of crashing.
 */
export class DomainError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.details = details;
    // Required so `instanceof` keeps working after TS downlevel compilation.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class DatabaseError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('DATABASE_ERROR', message, details);
  }
}

export class MigrationError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('MIGRATION_ERROR', message, details);
  }
}

export class ContentError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('CONTENT_ERROR', message, details);
  }
}

export class ValidationError extends DomainError {
  readonly issues: string[];
  constructor(message: string, issues: string[] = []) {
    super('VALIDATION_ERROR', message, { issues });
    this.issues = issues;
  }
}

export class QuestionGenerationError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('QUESTION_GENERATION_ERROR', message, details);
  }
}

export class MathError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('MATH_ERROR', message, details);
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id: string) {
    super('NOT_FOUND', entity + ' not found: ' + id, { entity, id });
  }
}

/** Runs `fn`, converting anything thrown into a `DomainError` subclass. */
export async function guard<T>(
  fn: () => Promise<T>,
  wrap: (e: unknown) => DomainError,
): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof DomainError) throw e;
    throw wrap(e);
  }
}
