import { CalculoRemuneracion } from './calculo.interface';

export interface IRepository<T> {
  encontrarPorId(id: string): Promise<T | null>;
  guardar(id: string, entidad: T): Promise<void>;
  eliminar(id: string): Promise<boolean>;
  listarTodos(): Promise<Map<string, T>>;
}

export interface ICalculoRepository extends IRepository<CalculoRemuneracion> {
  encontrarPorContratoId(contratoId: string): Promise<CalculoRemuneracion[]>;
  encontrarPorEmpleadoId(empleadoId: string): Promise<CalculoRemuneracion[]>;
  encontrarPorMesProceso(mesProceso: string): Promise<CalculoRemuneracion[]>;
  eliminarPorMesProceso(mesProceso: string): Promise<number>;
}