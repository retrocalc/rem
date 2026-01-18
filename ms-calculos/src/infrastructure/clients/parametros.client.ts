import { HttpClient } from './http.client';
import { ParametrosControl } from '../../domain/interfaces/calculo.interface';

export class ParametrosClient {
  private http: HttpClient;

  constructor(baseURL: string) {
    this.http = new HttpClient(baseURL);
  }

   async obtenerParametros(): Promise<ParametrosControl> {
     console.log('[ParametrosClient.obtenerParametros] Solicitando parámetros al servicio');
     try {
       const parametros = await this.http.get<ParametrosControl>('/api/parametros');
       console.log('[ParametrosClient.obtenerParametros] Parámetros obtenidos:', parametros);
       return parametros;
     } catch (error: any) {
       console.error('[ParametrosClient.obtenerParametros] Error obteniendo parámetros:', error.message);
       throw error;
     }
   }

   async actualizarMesProceso(mesProceso: string): Promise<ParametrosControl> {
     console.log(`[ParametrosClient.actualizarMesProceso] Actualizando mes de proceso a: ${mesProceso}`);
     try {
       const resultado = await this.http.put<ParametrosControl>('/api/parametros/mes-anio-proceso', { mes_anio_proceso: mesProceso });
       console.log('[ParametrosClient.actualizarMesProceso] Mes actualizado exitosamente:', resultado);
       return resultado;
     } catch (error: any) {
       console.error('[ParametrosClient.actualizarMesProceso] Error actualizando mes de proceso:', error.message);
       throw error;
     }
   }

   async cerrarMes(): Promise<ParametrosControl> {
     console.log('[ParametrosClient.cerrarMes] Cerrando mes actual');
     try {
       const parametrosActuales = await this.obtenerParametros();
       console.log(`[ParametrosClient.cerrarMes] Mes actual: ${parametrosActuales.mes_anio_proceso}`);
       const [anio, mes] = parametrosActuales.mes_anio_proceso.split('-').map(Number);
       
       let nuevoMes = mes + 1;
       let nuevoAnio = anio;
       if (nuevoMes > 12) {
         nuevoMes = 1;
         nuevoAnio += 1;
       }
       
       const nuevoMesProceso = `${nuevoAnio}-${nuevoMes.toString().padStart(2, '0')}`;
       console.log(`[ParametrosClient.cerrarMes] Nuevo mes de proceso: ${nuevoMesProceso}`);
       const resultado = await this.actualizarMesProceso(nuevoMesProceso);
       console.log('[ParametrosClient.cerrarMes] Mes cerrado exitosamente:', resultado);
       return resultado;
     } catch (error: any) {
       console.error('[ParametrosClient.cerrarMes] Error cerrando mes:', error.message);
       throw error;
     }
   }
}