export class Email {
  private readonly value: string;

  constructor(email: string) {
    if (!Email.esValido(email)) {
      throw new Error(`Email inválido: ${email}`);
    }
    this.value = email.toLowerCase();
  }

  public toString(): string {
    return this.value;
  }

  public get valor(): string {
    return this.value;
  }

  public static esValido(email: string): boolean {
    if (!email || typeof email !== 'string') return false;
    
    // Expresión regular simple para validar email
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  public equals(otroEmail: Email): boolean {
    return this.value === otroEmail.value;
  }
}