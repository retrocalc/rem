export class ContratoNotFoundException extends Error {
  constructor(id: string) {
    super(`Contrato con ID ${id} no encontrado`);
    this.name = 'ContratoNotFoundException';
  }
}