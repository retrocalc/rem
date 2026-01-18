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

  async obtenerParametros(): Promise<ParametrosControl> {
    const data = this.storage.obtenerData();
    return data.parametros;
  }

  async obtenerInstituciones(): Promise<Record<string, Institucion>> {
    const data = this.storage.obtenerData();
    return data.instituciones || {};
  }

  async actualizarParametros(parametros: ParametrosControl): Promise<void> {
    await this.storage.realizarOperacionConBackup(async () => {
      const data = this.storage.obtenerData();
      data.parametros = parametros;
      this.storage.actualizarData(data);
    });
  }

  async obtenerMesAnioProceso(): Promise<string> {
    const parametros = await this.obtenerParametros();
    return parametros.mes_anio_proceso;
  }

  async actualizarMesAnioProceso(mesAnio: string): Promise<void> {
    const parametrosActuales = await this.obtenerParametros();
    await this.actualizarParametros({
      ...parametrosActuales,
      mes_anio_proceso: mesAnio
    });
  }

  async refrescar(): Promise<void> {
    await this.storage.forzarCarga();
  }
}