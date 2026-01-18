export class RUT {
  private readonly value: string;

  constructor(rut: string) {
    if (!RUT.esValido(rut)) {
      throw new Error(`RUT inválido: ${rut}`);
    }
    this.value = RUT.normalizar(rut);
  }

  public toString(): string {
    return this.value;
  }

  public get valor(): string {
    return this.value;
  }

  public static esValido(rut: string): boolean {
    if (!rut || typeof rut !== 'string') return false;

    // Eliminar puntos y guión, dejar solo números y dígito verificador
    const rutLimpio = rut.replace(/[^0-9kK-]/g, '');
    if (rutLimpio.length < 3) return false;

    const partes = rutLimpio.split('-');
    if (partes.length !== 2) return false;

    const [numeros, dv] = partes;
    if (!numeros || !dv) return false;

    // Calcular dígito verificador esperado
    const dvCalculado = RUT.calcularDigitoVerificador(numeros);
    return dv.toUpperCase() === dvCalculado;
  }

  private static calcularDigitoVerificador(numeros: string): string {
    let suma = 0;
    let multiplo = 2;

    // Recorrer números de derecha a izquierda
    for (let i = numeros.length - 1; i >= 0; i--) {
      suma += parseInt(numeros.charAt(i)) * multiplo;
      multiplo = multiplo === 7 ? 2 : multiplo + 1;
    }

    const resto = suma % 11;
    const dv = 11 - resto;

    if (dv === 10) return 'K';
    if (dv === 11) return '0';
    return dv.toString();
  }

  private static normalizar(rut: string): string {
    // Eliminar puntos y espacios, convertir a mayúsculas
    const rutLimpio = rut.replace(/[^0-9kK-]/g, '');
    const partes = rutLimpio.split('-');
    if (partes.length !== 2) throw new Error('Formato RUT inválido');

    const [numeros, dv] = partes;
    // Formatear con guión y dígito verificador en mayúscula
    return `${numeros}-${dv.toUpperCase()}`;
  }

  public equals(otroRut: RUT): boolean {
    return this.value === otroRut.value;
  }
}