import { IParametroRepository } from '../../../domain/interfaces/parametro.repository.interface';
import { ParametrosControl, Institucion } from '../../../domain/interfaces/parametro.interface';
import { JsonStorage } from '../../persistence/json-storage';

export class SistemaJsonRepository implements IParametroRepository {
  private storage: JsonStorage;

  constructor(filePath: string) {
    this.storage = new JsonStorage(filePath);
  }

  async inicializar(): Promise<void> {
    await this.storage.cargar();
  }

  async obtenerParametros(usuario?: string): Promise<ParametrosControl> {
    return this.storage.obtenerParametros(usuario);
  }

  async obtenerParametrosPorUsuario(usuario: string): Promise<ParametrosControl> {
    return this.storage.obtenerParametrosPorUsuario(usuario);
  }

  async obtenerInstituciones(): Promise<Record<string, Institucion>> {
    const data = this.storage.obtenerData();
    return data.instituciones || {};
  }

  async actualizarParametros(usuario: string, parametros: ParametrosControl): Promise<void> {
    await this.storage.realizarOperacionConBackup(async () => {
      const data = this.storage.obtenerData();
      data.parametros[usuario] = parametros;
      this.storage.actualizarData(data);
    });
  }

  async obtenerMesAnioProceso(usuario?: string): Promise<string> {
    const parametros = await this.obtenerParametros(usuario);
    return parametros.mes_anio_proceso;
  }

  async actualizarMesAnioProceso(usuario: string, mesAnio: string): Promise<void> {
    const parametrosActuales = await this.obtenerParametros(usuario);
    await this.actualizarParametros(usuario, {
      ...parametrosActuales,
      mes_anio_proceso: mesAnio
    });
  }

  async refrescar(): Promise<void> {
    await this.storage.forzarCarga();
  }
}