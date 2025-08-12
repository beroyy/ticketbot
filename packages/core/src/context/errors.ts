export class ContextError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = "ContextError";
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ContextNotFoundError extends ContextError {
  constructor(contextType: string) {
    super(
      `No ${contextType} context found. Ensure you're running within the appropriate context provider.`,
      "CONTEXT_NOT_FOUND"
    );
    this.name = "ContextNotFoundError";
  }
}

export class PermissionDeniedError extends ContextError {
  constructor(requiredPermission: string, actorType?: string) {
    const message = actorType
      ? `${actorType} does not have required permission: ${requiredPermission}`
      : `Insufficient permissions: ${requiredPermission}`;
    super(message, "PERMISSION_DENIED");
    this.name = "PermissionDeniedError";
  }
}

export class TransactionError extends ContextError {
  constructor(message: string) {
    super(message, "TRANSACTION_ERROR");
    this.name = "TransactionError";
  }
}

export class ActorValidationError extends ContextError {
  constructor(message: string) {
    super(message, "ACTOR_VALIDATION_ERROR");
    this.name = "ActorValidationError";
  }
}

export class VisibleError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "VisibleError";
    Error.captureStackTrace(this, this.constructor);
  }
}
