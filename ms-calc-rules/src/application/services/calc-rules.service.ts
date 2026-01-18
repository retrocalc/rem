import { RulesDefinition, ContratoAttributes, CalculoResult, ConceptoRegla, DetalleConcepto } from '../../domain/interfaces/rules.interface';
import { JsonStorage } from '../../infrastructure/persistence/json-storage';
import { ParametrosClient } from '../../infrastructure/clients/parametros.client';
import { create, all } from 'mathjs';

class VariableFaltanteError extends Error {
  constructor(variable: string) {
    super(`Variable faltante: #${variable}`);
    this.name = 'VariableFaltanteError';
  }
}

export class CalcRulesService {
  private rulesCache: Map<string, RulesDefinition> = new Map();
  private archivosExternosCache: Map<string, Map<string, any>> = new Map(); // institucion -> (nombreArchivo -> datos)
  private defaultInstitucion = 'genchi';
  private math = create(all);
  private storage: JsonStorage;
  private parametrosClient: ParametrosClient;

  constructor(storage: JsonStorage, parametrosClient: ParametrosClient) {
    this.storage = storage;
    this.parametrosClient = parametrosClient;
    this.math.config({
      number: 'number',
      precision: 2
    });
    
    // Agregar funciones personalizadas de redondeo
    this.math.import({
      redondear: (valor: number, decimales: number = 0) => {
        const factor = Math.pow(10, decimales);
        return Math.round(valor * factor) / factor;
      },
      truncar: (valor: number, decimales: number = 0) => {
        const factor = Math.pow(10, decimales);
        return Math.trunc(valor * factor) / factor;
      },
      piso: (valor: number, decimales: number = 0) => {
        const factor = Math.pow(10, decimales);
        return Math.floor(valor * factor) / factor;
      },
      techo: (valor: number, decimales: number = 0) => {
        const factor = Math.pow(10, decimales);
        return Math.ceil(valor * factor) / factor;
      },
      toFixed: (valor: number, decimales: number = 0) => {
        // Similar a Number.toFixed pero devuelve número
        const factor = Math.pow(10, decimales);
        return Math.round(valor * factor) / factor;
      }
    }, { override: true });
  }

  async inicializar(): Promise<void> {
    console.log('[CalcRulesService.inicializar] Iniciando inicialización del servicio');
    // Obtener institución activa de ms-parametros
    let institucionActiva: string;
    try {
      console.log('[CalcRulesService.inicializar] Obteniendo institución activa de ms-parametros');
      institucionActiva = await this.parametrosClient.obtenerInstitucionActiva();
      console.log(`[CalcRulesService.inicializar] Institución activa obtenida: ${institucionActiva}`);
    } catch (error) {
      console.error('[CalcRulesService.inicializar] Error obteniendo institución activa, usando valor por defecto:', error instanceof Error ? error.message : String(error));
      institucionActiva = this.defaultInstitucion;
      console.log(`[CalcRulesService.inicializar] Usando institución por defecto: ${institucionActiva}`);
    }
    
    // Cargar reglas de la institución activa
    console.log(`[CalcRulesService.inicializar] Cargando reglas para institución: ${institucionActiva}`);
    await this.cargarReglasParaInstitucion(institucionActiva);
    console.log('[CalcRulesService.inicializar] Inicialización completada exitosamente');
  }


  private async cargarReglasParaInstitucion(institucion: string): Promise<void> {
    console.log(`[CalcRulesService.cargarReglasParaInstitucion] Verificando cache para institución: ${institucion}`);
    if (!this.rulesCache.has(institucion)) {
      console.log(`[CalcRulesService.cargarReglasParaInstitucion] Cache vacío, cargando reglas para: ${institucion}`);
      const rules = await this.storage.cargarRules(institucion);
      console.log(`[CalcRulesService.cargarReglasParaInstitucion] Reglas cargadas: ${Object.keys(rules).length} reglas`);
      this.rulesCache.set(institucion, rules);
      console.log(`[CalcRulesService.cargarReglasParaInstitucion] Cache actualizado para institución: ${institucion}`);
    } else {
      console.log(`[CalcRulesService.cargarReglasParaInstitucion] Reglas ya en cache para institución: ${institucion}`);
    }
  }

  private async cargarArchivoExternoConCache(nombreArchivo: string, institucion: string): Promise<any> {
    console.log(`[CalcRulesService.cargarArchivoExternoConCache] Solicitando archivo: ${nombreArchivo} para institución: ${institucion}`);
    
    // Inicializar cache para esta institución si no existe
    if (!this.archivosExternosCache.has(institucion)) {
      console.log(`[CalcRulesService.cargarArchivoExternoConCache] Inicializando cache de archivos para institución: ${institucion}`);
      this.archivosExternosCache.set(institucion, new Map());
    }
    
    const cacheInstitucion = this.archivosExternosCache.get(institucion)!;
    
    if (!cacheInstitucion.has(nombreArchivo)) {
      console.log(`[CalcRulesService.cargarArchivoExternoConCache] Archivo ${nombreArchivo} no en cache, cargando desde almacenamiento`);
      const datos = await this.storage.cargarArchivoExterno(nombreArchivo, institucion);
      cacheInstitucion.set(nombreArchivo, datos);
      console.log(`[CalcRulesService.cargarArchivoExternoConCache] Archivo ${nombreArchivo} cargado en cache`);
    } else {
      console.log(`[CalcRulesService.cargarArchivoExternoConCache] Archivo ${nombreArchivo} ya en cache`);
    }
    
    return cacheInstitucion.get(nombreArchivo);
  }

  async calcular(attributes: ContratoAttributes): Promise<CalculoResult> {
    console.log('[CalcRulesService.calcular] Iniciando cálculo con atributos:', JSON.stringify(attributes));
    let institucion = attributes.institucion;
    
    // Si no viene institución, obtenerla de ms-parametros
    if (!institucion) {
      console.log('[CalcRulesService.calcular] Institución no proporcionada, obteniendo de ms-parametros');
      try {
        institucion = await this.parametrosClient.obtenerInstitucionActiva();
        console.log(`[CalcRulesService.calcular] Institución activa obtenida para cálculo: ${institucion}`);
      } catch (error) {
        console.error('[CalcRulesService.calcular] Error obteniendo institución activa, usando valor por defecto:', error instanceof Error ? error.message : String(error));
        institucion = this.defaultInstitucion;
        console.log(`[CalcRulesService.calcular] Usando institución por defecto: ${institucion}`);
      }
    } else {
      console.log(`[CalcRulesService.calcular] Institución proporcionada: ${institucion}`);
    }
    
    console.log(`[CalcRulesService.calcular] Cargando reglas para institución: ${institucion}`);
    await this.cargarReglasParaInstitucion(institucion);
    console.log(`[CalcRulesService.calcular] Institución=${institucion}, reglas cargadas=${Object.keys(this.rulesCache.get(institucion) || {}).length}`);
    const rules = this.rulesCache.get(institucion)!;
    
    // Obtener mes de proceso de los parámetros
    let mesProceso: string;
    try {
      const parametros = await this.parametrosClient.obtenerParametros();
      mesProceso = parametros.mes_anio_proceso;
      console.log(`[CalcRulesService.calcular] Mes de proceso obtenido de parámetros: ${mesProceso}`);
    } catch (error) {
      console.error('[CalcRulesService.calcular] Error obteniendo parámetros, usando mes por defecto:', error instanceof Error ? error.message : String(error));
      // Usar mes actual como fallback (formato YYYY-MM)
      const ahora = new Date();
      mesProceso = `${ahora.getFullYear()}-${(ahora.getMonth() + 1).toString().padStart(2, '0')}`;
      console.log(`[CalcRulesService.calcular] Usando mes por defecto: ${mesProceso}`);
    }
    
    const context: Record<string, any> = { ...attributes };
    const resultados: Record<string, number> = {};
    const detalles: Record<string, DetalleConcepto> = {};
    console.log('[CalcRulesService.calcular] Contexto inicial:', JSON.stringify(context));
    console.log(`[CalcRulesService.calcular] Mes de proceso para filtrado: ${mesProceso}`);

    // Aplanar y filtrar conceptos por vigencia
    const conceptosAValuar: Array<{nombre: string, concepto: ConceptoRegla, categoria: string}> = [];
    console.log('[CalcRulesService.calcular] Recopilando conceptos vigentes');
    
    for (const [categoria, conceptos] of Object.entries(rules)) {
      console.log(`[CalcRulesService.calcular] Procesando categoría: ${categoria}`);
      for (const [nombreConcepto, concepto] of Object.entries(conceptos)) {
        if (this.estaVigente(concepto, mesProceso)) {
          console.log(`[CalcRulesService.calcular] Concepto vigente: ${nombreConcepto} (${concepto.glosa})`);
          conceptosAValuar.push({nombre: nombreConcepto, concepto, categoria});
        } else {
          console.log(`[CalcRulesService.calcular] Concepto NO vigente para mes ${mesProceso}: ${nombreConcepto}`);
        }
      }
    }
    
    console.log(`[CalcRulesService.calcular] Total conceptos vigentes a procesar: ${conceptosAValuar.length}`);

    // Procesar cada concepto en orden de aparición (manteniendo orden por categoría y nombre)
    for (const {nombre, concepto, categoria} of conceptosAValuar) {
      console.log(`[CalcRulesService.calcular] Procesando concepto "${nombre}" = "${concepto.formula}" (${concepto.glosa})`);
      try {
        console.log(`[CalcRulesService.calcular] Evaluando fórmula para "${nombre}"`);
        const valor = await this.evaluarFormula(concepto.formula, context, resultados);
        console.log(`[CalcRulesService.calcular] Concepto "${nombre}" evaluado: ${valor}`);
        resultados[nombre] = valor;
        console.log(`[CalcRulesService.calcular] Concepto "${nombre}" - imprimir_liq_si_0: ${concepto.imprimir_liq_si_0}`);
        detalles[nombre] = {
          valor,
          formula: concepto.formula,
          glosa: concepto.glosa,
          afectos: concepto.afectos,
          categoria,
          vigencia_desde: concepto.vigencia_desde,
          vigencia_hasta: concepto.vigencia_hasta,
          imprimir_liq_si_0: concepto.imprimir_liq_si_0 ?? false
        };
        
        // Agregar al contexto para uso en fórmulas posteriores
        context[nombre] = valor;
        console.log(`[CalcRulesService.calcular] Variable "${nombre}" agregada al contexto con valor: ${valor}`);
      } catch (error: any) {
        console.error(`[CalcRulesService.calcular] Error evaluando concepto "${nombre}":`, error.message, 'Type:', error.constructor.name, 'Instance of VariableFaltanteError?', error instanceof VariableFaltanteError);
        // Si el concepto no puede evaluarse por falta de variables, la omitimos
        if (error instanceof VariableFaltanteError) {
          console.log(`[CalcRulesService.calcular] Concepto "${nombre}" omitido por variable faltante`);
          continue;
        }
        // Si mathjs reporta variable no definida, también omitimos
        if (error.message && (error.message.includes('Undefined symbol') || error.message.includes('undefined') || error.message.includes('is not defined') || error.message.includes('Variable faltante'))) {
          console.log(`[CalcRulesService.calcular] Concepto "${nombre}" omitido por variable no definida: ${error.message}`);
          continue;
        }
        // Para cualquier otro error, lo lanzamos
        throw new Error(`[CalcRulesService.calcular] Error evaluando concepto "${nombre}": ${error.message}`);
      }
    }

    // Calcular total sumando todas las variables calculadas (excepto las que no son montos)
    console.log('[CalcRulesService.calcular] Calculando total de resultados');
    const total = Object.values(resultados).reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0);
    console.log(`[CalcRulesService.calcular] Total calculado: ${total}`);

    // Extraer valores principales (sueldo_base y bienios son esperados, pero pueden ser 0)
    const sueldo_base = resultados.sueldo_base || 0;
    const bienios = resultados.bienios || 0;
    console.log(`[CalcRulesService.calcular] Valores principales - sueldo_base: ${sueldo_base}, bienios: ${bienios}`);
    console.log(`[CalcRulesService.calcular] Detalles calculados: ${Object.keys(detalles).length} conceptos`);

    const resultadoFinal = {
      sueldo_base,
      bienios,
      total,
      detalles
    };
    console.log('[CalcRulesService.calcular] Cálculo completado exitosamente. Resultado:', JSON.stringify(resultadoFinal).substring(0, 300));
    return resultadoFinal;
  }

  async refrescar(): Promise<void> {
    console.log('[CalcRulesService.refrescar] Refrescando reglas y limpiando cache');
    // Limpiar cache para forzar recarga desde disco
    console.log('[CalcRulesService.refrescar] Limpiando cache de reglas');
    this.rulesCache.clear();
    console.log('[CalcRulesService.refrescar] Cache limpiado');
    
    // Obtener institución activa y recargar sus reglas
    let institucionActiva: string;
    try {
      console.log('[CalcRulesService.refrescar] Obteniendo institución activa de ms-parametros');
      institucionActiva = await this.parametrosClient.obtenerInstitucionActiva();
      console.log(`[CalcRulesService.refrescar] Refrescando reglas para institución activa: ${institucionActiva}`);
    } catch (error) {
      console.error('[CalcRulesService.refrescar] Error obteniendo institución activa para refrescar, usando valor por defecto:', error instanceof Error ? error.message : String(error));
      institucionActiva = this.defaultInstitucion;
      console.log(`[CalcRulesService.refrescar] Usando institución por defecto: ${institucionActiva}`);
    }
    
    // Recargar reglas de la institución activa
    console.log(`[CalcRulesService.refrescar] Cargando reglas para institución: ${institucionActiva}`);
    await this.cargarReglasParaInstitucion(institucionActiva);
    console.log('[CalcRulesService.refrescar] Refresco completado exitosamente');
  }

  private async evaluarFormula(
    formula: string, 
    context: Record<string, any>,
    resultados: Record<string, number>
  ): Promise<number> {
    console.log(`[CalcRulesService.evaluarFormula] Evaluando fórmula: "${formula}"`);
    console.log(`[CalcRulesService.evaluarFormula] Contexto disponible: ${Object.keys(context).join(', ')}`);
    console.log(`[CalcRulesService.evaluarFormula] Resultados previos: ${Object.keys(resultados).join(', ')}`);
    
    // Reemplazar referencias a datos externos (!archivo.!seccion.#variable, !archivo.#clave1.#clave2, etc.)
    let formulaProcesada = formula;
    
    // Buscar patrones como !archivo.!seccion.#variable o !archivo.#clave1.#clave2...
    const pattern = /!([a-zA-Z_][a-zA-Z0-9_]*)((?:\.[!#][a-zA-Z_][a-zA-Z0-9_]*)+)/g;
    let match;
    
    while ((match = pattern.exec(formula)) !== null) {
      const [fullMatch, archivo, pathSegments] = match;
      console.log(`[CalcRulesService.evaluarFormula] Encontrado patrón externo: ${fullMatch} (archivo: ${archivo}, path: ${pathSegments})`);
      
      // Procesar el path: dividir por puntos, cada segmento empieza con ! o #
      const segments = pathSegments.split('.').filter(s => s.length > 0);
      console.log(`[CalcRulesService.evaluarFormula] Segmentos procesados: ${JSON.stringify(segments)}`);
      
      let valorFinal: number;
      

        // Para archivos externos genéricos (EUS.json, etc.)
        // Necesitamos cargar el archivo desde cache/almacenamiento
        // El path puede contener segmentos !literal o #variable
        // Ejemplo: !EUS.#cargo.#grado -> archivo=EUS, segments=['#cargo', '#grado']
        // Necesitamos navegar por el JSON usando los valores de las variables del contexto
        console.log(`[CalcRulesService.evaluarFormula] Procesando archivo externo: ${archivo}.json`);
        
        // Obtener la institución del contexto (si está disponible)
        const institucion = context.institucion || 'genchi';
        
        // Cargar archivo externo usando cache
        const datosArchivo = await this.cargarArchivoExternoConCache(archivo, institucion);
        
        // Navegar por la estructura del archivo
        let currentData: any = datosArchivo;
        for (let i = 0; i < segments.length; i++) {
          const segment = segments[i];
          const isLiteral = segment.startsWith('!');
          const isVariable = segment.startsWith('#');
          
          let key: string;
          if (isLiteral) {
            key = segment.substring(1); // quitar el !
          } else if (isVariable) {
            const variableName = segment.substring(1); // quitar el #
            if (context[variableName] === undefined) {
              console.log(`[CalcRulesService.evaluarFormula] Variable ${variableName} no encontrada en contexto`);
              throw new VariableFaltanteError(variableName);
            }
            key = context[variableName];
          } else {
            // No debería ocurrir porque el patrón asegura que empieza con ! o #
            throw new Error(`Segmento inválido en patrón: ${segment}`);
          }
          
          console.log(`[CalcRulesService.evaluarFormula] Navegando a key "${key}" (segmento ${segment})`);
          
          if (currentData === null || typeof currentData !== 'object' || !(key in currentData)) {
            console.error(`[CalcRulesService.evaluarFormula] No se puede navegar a "${key}" en estructura de ${archivo}.json. Datos actuales:`, currentData);
            throw new Error(`No se puede navegar a "${key}" en estructura de ${archivo}.json`);
          }
          
          currentData = currentData[key];
        }
        
        // Esperamos que el valor final sea un número o un objeto con propiedad 'monto'
        console.log(`[CalcRulesService.evaluarFormula] Valor final crudo de ${archivo}.json:`, currentData);
        
        if (typeof currentData === 'number') {
          valorFinal = currentData;
        } else if (typeof currentData === 'object' && currentData !== null && 'monto' in currentData && typeof currentData.monto === 'number') {
          valorFinal = currentData.monto;
        } else {
          console.error(`[CalcRulesService.evaluarFormula] Valor final inválido en ${archivo}.json:`, currentData);
          throw new Error(`Valor final inválido en ${archivo}.json: no es un número ni objeto con propiedad 'monto' numérica`);
        }
      
      // Reemplazar el patrón completo por el valor numérico
      formulaProcesada = formulaProcesada.replace(fullMatch, valorFinal.toString());
      console.log(`[CalcRulesService.evaluarFormula] Fórmula actualizada: "${formulaProcesada}"`);
    }
    
    // Reemplazar variables del contexto (#grado, cantidad_bienios, etc.)
    console.log('[CalcRulesService.evaluarFormula] Reemplazando variables del contexto (#prefijo)');
    for (const [key, value] of Object.entries(context)) {
      if (typeof value === 'number') {
        const variablePattern = new RegExp(`#${key}`, 'g');
        const antes = formulaProcesada;
        formulaProcesada = formulaProcesada.replace(variablePattern, value.toString());
        if (antes !== formulaProcesada) {
          console.log(`[CalcRulesService.evaluarFormula] Reemplazada variable #${key} con valor: ${value}`);
        }
      }
    }
    
    // Reemplazar variables ya calculadas (sueldo_base, etc.)
    console.log('[CalcRulesService.evaluarFormula] Reemplazando variables ya calculadas');
    for (const [key, value] of Object.entries(resultados)) {
      const variablePattern = new RegExp(key, 'g');
      const antes = formulaProcesada;
      formulaProcesada = formulaProcesada.replace(variablePattern, value.toString());
      if (antes !== formulaProcesada) {
        console.log(`[CalcRulesService.evaluarFormula] Reemplazada variable ${key} con valor: ${value}`);
      }
    }
    
    // Detectar variables faltantes (#variable que no fueron reemplazadas)
    console.log('[CalcRulesService.evaluarFormula] Verificando variables faltantes en fórmula procesada');
    const variableFaltantePattern = /#([a-zA-Z_][a-zA-Z0-9_]*)/g;
    let faltanteMatch;
    while ((faltanteMatch = variableFaltantePattern.exec(formulaProcesada)) !== null) {
      const variableFaltante = faltanteMatch[1];
      console.log(`[CalcRulesService.evaluarFormula] Variable faltante detectada: #${variableFaltante}`);
      throw new VariableFaltanteError(variableFaltante);
    }
    console.log(`[CalcRulesService.evaluarFormula] Fórmula procesada final: "${formulaProcesada}"`);
    
    // Evaluar expresión matemática
    console.log('[CalcRulesService.evaluarFormula] Evaluando expresión matemática con MathJS');
    try {
      const resultado = this.math.evaluate(formulaProcesada);
      console.log(`[CalcRulesService.evaluarFormula] Resultado de MathJS: ${resultado} (tipo: ${typeof resultado})`);
      if (typeof resultado !== 'number') {
        console.error(`[CalcRulesService.evaluarFormula] La fórmula no devolvió un número válido: ${resultado}`);
        throw new Error(`La fórmula "${formula}" no devolvió un número válido`);
      }
      console.log(`[CalcRulesService.evaluarFormula] Fórmula evaluada exitosamente: ${resultado}`);
      return resultado;
    } catch (error: any) {
      console.error('[CalcRulesService.evaluarFormula] MathJS evaluation error:', error.message, 'Formula:', formulaProcesada, 'Stack:', error.stack);
      // Si mathjs reporta variable no definida, lanzar VariableFaltanteError
      if (error.message && error.message.includes('Undefined symbol')) {
        // Extraer el nombre del símbolo del mensaje: "Undefined symbol sueldo_base"
        const match = error.message.match(/Undefined symbol (\w+)/);
        const symbol = match ? match[1] : 'unknown';
        console.error('[CalcRulesService.evaluarFormula] Undefined symbol detected:', symbol);
        throw new VariableFaltanteError(symbol);
      }
      // También capturar otros errores de variable no definida (diferentes versiones de mathjs)
      if (error.message && (error.message.includes('undefined') || error.message.includes('is not defined'))) {
        console.error('[CalcRulesService.evaluarFormula] Variable undefined error:', error.message);
        // Intentar extraer el nombre de la variable del mensaje
        const match = error.message.match(/(\w+)(?: is not defined| undefined)/);
        const symbol = match ? match[1] : 'unknown';
        throw new VariableFaltanteError(symbol);
      }
      console.error(`[CalcRulesService.evaluarFormula] Error general evaluando fórmula: ${error.message}`);
      throw new Error(`Error evaluando fórmula "${formulaProcesada}": ${error.message}`);
    }
    }
    
    private estaVigente(concepto: ConceptoRegla, mesProceso: string): boolean {
        console.log(`[CalcRulesService.estaVigente] Verificando vigencia para mes ${mesProceso}, concepto vigencia_desde: ${concepto.vigencia_desde}, vigencia_hasta: ${concepto.vigencia_hasta}`);
        
        // Normalizar mesProceso a formato YYYY-MM (asegurar que tenga mes completo)
        const mesProcesoNormalizado = mesProceso.length > 7 ? mesProceso.substring(0, 7) : mesProceso;
        
        // Normalizar vigencia_desde: extraer YYYY-MM
        const vigenciaDesdeNormalizado = concepto.vigencia_desde.length > 7 ? concepto.vigencia_desde.substring(0, 7) : concepto.vigencia_desde;
        
        // Comparar mesProceso >= vigencia_desde
        if (mesProcesoNormalizado < vigenciaDesdeNormalizado) {
            console.log(`[CalcRulesService.estaVigente] Mes ${mesProcesoNormalizado} es anterior a vigencia_desde ${vigenciaDesdeNormalizado} → NO VIGENTE`);
            return false;
        }
        
        // Si vigencia_hasta está vacía, está vigente indefinidamente
        if (!concepto.vigencia_hasta || concepto.vigencia_hasta.trim() === '') {
            console.log(`[CalcRulesService.estaVigente] Vigencia_hasta vacía → VIGENTE INDEFINIDAMENTE`);
            return true;
        }
        
        // Normalizar vigencia_hasta
        const vigenciaHastaNormalizado = concepto.vigencia_hasta.length > 7 ? concepto.vigencia_hasta.substring(0, 7) : concepto.vigencia_hasta;
        
        // Comparar mesProceso <= vigencia_hasta
        if (mesProcesoNormalizado > vigenciaHastaNormalizado) {
            console.log(`[CalcRulesService.estaVigente] Mes ${mesProcesoNormalizado} es posterior a vigencia_hasta ${vigenciaHastaNormalizado} → NO VIGENTE`);
            return false;
        }
        
        console.log(`[CalcRulesService.estaVigente] Mes ${mesProcesoNormalizado} está dentro del rango ${vigenciaDesdeNormalizado} - ${vigenciaHastaNormalizado} → VIGENTE`);
        return true;
    }
    
  

  async obtenerInstitucionActiva(): Promise<string> {
    console.log('[CalcRulesService.obtenerInstitucionActiva] Obteniendo institución activa');
    try {
      const institucion = await this.parametrosClient.obtenerInstitucionActiva();
      console.log(`[CalcRulesService.obtenerInstitucionActiva] Institución activa obtenida: ${institucion}`);
      return institucion;
    } catch (error) {
      console.error('[CalcRulesService.obtenerInstitucionActiva] Error obteniendo institución activa:', error instanceof Error ? error.message : String(error));
      console.log(`[CalcRulesService.obtenerInstitucionActiva] Usando institución por defecto: ${this.defaultInstitucion}`);
      return this.defaultInstitucion;
    }
  }

   async getRules(institucion?: string): Promise<RulesDefinition> {
     console.log(`[CalcRulesService.getRules] Solicitando reglas para institución: ${institucion || '(no especificada)'}`);
     const institucionActiva = institucion || await this.obtenerInstitucionActiva();
     console.log(`[CalcRulesService.getRules] Institución activa determinada: ${institucionActiva}`);
     
     // Asegurar que las reglas estén cargadas para esta institución
     console.log(`[CalcRulesService.getRules] Asegurando reglas cargadas para ${institucionActiva}`);
     await this.cargarReglasParaInstitucion(institucionActiva);
     
     const rules = this.rulesCache.get(institucionActiva);
     const rulesCount = rules ? Object.keys(rules).length : 0;
     console.log(`[CalcRulesService.getRules] Reglas obtenidas: ${rulesCount} reglas para ${institucionActiva}`);
     return rules ? { ...rules } : {};
   }

   async getRulesCrudo(institucion?: string): Promise<any> {
     console.log(`[CalcRulesService.getRulesCrudo] Solicitando reglas crudas para institución: ${institucion || '(no especificada)'}`);
     const institucionActiva = institucion || await this.obtenerInstitucionActiva();
     console.log(`[CalcRulesService.getRulesCrudo] Institución activa determinada: ${institucionActiva}`);
     
     const rulesCrudas = await this.storage.cargarRulesCrudo(institucionActiva);
     console.log(`[CalcRulesService.getRulesCrudo] Reglas crudas obtenidas: ${Object.keys(rulesCrudas).length} categorías`);
     return rulesCrudas;
   }

   async guardarRules(rules: any, institucion?: string): Promise<void> {
     console.log(`[CalcRulesService.guardarRules] Guardando reglas para institución: ${institucion || '(no especificada)'}`);
     const institucionActiva = institucion || await this.obtenerInstitucionActiva();
     console.log(`[CalcRulesService.guardarRules] Institución activa determinada: ${institucionActiva}`);
     
     // Validar estructura básica
     if (typeof rules !== 'object' || rules === null) {
       throw new Error('Las reglas deben ser un objeto válido');
     }

     // Guardar en almacenamiento
     await this.storage.guardarRules(rules, institucionActiva);
     
     // Limpiar cache para forzar recarga en próximo acceso
     this.rulesCache.delete(institucionActiva);
     console.log(`[CalcRulesService.guardarRules] Reglas guardadas y cache limpiado para institución: ${institucionActiva}`);
   }


 }