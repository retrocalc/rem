/**
 * Tipos de asignación profesional que afectan el cálculo de remuneraciones.
 * - Con_Asig_Prof: Empleado tiene derecho a asignación profesional (10% del sueldo base)
 * - Sin_Asig_Prof: Empleado no tiene derecho a asignación profesional
 * - No_Aplica: No corresponde asignación profesional (ej. honorarios)
 */
export type AsigProf = 'Con_Asig_Prof' | 'Sin_Asig_Prof' | 'No_Aplica';

/**
 * Sistemas previsionales disponibles para empleados.
 * - DIPRECA: Dirección de Previsión de Carabineros (10% descuento)
 * - AFP: Administradora de Fondos de Pensiones (12% descuento)
 * - INP: Instituto de Normalización Previsional (8% descuento)
 * - No_Aplica: No corresponde descuento previsional
 */
export type SistPrevisional = 'DIPRECA' | 'AFP' | 'INP' | 'No_Aplica';

/**
 * Sistemas de salud disponibles para empleados.
 * - DIPRECA: Dirección de Previsión de Carabineros (7% descuento)
 * - ISAPRE: Instituciones de Salud Previsional (6% descuento)
 * - FONASA: Fondo Nacional de Salud (4% descuento)
 * - No_Aplica: No corresponde descuento de salud
 */
export type SistSalud = 'DIPRECA' | 'ISAPRE' | 'FONASA' | 'No_Aplica';

export const ASIG_PROF_VALUES: AsigProf[] = ['Con_Asig_Prof', 'Sin_Asig_Prof', 'No_Aplica'];
export const SIST_PREVISIONAL_VALUES: SistPrevisional[] = ['DIPRECA', 'AFP', 'INP', 'No_Aplica'];
export const SIST_SALUD_VALUES: SistSalud[] = ['DIPRECA', 'ISAPRE', 'FONASA', 'No_Aplica'];

export function isValidAsigProf(value: string): value is AsigProf {
  return ASIG_PROF_VALUES.includes(value as AsigProf);
}

export function isValidSistPrevisional(value: string): value is SistPrevisional {
  return SIST_PREVISIONAL_VALUES.includes(value as SistPrevisional);
}

export function isValidSistSalud(value: string): value is SistSalud {
  return SIST_SALUD_VALUES.includes(value as SistSalud);
}