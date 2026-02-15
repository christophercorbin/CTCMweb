import type { APIGatewayProxyResult } from 'aws-lambda';
import type { ApiSuccessResponse, ApiErrorResponse } from '@ctcm/types';

/**
 * Creates a successful API response
 */
export function successResponse<T>(
  data: T,
  statusCode: number = 200
): APIGatewayProxyResult {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
    },
  };

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify(response),
  };
}

/**
 * Creates an error API response
 */
export function errorResponse(
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: Record<string, unknown>
): APIGatewayProxyResult {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code: code || getErrorCode(statusCode),
      message,
      details,
    },
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
    },
  };

  // Log error for CloudWatch
  console.error('API Error:', {
    statusCode,
    code: response.error.code,
    message,
    details,
  });

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify(response),
  };
}

/**
 * Maps status codes to error codes
 */
function getErrorCode(statusCode: number): string {
  const codeMap: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'VALIDATION_ERROR',
    500: 'INTERNAL_SERVER_ERROR',
    503: 'SERVICE_UNAVAILABLE',
  };

  return codeMap[statusCode] || 'UNKNOWN_ERROR';
}

/**
 * Generates a unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Handles errors and returns appropriate response
 */
export function handleError(error: unknown): APIGatewayProxyResult {
  console.error('Handler error:', error);

  // Handle known error types
  if (error instanceof Error && error.message) {
    if (error.message.includes('not found') || error.message.includes('Not found')) {
      return errorResponse(error.message, 404);
    }
    if (error.message.includes('Unauthorized') || error.message.includes('Authentication')) {
      return errorResponse(error.message, 401);
    }
    if (error.message.includes('Admin') || error.message.includes('Access denied')) {
      return errorResponse(error.message, 403);
    }
    if (error.message.includes('already in use') || error.message.includes('duplicate')) {
      return errorResponse(error.message, 409);
    }
    if (
      error.message.includes('Invalid') ||
      error.message.includes('required') ||
      error.message.includes('cannot be empty')
    ) {
      return errorResponse(error.message, 422);
    }
  }

  // Default to 500 for unknown errors
  return errorResponse('An unexpected error occurred', 500);
}
