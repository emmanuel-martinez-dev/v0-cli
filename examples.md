# Ejemplos de Uso del v0 CLI

## Configuración Inicial

```bash
# Configuración interactiva completa
v0 config setup

# O configurar paso a paso
v0 config set-api-key YOUR_API_KEY
v0 config set-output-format json
```

## Flujo de Desarrollo Completo

### 1. Crear un Proyecto
```bash
# Crear proyecto con descripción
v0 project create "Mi App React" --description "Una aplicación de todo con React y TypeScript"

# O crear interactivamente
v0 project create
```

### 2. Crear un Chat para el Proyecto
```bash
# Crear chat con mensaje inicial
v0 chat create "Crea una aplicación de todo con React, TypeScript y Tailwind CSS" \
  --system "Eres un experto desarrollador de React" \
  --privacy private \
  --model v0-1.5-md

# O crear interactivamente
v0 chat create
```

### 3. Enviar Mensajes Adicionales
```bash
# Enviar mensaje a un chat específico
v0 chat message CHAT_ID "Agrega persistencia local con localStorage"

# O enviar interactivamente
v0 chat message CHAT_ID
```

### 4. Crear un Deployment
```bash
# Crear deployment
v0 deploy create PROJECT_ID CHAT_ID VERSION_ID

# Ver logs del deployment
v0 deploy logs DEPLOYMENT_ID

# Ver errores si los hay
v0 deploy errors DEPLOYMENT_ID
```

## Automatización y Scripts

### Crear Chat y Obtener URL
```bash
#!/bin/bash
# Crear chat y obtener URL
CHAT_RESPONSE=$(v0 chat create "Crea un navbar responsive" --output json)
CHAT_URL=$(echo $CHAT_RESPONSE | jq -r '.webUrl')
CHAT_ID=$(echo $CHAT_RESPONSE | jq -r '.id')

echo "Chat creado: $CHAT_URL"
echo "Chat ID: $CHAT_ID"
```

### Listar Proyectos en Formato JSON
```bash
# Obtener lista de proyectos en JSON
v0 project list --output json | jq '.[] | {id: .id, name: .name, url: .url}'
```

### Monitorear Deployments
```bash
#!/bin/bash
# Script para monitorear deployments
PROJECT_ID="your-project-id"

echo "Deployments activos:"
v0 deploy list --project-id $PROJECT_ID --output json | jq '.[] | {id: .id, status: "active"}'

# Ver logs de todos los deployments
for deployment in $(v0 deploy list --project-id $PROJECT_ID --output json | jq -r '.[].id'); do
  echo "Logs para deployment $deployment:"
  v0 deploy logs $deployment
done
```

## Casos de Uso Avanzados

### Desarrollo Iterativo
```bash
# 1. Crear chat inicial
v0 chat create "Crea un componente de login"

# 2. Refinar el componente
v0 chat message CHAT_ID "Agrega validación de email"

# 3. Mejorar el diseño
v0 chat message CHAT_ID "Usa Tailwind CSS para el diseño"

# 4. Agregar funcionalidad
v0 chat message CHAT_ID "Agrega integración con API de autenticación"
```

### Gestión de Proyectos
```bash
# Crear múltiples proyectos
v0 project create "Frontend App"
v0 project create "Backend API"
v0 project create "Mobile App"

# Listar todos los proyectos
v0 project list

# Obtener detalles de un proyecto específico
v0 project get PROJECT_ID
```

### Monitoreo de Usuario
```bash
# Ver información del usuario
v0 user info

# Ver plan y billing
v0 user plan

# Ver rate limits
v0 user rate-limits

# Ver scopes disponibles
v0 user scopes
```

## Integración con CI/CD

### GitHub Actions
```yaml
name: v0 Deployment
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install v0 CLI
        run: npm install -g v0-cli
        
      - name: Configure v0
        run: |
          v0 config set-api-key ${{ secrets.V0_API_KEY }}
          
      - name: Create deployment
        run: |
          v0 deploy create ${{ secrets.PROJECT_ID }} ${{ secrets.CHAT_ID }} ${{ secrets.VERSION_ID }}
          
      - name: Check deployment status
        run: |
          v0 deploy logs DEPLOYMENT_ID
```

### Script de Automatización
```bash
#!/bin/bash
# deploy.sh - Script de automatización

set -e

# Configuración
PROJECT_ID="$1"
CHAT_ID="$2"
VERSION_ID="$3"

if [ -z "$PROJECT_ID" ] || [ -z "$CHAT_ID" ] || [ -z "$VERSION_ID" ]; then
  echo "Uso: $0 PROJECT_ID CHAT_ID VERSION_ID"
  exit 1
fi

echo "🚀 Iniciando deployment..."

# Crear deployment
DEPLOYMENT_ID=$(v0 deploy create $PROJECT_ID $CHAT_ID $VERSION_ID --output json | jq -r '.id')

echo "✅ Deployment creado: $DEPLOYMENT_ID"

# Esperar y verificar logs
echo "📋 Verificando logs..."
sleep 10

LOGS=$(v0 deploy logs $DEPLOYMENT_ID --output json)
ERRORS=$(v0 deploy errors $DEPLOYMENT_ID --output json)

if [ "$(echo $ERRORS | jq -r '.error')" != "null" ]; then
  echo "❌ Deployment falló:"
  echo $ERRORS | jq -r '.error'
  exit 1
fi

echo "✅ Deployment completado exitosamente!"
echo "🔗 URL: $(v0 deploy get $DEPLOYMENT_ID --output json | jq -r '.webUrl')"
```

## Troubleshooting

### Problemas Comunes

1. **API Key no válida**
```bash
# Verificar configuración
v0 config show

# Reconfigurar API key
v0 config set-api-key NEW_API_KEY
```

2. **Rate limit excedido**
```bash
# Verificar rate limits
v0 user rate-limits

# Esperar y reintentar
sleep 60
v0 chat create "Mensaje"
```

3. **Deployment falló**
```bash
# Ver errores del deployment
v0 deploy errors DEPLOYMENT_ID

# Ver logs completos
v0 deploy logs DEPLOYMENT_ID
```

### Debugging

```bash
# Habilitar modo verbose
v0 chat list --verbose

# Usar formato JSON para debugging
v0 chat get CHAT_ID --output json | jq '.'

# Ver configuración actual
v0 config show
```

## Mejores Prácticas

1. **Usar proyectos para organizar trabajo**
2. **Configurar API key una sola vez**
3. **Usar formatos JSON para automatización**
4. **Monitorear rate limits**
5. **Verificar logs de deployments**
6. **Usar confirmaciones para operaciones destructivas** 