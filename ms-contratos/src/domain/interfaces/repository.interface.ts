import { Contrato } from './contrato.interface';

export interface IRepository<T> {
  encontrarPorId(id: string): Promise<T | null>;
  guardar(id: string, entidad: T): Promise<void>;
  eliminar(id: string): Promise<boolean>;
  listarTodos(): Promise<Map<string, T>>;
}

export interface IContratoRepository extends IRepository<Contrato> {
  encontrarPorEmpleadoId(empleadoId: string): Promise<Contrato[]>;
  encontrarPorNumeroContrato(numeroContrato: string): Promise<Contrato | null>;
  refrescar(): Promise<void>;
}