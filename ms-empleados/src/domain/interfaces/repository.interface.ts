import { Empleado } from './empleado.interface';

export interface IRepository<T> {
  encontrarPorId(id: string): Promise<T | null>;
  guardar(id: string, entidad: T): Promise<void>;
  eliminar(id: string): Promise<boolean>;
  listarTodos(): Promise<Map<string, T>>;
}

export interface IEmpleadoRepository extends IRepository<Empleado> {
  encontrarPorRUT(rut: string): Promise<Empleado | null>;
  generarNuevoIdEmpleado(): Promise<string>;
  refrescar(): Promise<void>;
}