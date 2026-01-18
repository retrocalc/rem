export class DateUtils {
  static formatearISO(date: Date): string {
    return date.toISOString();
  }

  static formatearFechaISO(date: Date): string {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  static parsearFechaISO(fechaStr: string): Date {
    const date = new Date(fechaStr);
    if (isNaN(date.getTime())) {
      throw new Error(`Fecha inválida: ${fechaStr}`);
    }
    return date;
  }

  static ahora(): Date {
    return new Date();
  }

  static ahoraISO(): string {
    return this.formatearISO(new Date());
  }
}