import fs from 'fs/promises';
import path from 'path';
import { RulesDefinition } from '../../domain/interfaces/rules.interface';

export class JsonStorage {
  private readonly dataDir: string;

  constructor(dataDir: string) {
    this.dataDir = path.resolve(dataDir);
  }

  private normalizeRules(rawData: any): RulesDefinition {
    console.log('[JsonStorage.normalizeRules] Normalizando estructura de reglas');
    
    // Si el objeto está vacío, retornar estructura vacía
    if (!rawData || typeof rawData !== 'object' || Object.keys(rawData).length === 0) {
      console.log('[JsonStorage.normalizeRules] Datos vacíos, retornando estructura vacía');
      return {};
    }

    // Detectar formato antiguo (flat: concepto -> fórmula string)
    const esFormatoAntiguo = Object.values(rawData).some(value => typeof value === 'string');
    
    if (esFormatoAntiguo) {
      console.log('[JsonStorage.normalizeRules] Formato antiguo detectado, convirtiendo a nueva estructura');
      return this.convertirFormatoAntiguo(rawData);
    }

    // Formato nuevo: validar estructura básica
    console.log('[JsonStorage.normalizeRules] Formato nuevo detectado, validando estructura');
    return this.validarFormatoNuevo(rawData);
  }

  private convertirFormatoAntiguo(oldData: Record<string, string>): RulesDefinition {
    console.log(`[JsonStorage.convertirFormatoAntiguo] Convirtiendo ${Object.keys(oldData).length} conceptos`);
    
    const rulesNormalized: RulesDefinition = {
      haberes: {}
    };

    for (const [nombreConcepto, formula] of Object.entries(oldData)) {
      console.log(`[JsonStorage.convertirFormatoAntiguo] Procesando concepto "${nombreConcepto}"`);
      
      rulesNormalized.haberes[nombreConcepto] = {
        formula,
        glosa: this.generarGlosaDesdeNombre(nombreConcepto),
        afectos: {},
        vigencia_desde: '1900-01',
        vigencia_hasta: ''
      };
    }

    console.log('[JsonStorage.convertirFormatoAntiguo] Conversión completada');
    return rulesNormalized;
  }

  private validarFormatoNuevo(newData: any): RulesDefinition {
    const rulesNormalized: RulesDefinition = {};

    for (const [categoria, conceptos] of Object.entries(newData)) {
      console.log(`[JsonStorage.validarFormatoNuevo] Validando categoría "${categoria}"`);
      
      if (typeof conceptos !== 'object' || conceptos === null) {
        console.error(`[JsonStorage.validarFormatoNuevo] Categoría "${categoria}" no es un objeto válido`);
        throw new Error(`Categoría "${categoria}" no es un objeto válido en rules.json`);
      }

      rulesNormalized[categoria] = {};

      for (const [nombreConcepto, concepto] of Object.entries(conceptos as Record<string, any>)) {
        console.log(`[JsonStorage.validarFormatoNuevo] Validando concepto "${nombreConcepto}"`);
        
        if (!concepto || typeof concepto !== 'object') {
          console.error(`[JsonStorage.validarFormatoNuevo] Concepto "${nombreConcepto}" no es un objeto válido`);
          throw new Error(`Concepto "${nombreConcepto}" no es un objeto válido en rules.json`);
        }

        if (typeof concepto.formula !== 'string') {
          console.error(`[JsonStorage.validarFormatoNuevo] Concepto "${nombreConcepto}" no tiene fórmula válida`);
          throw new Error(`Concepto "${nombreConcepto}" no tiene fórmula válida en rules.json`);
        }

        rulesNormalized[categoria][nombreConcepto] = {
          formula: concepto.formula,
          glosa: concepto.glosa || this.generarGlosaDesdeNombre(nombreConcepto),
          afectos: concepto.afectos || {},
          vigencia_desde: concepto.vigencia_desde || '1900-01',
          vigencia_hasta: concepto.vigencia_hasta || ''
        };
      }
    }

    console.log('[JsonStorage.validarFormatoNuevo] Validación completada exitosamente');
    return rulesNormalized;
  }

  private generarGlosaDesdeNombre(nombre: string): string {
    // Convertir snake_case o camelCase a texto legible
    const glosa = nombre
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
    
    console.log(`[JsonStorage.generarGlosaDesdeNombre] Glosa generada para "${nombre}": "${glosa}"`);
    return glosa;
  }

  async cargarRules(institucion?: string): Promise<RulesDefinition> {
    const rulesPath = institucion 
      ? path.join(this.dataDir, institucion, 'rules.json')
      : path.join(this.dataDir, 'rules.json');
    try {
      await fs.access(rulesPath);
      const contenido = await fs.readFile(rulesPath, 'utf-8');
      const rules = JSON.parse(contenido);
      
      // Validar estructura básica
      if (typeof rules !== 'object' || rules === null) {
        throw new Error('Estructura de rules.json inválida');
      }
      
      console.log(`[JsonStorage.cargarRules] Reglas crudas cargadas, normalizando estructura`);
      return this.normalizeRules(rules);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`Archivo rules.json no encontrado en: ${rulesPath}`);
      }
      throw new Error(`Error cargando rules.json: ${error.message}`);
    }
  }



  async cargarArchivoExterno(nombreArchivo: string, institucion?: string): Promise<any> {
     console.log(`[JsonStorage.cargarArchivoExterno] Cargando archivo externo: ${nombreArchivo} para institución: ${institucion || 'global'}`);
     const filePath = institucion 
       ? path.join(this.dataDir, institucion, `${nombreArchivo}.json`)
       : path.join(this.dataDir, `${nombreArchivo}.json`);
     
     try {
       await fs.access(filePath);
       const contenido = await fs.readFile(filePath, 'utf-8');
       const datos = JSON.parse(contenido);
       
       // Validar estructura básica
       if (typeof datos !== 'object' || datos === null) {
         throw new Error(`Estructura de ${nombreArchivo}.json inválida`);
       }
       
       console.log(`[JsonStorage.cargarArchivoExterno] Archivo ${nombreArchivo}.json cargado exitosamente`);
       return datos;
     } catch (error: any) {
       if (error.code === 'ENOENT') {
         throw new Error(`Archivo ${nombreArchivo}.json no encontrado en: ${filePath}`);
       }
       throw new Error(`Error cargando ${nombreArchivo}.json: ${error.message}`);
     }
   }

  async cargarRulesCrudo(institucion?: string): Promise<any> {
    const rulesPath = institucion 
      ? path.join(this.dataDir, institucion, 'rules.json')
      : path.join(this.dataDir, 'rules.json');
    try {
      await fs.access(rulesPath);
      const contenido = await fs.readFile(rulesPath, 'utf-8');
      const rules = JSON.parse(contenido);
      
      // Validar estructura básica
      if (typeof rules !== 'object' || rules === null) {
        throw new Error('Estructura de rules.json inválida');
      }
      
      console.log(`[JsonStorage.cargarRulesCrudo] Reglas crudas cargadas desde: ${rulesPath}`);
      return rules;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`Archivo rules.json no encontrado en: ${rulesPath}`);
      }
      throw new Error(`Error cargando rules.json: ${error.message}`);
    }
  }

  async guardarRules(rules: any, institucion?: string): Promise<void> {
    const rulesPath = institucion 
      ? path.join(this.dataDir, institucion, 'rules.json')
      : path.join(this.dataDir, 'rules.json');
    
    try {
      // Validar que rules sea un objeto válido
      if (typeof rules !== 'object' || rules === null) {
        throw new Error('Las reglas deben ser un objeto válido');
      }

      // Asegurar que el directorio existe
      const dirPath = path.dirname(rulesPath);
      await fs.mkdir(dirPath, { recursive: true });

      // Guardar con formato legible (2 espacios de indentación)
      const contenido = JSON.stringify(rules, null, 2);
      await fs.writeFile(rulesPath, contenido, 'utf-8');
      
      console.log(`[JsonStorage.guardarRules] Reglas guardadas exitosamente en: ${rulesPath}`);
    } catch (error: any) {
      console.error(`[JsonStorage.guardarRules] Error guardando rules.json: ${error.message}`);
      throw new Error(`Error guardando rules.json: ${error.message}`);
    }
  }
}