export interface IApiResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  data: T;
  message?: string;
  timestamp: string;
  path?: string;
}
