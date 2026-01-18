import { v4 as uuidv4 } from 'uuid';

export class IdGenerator {
  static generarUUID(): string {
    return uuidv4();
  }

  static generarCodigoEmpleado(secuencia: number): string {
    return secuencia.toString().padStart(4, '0');
  }
}