import { SistemaParametrosData } from '../../domain/interfaces/parametro.interface';
import fs from 'fs/promises';
import path from 'path';
import { DateUtils } from '../utils/date.utils';

export class JsonStorage {
  private data: SistemaParametrosData;
  private readonly filePath: string;
  private cache: SistemaParametrosData | null = null;
  private lastLoadTime: number = 0;
  private readonly ttl: number; // Tiempo de vida de caché en milisegundos

  constructor(filePath: string, ttl: number = 30000) { // 30 segundos por defecto
    this.filePath = path.resolve(filePath);
    this.ttl = ttl;
    this.data = this.getEstructuraInicial();
  }

  private getEstructuraInicial(): SistemaParametrosData {
    return {
      parametros: {
        institucion: 'genchi',
        mes_anio_proceso: new Date().toISOString().slice(0, 7), // YYYY-MM
        porcentaje_retencion_honorarios: 0.10 // 10% por defecto
      },
      metadata: {
        ultima_actualizacion: DateUtils.ahoraISO(),
        version_esquema: '1.0.0'
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
      if (!loadedData.parametros || !loadedData.metadata) {
        throw new Error('Estructura JSON inválida');
      }
      
      this.data = loadedData;
      this.cache = loadedData;
      this.lastLoadTime = now;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
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

  obtenerData(): SistemaParametrosData {
    return { ...this.data };
  }

  actualizarData(data: SistemaParametrosData): void {
    this.data = data;
  }

  // Métodos de conveniencia
  obtenerParametros() {
    return this.data.parametros;
  }

  obtenerMetadata() {
    return this.data.metadata;
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