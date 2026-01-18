import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { ServiceEndpoint } from '../../config/app.config';
import { logger } from '../logging/logger';

export class HttpClient {
  private clients: Map<string, AxiosInstance> = new Map();

  constructor(private services: { [key: string]: ServiceEndpoint }) {
    this.initializeClients();
  }

  private initializeClients(): void {
    for (const [serviceName, config] of Object.entries(this.services)) {
      const client = axios.create({
        baseURL: config.url,
        timeout: config.timeout,
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Request': 'query-gateway'
        }
      });

      // Interceptor de request
      client.interceptors.request.use(
        (config) => {
          logger.debug(`Sending request to ${serviceName}: ${config.method?.toUpperCase()} ${config.url}`, {
            service: serviceName,
            method: config.method,
            url: config.url,
            timestamp: new Date().toISOString()
          });
          return config;
        },
        (error) => {
          logger.error(`Request error to ${serviceName}:`, {
            service: serviceName,
            error: error.message,
            timestamp: new Date().toISOString()
          });
          return Promise.reject(error);
        }
      );

      // Interceptor de response
      client.interceptors.response.use(
        (response) => {
          logger.debug(`Response from ${serviceName}: ${response.status}`, {
            service: serviceName,
            status: response.status,
            url: response.config.url,
            timestamp: new Date().toISOString()
          });
          return response;
        },
        (error) => {
          logger.error(`Response error from ${serviceName}:`, {
            service: serviceName,
            error: error.message,
            status: error.response?.status,
            url: error.config?.url,
            timestamp: new Date().toISOString()
          });
          return Promise.reject(error);
        }
      );

      this.clients.set(serviceName, client);
    }
  }

  async get<T>(serviceName: string, endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    const client = this.clients.get(serviceName);
    if (!client) {
      throw new Error(`Service ${serviceName} not configured`);
    }

    try {
      const response = await client.get<T>(endpoint, config);
      return response.data;
    } catch (error: any) {
      logger.error(`GET failed for ${serviceName}${endpoint}:`, {
        service: serviceName,
        endpoint,
        error: error.message,
        status: error.response?.status,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  async post<T>(serviceName: string, endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const client = this.clients.get(serviceName);
    if (!client) {
      throw new Error(`Service ${serviceName} not configured`);
    }

    try {
      const response = await client.post<T>(endpoint, data, config);
      return response.data;
    } catch (error: any) {
      logger.error(`POST failed for ${serviceName}${endpoint}:`, {
        service: serviceName,
        endpoint,
        error: error.message,
        status: error.response?.status,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  async put<T>(serviceName: string, endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const client = this.clients.get(serviceName);
    if (!client) {
      throw new Error(`Service ${serviceName} not configured`);
    }

    try {
      const response = await client.put<T>(endpoint, data, config);
      return response.data;
    } catch (error: any) {
      logger.error(`PUT failed for ${serviceName}${endpoint}:`, {
        service: serviceName,
        endpoint,
        error: error.message,
        status: error.response?.status,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  async delete<T>(serviceName: string, endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    const client = this.clients.get(serviceName);
    if (!client) {
      throw new Error(`Service ${serviceName} not configured`);
    }

    try {
      const response = await client.delete<T>(endpoint, config);
      return response.data;
    } catch (error: any) {
      logger.error(`DELETE failed for ${serviceName}${endpoint}:`, {
        service: serviceName,
        endpoint,
        error: error.message,
        status: error.response?.status,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  async request<T>(serviceName: string, config: AxiosRequestConfig): Promise<T> {
    const client = this.clients.get(serviceName);
    if (!client) {
      throw new Error(`Service ${serviceName} not configured`);
    }

    try {
      const response = await client.request<T>(config);
      return response.data;
    } catch (error: any) {
      logger.error(`Request failed for ${serviceName}:`, {
        service: serviceName,
        config,
        error: error.message,
        status: error.response?.status,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  async parallelRequests<T>(requests: Array<{
    service: string;
    endpoint: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    data?: any;
  }>): Promise<Array<{ service: string; data: T; error?: Error }>> {
    const promises = requests.map(async (req) => {
      try {
        let data;
        switch (req.method || 'GET') {
          case 'GET':
            data = await this.get<T>(req.service, req.endpoint);
            break;
          case 'POST':
            data = await this.post<T>(req.service, req.endpoint, req.data);
            break;
          case 'PUT':
            data = await this.put<T>(req.service, req.endpoint, req.data);
            break;
          case 'DELETE':
            data = await this.delete<T>(req.service, req.endpoint);
            break;
          default:
            throw new Error(`Unsupported method: ${req.method}`);
        }
        return { service: req.service, data, error: undefined };
      } catch (error: any) {
        return { service: req.service, data: undefined as any, error };
      }
    });

    return Promise.all(promises);
  }
}