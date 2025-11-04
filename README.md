# WhatsApp Chat Visualizador

## 🚀 Aplicación para visualizar chats de WhatsApp de tu bot N8N

Esta aplicación web te permite visualizar de forma intuitiva todas las conversaciones que tu bot de N8N ha tenido con clientes a través de WhatsApp.

## 📋 Características

- ✅ **Interfaz moderna** inspirada en WhatsApp
- ✅ **Lista de contactos** en el menú lateral
- ✅ **Visualización de chats** con burbujas de mensajes
- ✅ **Búsqueda de contactos** en tiempo real
- ✅ **Actualización manual** de datos
- ✅ **Exportación de chats** en formato JSON
- ✅ **Diseño responsive** para desktop y móvil
- ✅ **Manejo de errores** con mensajes informativos

## 🔧 Instalación y Uso

### 1. Archivos incluidos:
- `index.html` - Página principal
- `styles.css` - Estilos de la aplicación
- `script.js` - Lógica de la aplicación
- `README.md` - Este archivo

### 2. Configuración:
Los endpoints están configurados en `script.js`:
```javascript
const CONFIG = {
    CONTACTS_ENDPOINT: 'https://n8n.uni.uy/webhook/3b5f9ce4-3482-4077-aa8c-cb0def78dd4a',
    MESSAGES_ENDPOINT: 'https://n8n.uni.uy/webhook/a7e6d994-fe18-4b68-8d47-cba715c349c4'
};
```

### 3. Ejecutar la aplicación:
1. Abre `index.html` en tu navegador web
2. La aplicación cargará automáticamente los contactos
3. Haz clic en cualquier contacto para ver sus mensajes

## 🧪 Pruebas

### Endpoint de mensajes FUNCIONANDO ✅
- URL de prueba: `https://n8n.uni.uy/webhook/a7e6d994-fe18-4b68-8d47-cba715c349c4?wa_id=59896243943`
- Formato de respuesta:
```json
[
  {
    "mensaje": "hola, tengo algun evento agendado?"
  },
  {
    "mensaje": "Hola, ¿cómo estás? ¿Con quién tengo el gusto?"
  },
  {
    "mensaje": "dime todo lo que venden"
  },
  {
    "mensaje": "Vendemos los gimnasios inteligentes de Speediance..."
  }
]
```

### Endpoint de contactos (temporalmente no disponible)
- La aplicación incluye contactos de prueba mientras el endpoint esté inactivo
- Contactos de prueba disponibles:
  - +598 9624 3943 (con mensajes reales)
  - +598 1234 5678 (ejemplo)
  - +598 9876 5432 (ejemplo)

## 🛠️ Debugging

La aplicación incluye herramientas de debug accesibles desde la consola del navegador:

```javascript
// Ver estado actual de la aplicación
debugApp.getState()

// Ver configuración
debugApp.getConfig()

// Cargar contactos manualmente
debugApp.loadContacts()

// Cargar mensajes de un contacto específico
debugApp.loadMessages('59896243943')

// Probar una URL
debugApp.testUrl('https://n8n.uni.uy/webhook/...')
```

## 🎨 Funcionalidades de la Interfaz

### Menú lateral:
- Lista de todos los contactos/números
- Búsqueda en tiempo real
- Botón de actualización
- Indicador visual del contacto activo

### Área de chat:
- Header con información del contacto
- Mensajes con formato de burbujas
- Distinción visual entre mensajes enviados y recibidos
- Timestamps de los mensajes
- Scroll automático al final

### Características adicionales:
- Modal de errores informativos
- Estados de carga con spinners
- Exportación de chats en JSON
- Responsive design para móviles

## 🔍 Solución de Problemas

### Si no se cargan los contactos:
1. Verifica que el endpoint de contactos esté activo en N8N
2. La aplicación mostrará contactos de prueba automáticamente
3. Revisa la consola del navegador para mensajes de debug

### Si no se cargan los mensajes:
1. Verifica que el número de teléfono sea correcto
2. Asegúrate de que el endpoint de mensajes esté funcionando
3. Usa `debugApp.testUrl()` para probar el endpoint manualmente

### Errores de CORS:
- Los endpoints deben permitir requests desde el navegador
- Verifica la configuración de CORS en N8N

## 📞 Números de Prueba

- **59896243943** - Número con mensajes reales disponibles
- Otros números se pueden agregar modificando la función `getTestContacts()` en `script.js`

## 🔄 Actualizaciones

Para actualizar los datos:
- Haz clic en el botón de actualizar (🔄) en el menú de contactos
- Haz clic en el botón de actualizar en el header del chat
- Recarga la página completamente

---

**¡La aplicación está lista para usar! 🎉**

Abre `index.html` en tu navegador y prueba seleccionando el contacto +598 9624 3943 para ver los mensajes reales.