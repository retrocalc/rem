import { IParametroRepository } from '../../domain/interfaces/parametro.repository.interface';
import { ActualizarParametrosDTO } from '../dto/actualizar-parametros.dto';

export class ParametroService {
  constructor(private repository: IParametroRepository) {}

  async obtenerParametros() {
    return await this.repository.obtenerParametros();
  }

  async obtenerInstituciones() {
    return await this.repository.obtenerInstituciones();
  }

  async actualizarParametros(dto: ActualizarParametrosDTO) {
    const errores = dto.validar();
    if (errores.length > 0) {
      throw new Error(`Error de validación: ${errores.join(', ')}`);
    }
    const parametrosActuales = await this.repository.obtenerParametros();
    await this.repository.actualizarParametros({
      institucion: dto.institucion ?? parametrosActuales.institucion,
      mes_anio_proceso: dto.mes_anio_proceso,
      porcentaje_retencion_honorarios: dto.porcentaje_retencion_honorarios ?? parametrosActuales.porcentaje_retencion_honorarios
    });
  }

  async obtenerMesAnioProceso() {
    return await this.repository.obtenerMesAnioProceso();
  }

  async actualizarMesAnioProceso(mesAnio: string) {
    const dto = new ActualizarParametrosDTO(mesAnio);
    const errores = dto.validar();
    if (errores.length > 0) {
      throw new Error(`Error de validación: ${errores.join(', ')}`);
    }
    await this.repository.actualizarMesAnioProceso(mesAnio);
  }

  async refrescar(): Promise<void> {
    await this.repository.refrescar();
  }
}