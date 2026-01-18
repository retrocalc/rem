# Dockerización de Microservicios

Este proyecto ha sido dockerizado para facilitar su despliegue y ejecución en contenedores.

## Estructura

Cada componente (microservicios y gateways) tiene su propio Dockerfile. La orquestación se realiza mediante `docker-compose.yml`.

### Servicios

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| api-gateway | 3000 | Gateway principal que enruta peticiones |
| command-gateway | 3007 | Gateway para comandos |
| query-gateway | 3006 | Gateway para consultas |
| ms-parametros | 3001 | Microservicio de parámetros |
| ms-empleados | 3002 | Microservicio de empleados |
| ms-contratos | 3003 | Microservicio de contratos |
| ms-calculos | 3004 | Microservicio de cálculos |
| ms-calc-rules | 3005 | Microservicio de reglas de cálculo |
| redis | 6379 | Cache Redis (opcional) |

## Requisitos

- Docker
- Docker Compose

## Comandos básicos

### Construir todas las imágenes

```bash
docker-compose build
```

### Ejecutar todos los servicios en segundo plano

```bash
docker-compose up -d
```

### Ver logs

```bash
docker-compose logs -f
```

### Detener todos los servicios

```bash
docker-compose down
```

### Construir y ejecutar un servicio específico

```bash
docker-compose up -d --build ms-parametros
```

## Variables de entorno

Cada servicio puede configurarse mediante variables de entorno. Las principales son:

- `PORT`: Puerto interno del servicio (por defecto según tabla)
- `NODE_ENV`: Entorno (production/development)
- `LOG_LEVEL`: Nivel de logging (info, debug, error)
- `JSON_DATA_PATH`: Ruta al archivo JSON de datos (microservicios)
- `REDIS_HOST`, `REDIS_PORT`: Configuración de Redis (gateways)

### URLs de servicios

Los gateways (api-gateway, command-gateway, query-gateway) utilizan variables de entorno para definir las URLs de los microservicios. En docker-compose.yml se configuran automáticamente usando los nombres de servicio de Docker.

Ejemplo:
- `PARAMETROS_URL=http://ms-parametros:3001/api`
- `EMPLEADOS_URL=http://ms-empleados:3002/api`

## Persistencia de datos

Los microservicios almacenan datos en archivos JSON dentro del contenedor. Se han definido volúmenes Docker para persistir estos datos:

- `parametros-data`, `empleados-data`, etc.

Los logs también se persisten en volúmenes separados.

## Red

Todos los servicios se conectan a la red `app-network`, permitiendo la comunicación interna mediante nombres de servicio.

## Desarrollo

Para desarrollo local sin Docker, cada servicio puede ejecutarse individualmente con `npm run dev` en su directorio.

## Notas

- Redis está configurado pero deshabilitado por defecto en los gateways (`cache.enabled: false`). Para habilitarlo, modificar la configuración en cada gateway.
- Los microservicios crean automáticamente los archivos de datos si no existen.
- Los puertos expuestos en el host coinciden con los puertos internos (ej. 3001:3001).