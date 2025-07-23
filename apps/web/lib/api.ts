import { env } from "../env";

export class ApiClient {
  private baseURL: string;

  constructor(baseURL?: string) {
    // Use provided URL or get from validated environment with fallback
    this.baseURL = baseURL || env.client.NEXT_PUBLIC_API_URL || "http://localhost:4001";
  }

  async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options?.headers ? (options.headers as Record<string, string>) : {}),
    };

    try {
      const response = await fetch(url, {
        ...options,
        credentials: "include", // Always include cookies
        mode: "cors", // Explicitly set CORS mode
        headers,
      });

      if (!response.ok) {
        let errorMessage = `API request failed: ${String(response.status)} ${response.statusText}`;

        // Try to get more detailed error message from response
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // If parsing fails, use the default message
        }

        throw new Error(errorMessage);
      }

      return (await response.json()) as T;
    } catch (error) {
      // Handle CORS errors specifically
      if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
        console.error("CORS error or network failure:", error);
        throw new Error(
          "Unable to connect to the API server. Please check your connection and try again."
        );
      }
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    const options: RequestInit = { method: "POST" };
    if (data) {
      options.body = JSON.stringify(data);
    }
    return this.request<T>(endpoint, options);
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    const options: RequestInit = { method: "PUT" };
    if (data) {
      options.body = JSON.stringify(data);
    }
    return this.request<T>(endpoint, options);
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    const options: RequestInit = { method: "PATCH" };
    if (data) {
      options.body = JSON.stringify(data);
    }
    return this.request<T>(endpoint, options);
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

export const apiClient = new ApiClient();
