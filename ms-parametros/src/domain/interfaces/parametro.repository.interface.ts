import { ParametrosControl, Institucion } from './parametro.interface';

export interface IParametroRepository {
  obtenerParametros(): Promise<ParametrosControl>;
  obtenerInstituciones(): Promise<Record<string, Institucion>>;
  actualizarParametros(parametros: ParametrosControl): Promise<void>;
  obtenerMesAnioProceso(): Promise<string>;
  actualizarMesAnioProceso(mesAnio: string): Promise<void>;
  refrescar(): Promise<void>;
}