import { CalculoEntity } from './src/domain/entities/calculo.entity';
import { JsonStorage } from './src/infrastructure/persistence/json-storage';
import { ContratoHonorarios, ContratoContrata, ContratoPlanta } from './src/domain/interfaces/calculo.interface';
import path from 'path';

async function test() {
  console.log('=== Prueba de integración de cálculos ===');

  // Crear almacenamiento en archivo temporal
  const testFilePath = path.join(__dirname, 'data', 'calculos-test.json');
  const storage = new JsonStorage(testFilePath);
  await storage.cargar();

  // Limpiar datos existentes
  storage.actualizarData({
    honorarios: {},
    contrata: {},
    planta: {},
    metadata: {
      ultima_actualizacion: new Date().toISOString(),
      version_esquema: '1.0.0',
      total_calculos: 0
    }
  });

  // 1. Probar cálculo de honorarios
  const contratoHonorarios: ContratoHonorarios = {
    id: 'honorarios-test-id',
    empleadoId: '0001',
    monto_bruto: 1500000,
    estado: 'activo',
    tipo: 'honorarios'
  };
  const parametros = {
    mes_anio_proceso: '2025-01',
    porcentaje_retencion_honorarios: 0.1
  };
  const calculoHonorarios = CalculoEntity.crearParaHonorarios(contratoHonorarios, parametros);
  console.log('Cálculo honorarios creado:', calculoHonorarios);
  storage.guardarCalculo(calculoHonorarios.id, calculoHonorarios.toJSON());
  console.log('Cálculo honorarios guardado.');

  // 2. Probar cálculo de contrata
  const contratoContrata: ContratoContrata = {
    id: 'contrata-test-id',
    empleadoId: '0002',
    grado: 'Grado_4',
    cantidad_bienios: 5,
    estado: 'activo',
    tipo: 'contrata'
  };
  const calculoContrata = CalculoEntity.crearParaContrata(contratoContrata, 600000, 50000, '2025-01');
  console.log('Cálculo contrata creado:', calculoContrata);
  storage.guardarCalculo(calculoContrata.id, calculoContrata.toJSON());
  console.log('Cálculo contrata guardado.');

  // 3. Probar cálculo de planta
  const contratoPlanta: ContratoPlanta = {
    id: 'planta-test-id',
    empleadoId: '0003',
    grado: 'Grado_5',
    cantidad_bienios: 3,
    estado: 'activo',
    tipo: 'planta'
  };
  const calculoPlanta = CalculoEntity.crearParaPlanta(contratoPlanta, 700000, 30000, '2025-01');
  console.log('Cálculo planta creado:', calculoPlanta);
  storage.guardarCalculo(calculoPlanta.id, calculoPlanta.toJSON());
  console.log('Cálculo planta guardado.');

  // Guardar archivo
  await storage.guardar();

  // Leer archivo y mostrar contenido
  const data = storage.obtenerData();
  console.log('\n=== Contenido del archivo JSON ===');
  console.log(JSON.stringify(data, null, 2));

  // Verificar que cada cálculo esté en la sección correcta
  console.log('\n=== Verificación por sección ===');
  console.log('Honorarios:', Object.keys(data.honorarios).length, 'cálculos');
  console.log('Contrata:', Object.keys(data.contrata).length, 'cálculos');
  console.log('Planta:', Object.keys(data.planta).length, 'cálculos');

  // Verificar estructura de un cálculo de honorarios
  const honorarioKey = Object.keys(data.honorarios)[0];
  if (honorarioKey) {
    const hon = data.honorarios[honorarioKey];
    console.log('\nCálculo honorarios tiene monto_bruto?', 'monto_bruto' in hon);
    console.log('Cálculo honorarios tiene porcentaje_retencion?', 'porcentaje_retencion' in hon);
    console.log('Cálculo honorarios tiene monto_retencion?', 'monto_retencion' in hon);
    console.log('Cálculo honorarios NO tiene sueldo_base?', !('sueldo_base' in hon));
  }

  // Verificar estructura de un cálculo de contrata
  const contrataKey = Object.keys(data.contrata)[0];
  if (contrataKey) {
    const con = data.contrata[contrataKey];
    console.log('\nCálculo contrata tiene sueldo_base?', 'sueldo_base' in con);
    console.log('Cálculo contrata tiene cantidad_bienios?', 'cantidad_bienios' in con);
    console.log('Cálculo contrata tiene monto_bienios?', 'monto_bienios' in con);
    console.log('Cálculo contrata NO tiene monto_bruto?', !('monto_bruto' in con));
    console.log('Cálculo contrata NO tiene porcentaje_retencion?', !('porcentaje_retencion' in con));
  }

  console.log('\n=== Prueba completada ===');
}

test().catch(err => {
  console.error('Error en prueba:', err);
  process.exit(1);
});