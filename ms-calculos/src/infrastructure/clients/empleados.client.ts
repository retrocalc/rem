import { HttpClient } from './http.client';
import { EmpleadoData } from '../../domain/interfaces/calculo.interface';
import type { AxiosError } from 'axios';

export class EmpleadosClient {
  private http: HttpClient;

  constructor(baseURL: string) {
    this.http = new HttpClient(baseURL);
  }

   async obtenerEmpleadoPorId(id: string): Promise<EmpleadoData | null> {
     console.log(`[EmpleadosClient.obtenerEmpleadoPorId] Obteniendo empleado con ID: ${id}`);
     try {
       const empleado = await this.http.get<EmpleadoData>(`/api/empleados/${id}`);
       console.log(`[EmpleadosClient.obtenerEmpleadoPorId] Empleado obtenido: ${empleado ? 'Sí' : 'No'}`);
       return empleado;
     } catch (error: unknown) {
       if (error instanceof Error && 'response' in error && (error as AxiosError).response?.status === 404) {
         console.log(`[EmpleadosClient.obtenerEmpleadoPorId] Empleado ${id} no encontrado (404)`);
         return null;
       }
       console.error(`[EmpleadosClient.obtenerEmpleadoPorId] Error obteniendo empleado ${id}:`, error instanceof Error ? error.message : String(error));
       throw error;
     }
   }

    async obtenerEmpleados(): Promise<EmpleadoData[]> {
      console.log('[EmpleadosClient.obtenerEmpleados] Obteniendo lista de empleados');
      try {
        const empleados = await this.http.get<EmpleadoData[]>('/api/empleados');
        console.log(`[EmpleadosClient.obtenerEmpleados] ${empleados.length} empleados obtenidos`);
        return empleados;
      } catch (error: any) {
        console.error('[EmpleadosClient.obtenerEmpleados] Error obteniendo empleados:', error.message);
        throw error;
      }
    }

    async refrescar(): Promise<void> {
      console.log('[EmpleadosClient.refrescar] Refrescando datos de empleados');
      try {
        await this.http.post('/api/empleados/inicializar', {});
        console.log('[EmpleadosClient.refrescar] Empleados refrescados exitosamente');
      } catch (error: unknown) {
        // Log pero no fallar si el endpoint no existe o hay error
        console.warn(`[EmpleadosClient.refrescar] No se pudo refrescar empleados: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
}