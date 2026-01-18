import { IContratoRepository } from '../../../domain/interfaces/repository.interface';
import { Contrato } from '../../../domain/interfaces/contrato.interface';
import { JsonStorage } from '../../persistence/json-storage';

export class ContratoJsonRepository implements IContratoRepository {
  private storage: JsonStorage;

  constructor(filePath: string) {
    this.storage = new JsonStorage(filePath);
  }

  async inicializar(): Promise<void> {
    await this.storage.cargar();
  }

   async encontrarPorId(id: string): Promise<Contrato | null> {
     await this.storage.cargar();
      return this.storage.obtenerContratoPorId(id);
   }

   async encontrarPorEmpleadoId(empleadoId: string): Promise<Contrato[]> {
     await this.storage.cargar();
     const contratos = this.storage.obtenerContratos();
     return Object.values(contratos).filter(contrato => contrato.empleadoId === empleadoId);
   }

  async encontrarPorNumeroContrato(numeroContrato: string): Promise<Contrato | null> {
    const contratos = this.storage.obtenerContratos();
    for (const contrato of Object.values(contratos)) {
      if (contrato.numero_contrato === numeroContrato) {
        return contrato;
      }
    }
    return null;
  }

  async guardar(id: string, contrato: Contrato): Promise<void> {
    await this.storage.realizarOperacionConBackup(async () => {
      this.storage.guardarContrato(id, contrato);
    });
  }

  async eliminar(id: string): Promise<boolean> {
    const existe = this.storage.eliminarContrato(id);
    if (!existe) {
      return false;
    }

    await this.storage.realizarOperacionConBackup(async () => {
      // La eliminación ya se realizó, solo guardar cambios
    });
    return true;
  }

   async listarTodos(): Promise<Map<string, Contrato>> {
     const contratos = this.storage.obtenerContratos();
     const map = new Map<string, Contrato>();
     Object.entries(contratos).forEach(([id, contrato]) => {
       map.set(id, contrato);
     });
     return map;
   }

    async refrescar(): Promise<void> {
      await this.storage.forzarCarga();
    }
}