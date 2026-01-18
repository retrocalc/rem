import { HttpClient } from './http.client';

export interface CalculoRulesResult {
  sueldo_base: number;
  bienios: number;
  total: number;
  detalles?: {
    [key: string]: {
      valor: number;
      formula?: string;
      descripcion?: string;
    }
  };
}

export interface ContratoAttributes {
  institucion?: string;
  grado?: string;
  cantidad_bienios?: number;
  monto_bruto?: number;
  porcentaje_retencion_honorarios?: number;
  [key: string]: unknown;
}

export class CalcRulesClient {
  private http: HttpClient;

  constructor(baseURL: string) {
    this.http = new HttpClient(baseURL);
  }

  async calcular(attributes: ContratoAttributes): Promise<CalculoRulesResult> {
    console.log('CalcRulesClient.calcular enviando:', JSON.stringify(attributes));
    try {
      const result = await this.http.post<CalculoRulesResult>('/api/calc-rules/calcular', attributes);
      console.log('CalcRulesClient.calcular respuesta:', JSON.stringify(result).substring(0, 200));
      return result;
    } catch (error: any) {
      console.error('CalcRulesClient.calcular error:', error.message, 'status:', error.response?.status);
      throw error;
    }
  }

  async health(): Promise<{ status: string; service: string }> {
    return this.http.get<{ status: string; service: string }>('/api/health');
  }
}