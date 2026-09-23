export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const notFound = (message = 'Resource not found') => new HttpError(404, message);
export const forbidden = (message = 'You do not have permission to perform this action') => new HttpError(403, message);

export function errorHandler(error, request, response, _next) {
  if (error?.name === 'ZodError') {
    return response.status(400).json({
      error: 'Validation failed',
      details: error.issues.map(({ path, message }) => ({ field: path.join('.'), message }))
    });
  }
  if (error?.code === '23505') return response.status(409).json({ error: 'A record with that value already exists' });
  if (error?.code === '23503') return response.status(400).json({ error: 'A referenced record does not exist' });
  if (error instanceof HttpError) return response.status(error.status).json({ error: error.message, details: error.details });

  console.error('Unhandled request error', { method: request.method, path: request.path, error });
  return response.status(500).json({ error: 'An unexpected error occurred' });
}

