import { ICalculoRepository } from '../../../domain/interfaces/repository.interface';
import { CalculoRemuneracion } from '../../../domain/interfaces/calculo.interface';
import { JsonStorage } from '../../persistence/json-storage';

export class CalculoJsonRepository implements ICalculoRepository {
  private storage: JsonStorage;

  constructor(filePath: string) {
    this.storage = new JsonStorage(filePath);
  }

  async inicializar(): Promise<void> {
    await this.storage.forzarCarga();
  }

  async encontrarPorId(id: string): Promise<CalculoRemuneracion | null> {
    return this.storage.obtenerCalculoPorId(id);
  }

  async encontrarPorContratoId(contratoId: string): Promise<CalculoRemuneracion[]> {
    const calculos = this.storage.obtenerCalculos();
    return Object.values(calculos).filter(calculo => calculo.contratoId === contratoId);
  }

  async encontrarPorEmpleadoId(empleadoId: string): Promise<CalculoRemuneracion[]> {
    const calculos = this.storage.obtenerCalculos();
    return Object.values(calculos).filter(calculo => calculo.empleadoId === empleadoId);
  }

  async encontrarPorMesProceso(mesProceso: string): Promise<CalculoRemuneracion[]> {
    const calculos = this.storage.obtenerCalculos();
    return Object.values(calculos).filter(calculo => calculo.mes_proceso === mesProceso);
  }

  async guardar(id: string, calculo: CalculoRemuneracion): Promise<void> {
    await this.storage.realizarOperacionConBackup(async () => {
      this.storage.guardarCalculo(id, calculo);
    });
  }

  async eliminar(id: string): Promise<boolean> {
    const calculos = this.storage.obtenerCalculos();
    if (!calculos[id]) {
      return false;
    }

    await this.storage.realizarOperacionConBackup(async () => {
      this.storage.eliminarCalculo(id);
    });
    return true;
  }

  async listarTodos(): Promise<Map<string, CalculoRemuneracion>> {
    const calculos = this.storage.obtenerCalculos();
    const map = new Map<string, CalculoRemuneracion>();
    Object.entries(calculos).forEach(([id, calculo]) => {
      map.set(id, calculo);
    });
    return map;
  }

  async eliminarPorMesProceso(mesProceso: string): Promise<number> {
    const calculosDelMes = await this.encontrarPorMesProceso(mesProceso);
    let eliminados = 0;
    for (const calculo of calculosDelMes) {
      const eliminado = await this.eliminar(calculo.id);
      if (eliminado) eliminados++;
    }
    return eliminados;
  }
}