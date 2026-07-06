export function logApiError(context: string, error: unknown, metadata?: Record<string, unknown>) {
  const errorObj = {
    level: 'error',
    context,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    metadata,
    timestamp: new Date().toISOString(),
    // Supabase errors are often POJOs with code, details, hint
    ...(typeof error === 'object' && error !== null ? { rawError: error } : {})
  };
  
  console.error(JSON.stringify(errorObj, null, 2));
}

export function logApiInfo(context: string, message: string, metadata?: Record<string, unknown>) {
  console.log(JSON.stringify({
    level: 'info',
    context,
    message,
    metadata,
    timestamp: new Date().toISOString()
  }));
}
