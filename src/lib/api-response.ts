import { NextResponse } from "next/server";

/**
 * Standardized API response format.
 * All endpoints return: { success: boolean, message: string, data?: object }
 */

interface ApiSuccessResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
}

interface ApiErrorResponse {
  success: false;
  message: string;
  data?: undefined;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Return a success JSON response.
 */
export function successResponse<T>(
  data: T,
  message = "Success",
  status = 200
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    { success: true, message, data },
    { status }
  );
}

/**
 * Return an error JSON response.
 */
export function errorResponse(
  message: string,
  status = 400
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}
