export class CalculoNotFoundException extends Error {
  constructor(id: string) {
    super(`Cálculo con ID ${id} no encontrado`);
    this.name = 'CalculoNotFoundException';
  }
}