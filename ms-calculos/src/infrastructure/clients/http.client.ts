import axios, { AxiosError } from 'axios';

export interface HttpClientOptions {
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  retryOnNetworkError?: boolean;
  retryOnStatusCodes?: number[];
}

export class HttpClient {
  private client;
  private options: HttpClientOptions;

  constructor(baseURL: string, options: HttpClientOptions = {}) {
    const {
      timeout = 5000,
      maxRetries = 3,
      retryDelay = 1000,
      retryOnNetworkError = true,
      retryOnStatusCodes = [502, 503, 504, 429]
    } = options;
    
    this.options = { timeout, maxRetries, retryDelay, retryOnNetworkError, retryOnStatusCodes };
    
    this.client = axios.create({
      baseURL,
      timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private async requestWithRetry<T>(
    requestFn: () => Promise<T>,
    context: string
  ): Promise<T> {
    const { 
      maxRetries = 3, 
      retryDelay = 1000, 
      retryOnNetworkError = true, 
      retryOnStatusCodes = [502, 503, 504, 429] 
    } = this.options;
    
    let lastError: Error | AxiosError | null = null;
    
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        return await requestFn();
      } catch (error: any) {
        lastError = error;
        const isAxiosError = error.isAxiosError === true;
        const statusCode = error.response?.status;
        const isNetworkError = !isAxiosError || error.code === 'ECONNABORTED' || error.code === 'ECONNRESET';
        const isRetryableStatusCode = statusCode && retryOnStatusCodes.includes(statusCode);
        
        // Decidir si reintentar
        const shouldRetry = attempt <= maxRetries && 
          (isNetworkError && retryOnNetworkError || isRetryableStatusCode);
        
        if (shouldRetry) {
          console.warn(`[HttpClient.requestWithRetry] ${context} - Intento ${attempt}/${maxRetries} fallido. Reintentando en ${retryDelay}ms. Error: ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt)); // backoff lineal
          continue;
        }
        break;
      }
    }
    
    // Si llegamos aquí, todos los reintentos fallaron
    console.error(`[HttpClient.requestWithRetry] ${context} - Todos los ${maxRetries} reintentos fallaron. Último error:`, lastError?.message);
    throw lastError;
  }

   async get<T>(path: string, headers?: Record<string, string>): Promise<T> {
     console.log(`[HttpClient.get] ${this.client.defaults.baseURL}${path}`);
     return this.requestWithRetry<T>(
       async () => {
         const config = headers ? { headers } : {};
         const response = await this.client.get<T>(path, config);
         console.log(`[HttpClient.get] Respuesta recibida: ${response.status} ${response.statusText}`);
         return response.data;
       },
       `GET ${path}`
     );
   }

   async post<T>(path: string, data: unknown, headers?: Record<string, string>): Promise<T> {
     console.log(`[HttpClient.post] ${this.client.defaults.baseURL}${path}`, JSON.stringify(data).substring(0, 200));
     return this.requestWithRetry<T>(
       async () => {
         const config = headers ? { headers } : {};
         const response = await this.client.post<T>(path, data, config);
         console.log(`[HttpClient.post] Respuesta recibida: ${response.status} ${response.statusText}`);
         return response.data;
       },
       `POST ${path}`
     );
   }

   async put<T>(path: string, data: unknown, headers?: Record<string, string>): Promise<T> {
     console.log(`[HttpClient.put] ${this.client.defaults.baseURL}${path}`, JSON.stringify(data).substring(0, 200));
     return this.requestWithRetry<T>(
       async () => {
         const config = headers ? { headers } : {};
         const response = await this.client.put<T>(path, data, config);
         console.log(`[HttpClient.put] Respuesta recibida: ${response.status} ${response.statusText}`);
         return response.data;
       },
       `PUT ${path}`
     );
   }

   async delete<T>(path: string, headers?: Record<string, string>): Promise<T> {
     console.log(`[HttpClient.delete] ${this.client.defaults.baseURL}${path}`);
     return this.requestWithRetry<T>(
       async () => {
         const config = headers ? { headers } : {};
         const response = await this.client.delete<T>(path, config);
         console.log(`[HttpClient.delete] Respuesta recibida: ${response.status} ${response.statusText}`);
         return response.data;
       },
       `DELETE ${path}`
     );
   }
}