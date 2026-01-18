export class EmpleadoNotFoundException extends Error {
  constructor(id: string) {
    super(`Empleado con ID ${id} no encontrado`);
    this.name = 'EmpleadoNotFoundException';
  }
}

export class RUTDuplicadoException extends Error {
  constructor(rut: string) {
    super(`El RUT ${rut} ya está registrado en el sistema`);
    this.name = 'RUTDuplicadoException';
  }
}