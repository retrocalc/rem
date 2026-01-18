import { HttpClient } from './http.client';

export interface ParametrosControl {
  institucion: string;
  mes_anio_proceso: string; // Formato: YYYY-MM
  porcentaje_retencion_honorarios: number; // Ej: 0.10 para 10%
}

export class ParametrosClient {
  private http: HttpClient;

  constructor(baseURL: string = 'http://localhost:3001') {
    this.http = new HttpClient(baseURL);
  }

  async obtenerParametros(): Promise<ParametrosControl> {
    console.log('[ParametrosClient.obtenerParametros] Solicitando parámetros al servicio');
    try {
      const parametros = await this.http.get<ParametrosControl>('/api/parametros');
      console.log('[ParametrosClient.obtenerParametros] Parámetros obtenidos:', parametros);
      return parametros;
    } catch (error) {
      console.error('[ParametrosClient.obtenerParametros] Error obteniendo parámetros:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async obtenerInstitucionActiva(): Promise<string> {
    console.log('[ParametrosClient.obtenerInstitucionActiva] Obteniendo institución activa');
    try {
      const parametros = await this.obtenerParametros();
      console.log(`[ParametrosClient.obtenerInstitucionActiva] Institución activa obtenida: ${parametros.institucion}`);
      return parametros.institucion;
    } catch (error) {
      console.error('[ParametrosClient.obtenerInstitucionActiva] Error obteniendo institución activa:', error instanceof Error ? error.message : String(error));
      console.log('[ParametrosClient.obtenerInstitucionActiva] Retornando institución por defecto: genchi');
      // Retornar institución por defecto si falla
      return 'genchi';
    }
  }

  async health(): Promise<{ status: string; service: string }> {
    return this.http.get<{ status: string; service: string }>('/api/health');
  }
}