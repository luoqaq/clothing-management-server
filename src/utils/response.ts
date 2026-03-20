export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface PaginatedResponse<T = any> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export function success<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
  };
}

export function successPaginated<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number
): ApiResponse<PaginatedResponse<T>> {
  return {
    success: true,
    data: {
      items,
      total,
      page,
      pageSize,
    },
  };
}

export function error(message: string): ApiResponse {
  return {
    success: false,
    message,
  };
}
