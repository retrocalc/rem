import axios from 'axios';

export class HttpClient {
  private client;

  constructor(baseURL: string, timeout: number = 5000) {
    this.client = axios.create({
      baseURL,
      timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async get<T>(path: string): Promise<T> {
    console.log(`[HttpClient.get] ${this.client.defaults.baseURL}${path}`);
    try {
      const response = await this.client.get<T>(path);
      console.log(`[HttpClient.get] Respuesta recibida: ${response.status} ${response.statusText}`);
      return response.data;
    } catch (error: any) {
      console.error(`[HttpClient.get] Error en GET ${path}:`, error.message);
      if (error.response) {
        console.error(`[HttpClient.get] Respuesta de error: ${error.response.status}`, error.response.data);
      }
      throw error;
    }
  }

  async post<T>(path: string, data: unknown): Promise<T> {
    console.log(`[HttpClient.post] ${this.client.defaults.baseURL}${path}`, JSON.stringify(data).substring(0, 200));
    try {
      const response = await this.client.post<T>(path, data);
      console.log(`[HttpClient.post] Respuesta recibida: ${response.status} ${response.statusText}`);
      return response.data;
    } catch (error: any) {
      console.error(`[HttpClient.post] Error en POST ${path}:`, error.message);
      if (error.response) {
        console.error(`[HttpClient.post] Respuesta de error: ${error.response.status}`, error.response.data);
      }
      throw error;
    }
  }

  async put<T>(path: string, data: unknown): Promise<T> {
    console.log(`[HttpClient.put] ${this.client.defaults.baseURL}${path}`, JSON.stringify(data).substring(0, 200));
    try {
      const response = await this.client.put<T>(path, data);
      console.log(`[HttpClient.put] Respuesta recibida: ${response.status} ${response.statusText}`);
      return response.data;
    } catch (error: any) {
      console.error(`[HttpClient.put] Error en PUT ${path}:`, error.message);
      if (error.response) {
        console.error(`[HttpClient.put] Respuesta de error: ${error.response.status}`, error.response.data);
      }
      throw error;
    }
  }

  async delete<T>(path: string): Promise<T> {
    console.log(`[HttpClient.delete] ${this.client.defaults.baseURL}${path}`);
    try {
      const response = await this.client.delete<T>(path);
      console.log(`[HttpClient.delete] Respuesta recibida: ${response.status} ${response.statusText}`);
      return response.data;
    } catch (error: any) {
      console.error(`[HttpClient.delete] Error en DELETE ${path}:`, error.message);
      if (error.response) {
        console.error(`[HttpClient.delete] Respuesta de error: ${error.response.status}`, error.response.data);
      }
      throw error;
    }
  }
}