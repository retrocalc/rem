import { IEmpleadoRepository } from '../../../domain/interfaces/repository.interface';
import { Empleado } from '../../../domain/interfaces/empleado.interface';
import { JsonStorage } from '../../persistence/json-storage';


export class EmpleadoJsonRepository implements IEmpleadoRepository {
  private storage: JsonStorage;

  constructor(filePath: string) {
    this.storage = new JsonStorage(filePath);
  }

  async inicializar(): Promise<void> {
    await this.storage.forzarCarga();
  }

  async encontrarPorId(id: string): Promise<Empleado | null> {
    const empleados = this.storage.obtenerEmpleados();
    return empleados[id] || null;
  }

  async encontrarPorRUT(rut: string): Promise<Empleado | null> {
    const empleados = this.storage.obtenerEmpleados();
    for (const empleado of Object.values(empleados)) {
      if (empleado.datos_personales.rut === rut) {
        return empleado;
      }
    }
    return null;
  }

  async guardar(id: string, empleado: Empleado): Promise<void> {
    await this.storage.realizarOperacionConBackup(async () => {
      const empleados = this.storage.obtenerEmpleados();
      empleados[id] = empleado;
      // No need to call actualizarData, storage already has reference
    });
  }

  async eliminar(id: string): Promise<boolean> {
    const empleados = this.storage.obtenerEmpleados();
    if (!empleados[id]) {
      return false;
    }

    await this.storage.realizarOperacionConBackup(async () => {
      delete empleados[id];
    });
    return true;
  }

  async listarTodos(): Promise<Map<string, Empleado>> {
    const empleados = this.storage.obtenerEmpleados();
    const map = new Map<string, Empleado>();
    Object.entries(empleados).forEach(([id, empleado]) => {
      map.set(id, empleado);
    });
    return map;
  }

  async generarNuevoIdEmpleado(): Promise<string> {
    const empleados = this.storage.obtenerEmpleados();
    const ids = Object.keys(empleados);
    
    if (ids.length === 0) {
      return '0001';
    }

    // Encontrar el máximo ID numérico
    const maxId = Math.max(...ids.map(id => parseInt(id, 10)));
    const nextId = maxId + 1;
    
    // Asegurar formato de 4 dígitos
    return nextId.toString().padStart(4, '0');
  }

  async refrescar(): Promise<void> {
    await this.storage.forzarCarga();
  }
}