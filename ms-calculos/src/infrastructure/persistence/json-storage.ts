import { SistemaCalculosData, type CalculoRemuneracion } from '../../domain/interfaces/calculo.interface';
import fs from 'fs/promises';
import path from 'path';
import { DateUtils } from '../utils/date.utils';

export class JsonStorage {
  private data: SistemaCalculosData;
  private readonly filePath: string;
  private cache: SistemaCalculosData | null = null;
  private lastLoadTime: number = 0;
  private readonly ttl: number; // Tiempo de vida de caché en milisegundos

  constructor(filePath: string, ttl: number = 30000) { // 30 segundos por defecto
    this.filePath = path.resolve(filePath);
    this.ttl = ttl;
    this.data = this.getEstructuraInicial();
  }

  private getEstructuraInicial(): SistemaCalculosData {
    return {
      honorarios: {},
      contrata: {},
      planta: {},
      metadata: {
        ultima_actualizacion: DateUtils.ahoraISO(),
        version_esquema: '1.0.0',
        total_calculos: 0
      }
    };
  }

  async cargar(force: boolean = false): Promise<void> {
    const now = Date.now();
    
    // Usar caché si no está forzado y la caché es válida
    if (!force && this.cache && (now - this.lastLoadTime) < this.ttl) {
      this.data = this.cache;
      return;
    }

    try {
      await fs.access(this.filePath);
      const contenido = await fs.readFile(this.filePath, 'utf-8');
      const loadedData = JSON.parse(contenido);
      
      // Validar estructura básica
      if (!loadedData.honorarios || !loadedData.contrata || !loadedData.planta || !loadedData.metadata) {
        throw new Error('Estructura JSON inválida');
      }
      
      this.data = loadedData;
      this.cache = loadedData;
      this.lastLoadTime = now;
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Archivo no existe, crear con estructura inicial
        await this.guardar();
        // Cargar el archivo recién creado
        await this.cargar(true);
      } else {
        throw error;
      }
    }
  }

  async forzarCarga(): Promise<void> {
    await this.cargar(true);
  }

  async guardar(): Promise<void> {
    // Actualizar metadata
    this.data.metadata.ultima_actualizacion = DateUtils.ahoraISO();
    this.data.metadata.total_calculos = 
      Object.keys(this.data.honorarios).length +
      Object.keys(this.data.contrata).length +
      Object.keys(this.data.planta).length;
    
    const contenido = JSON.stringify(this.data, null, 2);
    await fs.writeFile(this.filePath, contenido, 'utf-8');
    
    // Actualizar caché después de guardar
    this.cache = { ...this.data };
    this.lastLoadTime = Date.now();
  }

  async crearBackup(): Promise<string> {
    const backupDir = path.join(path.dirname(this.filePath), 'backups');
    await fs.mkdir(backupDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `backup-${timestamp}.json`);
    
    await fs.copyFile(this.filePath, backupPath);
    return backupPath;
  }

  obtenerData(): SistemaCalculosData {
    return { ...this.data };
  }

  actualizarData(data: SistemaCalculosData): void {
    this.data = data;
  }

  // Métodos de conveniencia
  obtenerCalculos() {
    // Retorna objeto combinado de todos los cálculos
    return {
      ...this.data.honorarios,
      ...this.data.contrata,
      ...this.data.planta
    };
  }

  obtenerMetadata() {
    return this.data.metadata;
  }

  // Guardar cálculo en la sección correspondiente según su tipo_contrato
  guardarCalculo(id: string, calculo: CalculoRemuneracion): void {
    const tipo = calculo.tipo_contrato;
    if (tipo === 'honorarios') {
      this.data.honorarios[id] = calculo;
    } else if (tipo === 'contrata') {
      this.data.contrata[id] = calculo;
    } else if (tipo === 'planta') {
      this.data.planta[id] = calculo;
    } else {
      throw new Error(`Tipo de cálculo no soportado: ${tipo as string}`);
    }
  }

  // Eliminar cálculo de la sección correspondiente
  eliminarCalculo(id: string): boolean {
    // Buscar en cada sección
    if (this.data.honorarios[id]) {
      delete this.data.honorarios[id];
      return true;
    }
    if (this.data.contrata[id]) {
      delete this.data.contrata[id];
      return true;
    }
    if (this.data.planta[id]) {
      delete this.data.planta[id];
      return true;
    }
    return false;
  }

  // Obtener cálculo por ID (busca en todas las secciones)
  obtenerCalculoPorId(id: string): CalculoRemuneracion | null {
    return this.data.honorarios[id] || this.data.contrata[id] || this.data.planta[id] || null;
  }

  async realizarOperacionConBackup<T>(operacion: () => Promise<T>): Promise<T> {
    // Crear backup antes de operación crítica
    await this.crearBackup();
    try {
      const resultado = await operacion();
      await this.guardar();
      return resultado;
    } catch (error) {
      // En caso de error, podríamos restaurar desde backup si es necesario
      throw error;
    }
  }
}