// Configuración de la aplicación
const CONFIG = {
    CONTACTS_ENDPOINT: 'https://n8n.uni.uy/webhook/836a0458-afca-49cf-89ce-52175df68f22',
    MESSAGES_ENDPOINT: 'https://n8n.uni.uy/webhook/53a9274e-e3a7-4003-b100-c2dfc5a6477a'
};

// Estado de la aplicación
let appState = {
    contacts: [],
    currentContact: null,
    currentMessages: [],
    isLoadingContacts: false,
    isLoadingMessages: false
};

// Referencias a elementos del DOM
const elements = {
    contactsList: document.getElementById('contactsList'),
    messagesContainer: document.getElementById('messagesContainer'),
    welcomeScreen: document.getElementById('welcomeScreen'),
    chatContainer: document.getElementById('chatContainer'),
    currentContactName: document.getElementById('currentContactName'),
    currentContactNumber: document.getElementById('currentContactNumber'),
    searchContacts: document.getElementById('searchContacts'),
    refreshContacts: document.getElementById('refreshContacts'),
    refreshChat: document.getElementById('refreshChat'),
    exportChat: document.getElementById('exportChat'),
    errorModal: document.getElementById('errorModal'),
    errorMessage: document.getElementById('errorMessage'),
    autoRefreshStatus: document.getElementById('autoRefreshStatus')
};

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
});

// Función principal de inicialización
async function initializeApp() {
    console.log('Inicializando aplicación WhatsApp Visualizador...');
    await loadContacts();
}

// Configurar event listeners
function setupEventListeners() {
    // Botón de actualizar contactos
    elements.refreshContacts.addEventListener('click', async () => {
        await loadContacts();
    });

    // Búsqueda de contactos
    elements.searchContacts.addEventListener('input', (e) => {
        filterContacts(e.target.value);
    });

    // Actualizar chat actual
    elements.refreshChat.addEventListener('click', async () => {
        if (appState.currentContact) {
            await loadMessages(appState.currentContact);
        }
    });

    // Exportar chat
    elements.exportChat.addEventListener('click', () => {
        exportCurrentChat();
    });

    // Cerrar modal con ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeErrorModal();
        }
    });

    // Event listener para redimensionado de ventana
    window.addEventListener('resize', () => {
        refreshChatLayout();
    });

    // Event listener para cuando el contenedor de mensajes cambie de tamaño
    if (window.ResizeObserver) {
        const resizeObserver = new ResizeObserver(() => {
            if (appState.currentMessages.length > 0) {
                scrollToBottom();
            }
        });
        resizeObserver.observe(elements.messagesContainer);
    }
}

// Cargar lista de contactos
async function loadContacts() {
    if (appState.isLoadingContacts) return;
    
    appState.isLoadingContacts = true;
    showContactsLoading();

    try {
        console.log('Cargando contactos desde:', CONFIG.CONTACTS_ENDPOINT);
        console.log('Origen de la petición:', window.location.origin);
        
        const response = await fetch(CONFIG.CONTACTS_ENDPOINT, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            mode: 'cors' // Agregar modo CORS explícito
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);

        if (!response.ok) {
            // Intentar leer la respuesta de error para obtener más detalles
            let errorDetails = `Error HTTP: ${response.status} - ${response.statusText}`;
            try {
                const errorData = await response.json();
                if (errorData.message) {
                    errorDetails += ` - ${errorData.message}`;
                }
                if (errorData.hint) {
                    errorDetails += ` - ${errorData.hint}`;
                }
                console.error('Detalles del error del servidor:', errorData);
            } catch (e) {
                console.log('No se pudo leer el detalle del error como JSON');
            }
            throw new Error(errorDetails);
        }

        const data = await response.json();
        console.log('Contactos recibidos:', data);
        console.log('Tipo de datos recibidos:', typeof data);
        console.log('Es array:', Array.isArray(data));
        if (Array.isArray(data) && data.length > 0) {
            console.log('Primer elemento:', data[0]);
            console.log('Keys del primer elemento:', Object.keys(data[0]));
        }

        // Procesar los datos según el formato recibido
        appState.contacts = processContactsData(data);
        
        if (appState.contacts.length === 0) {
            console.warn('No se encontraron contactos en la respuesta, usando datos de prueba');
            appState.contacts = getTestContacts();
            showError('No se encontraron contactos en el endpoint. Mostrando contactos de prueba.');
        } else {
            console.log(`${appState.contacts.length} contactos cargados exitosamente`);
        }
        
        renderContacts();

    } catch (error) {
        console.error('Error detallado al cargar contactos:', error);
        console.error('Tipo de error:', error.name);
        console.error('Mensaje de error:', error.message);
        
        // Detectar tipos específicos de errores
        if (error.message.includes('CORS') || error.message.includes('fetch')) {
            console.error('❌ Error de CORS detectado');
            showError('Error de CORS: El servidor necesita permitir peticiones desde localhost. Usando contactos de prueba.');
        } else if (error.message.includes('404') || error.message.includes('not registered')) {
            console.error('❌ Webhook no encontrado o inactivo');
            showError('El webhook de contactos no está activo o no existe. Verifica que el flujo de trabajo en n8n esté activo. Usando contactos de prueba.');
        } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
            console.error('❌ Error de conexión de red');
            showError('Error de conexión: No se puede conectar al servidor. Verifica tu conexión a internet. Usando contactos de prueba.');
        } else {
            showError(`Error al cargar contactos: ${error.message}. Mostrando contactos de prueba.`);
        }
        
        // En caso de error, usar datos de prueba
        console.log('Usando contactos de prueba debido al error');
        appState.contacts = getTestContacts();
        renderContacts();
        
    } finally {
        appState.isLoadingContacts = false;
    }
}

// Obtener contactos de prueba
function getTestContacts() {
    const now = new Date();
    return [
        {
            number: '59896243943',
            displayName: '+598 9624 3943',
            hasName: false,
            lastActivity: new Date(now - 5 * 60 * 1000).toISOString() // 5 minutos atrás
        },
        {
            number: '59812345678',
            displayName: '+598 1234 5678',
            hasName: false,
            lastActivity: new Date(now - 2 * 60 * 60 * 1000).toISOString() // 2 horas atrás
        },
        {
            number: '59898765432',
            displayName: '+598 9876 5432',
            hasName: false,
            lastActivity: new Date(now - 24 * 60 * 60 * 1000).toISOString() // 1 día atrás
        }
    ];
}

// Procesar datos de contactos
function processContactsData(data) {
    console.log('Procesando datos de contactos:', data);
    
    // Si es un array que contiene objetos con números como keys
    if (Array.isArray(data)) {
        const contacts = [];
        
        data.forEach(item => {
            if (typeof item === 'object' && item !== null) {
                // Iterar sobre cada key del objeto
                Object.keys(item).forEach(key => {
                    // La key puede ser "59896243943" o "59896243943 | Lucas Perazzo"
                    const { number, name } = parseContactKey(key);
                    
                    if (number && number.length >= 8) {
                        // Obtener el último mensaje para extraer la fecha
                        const messages = item[key];
                        const lastMessageDate = getLastMessageDate(messages);
                        
                        console.log(`📱 Procesando contacto: "${key}" -> Número: ${number}, Nombre: ${name || 'Sin nombre'}, Último mensaje: ${lastMessageDate}`);
                        
                        contacts.push({
                            number: number,
                            displayName: name || formatDisplayName(number),
                            hasName: !!name,
                            originalKey: key,
                            lastActivity: lastMessageDate
                        });
                    }
                });
            } else if (typeof item === 'string' || typeof item === 'number') {
                // Si el elemento del array es directamente un número
                const { number, name } = parseContactKey(item);
                if (number && number.length >= 8) {
                    contacts.push({
                        number: number,
                        displayName: name || formatDisplayName(number),
                        hasName: !!name,
                        originalKey: item,
                        lastActivity: new Date().toISOString()
                    });
                }
            }
        });
        
        console.log('Contactos procesados desde array:', contacts);
        
        // Ordenar contactos por fecha del último mensaje (más reciente primero)
        contacts.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
        
        return contacts;
    }
    
    // Si es un objeto con estructura diferente
    if (data.contacts) {
        return data.contacts.map(contact => ({
            number: formatPhoneNumber(contact.number || contact.wa_id || contact.phone),
            displayName: formatDisplayName(contact.number || contact.wa_id || contact.phone),
            hasName: false,
            lastActivity: contact.lastActivity || new Date().toISOString()
        }));
    }

    // Si es un objeto donde las keys son los números de teléfono
    if (typeof data === 'object' && !Array.isArray(data)) {
        const contacts = [];
        
        // Iterar sobre las keys del objeto
        Object.keys(data).forEach(key => {
            // La key puede ser "59896243943" o "59896243943 | Lucas Perazzo"
            const { number, name } = parseContactKey(key);
            if (number && number.length >= 8) {
                // Obtener el último mensaje para extraer la fecha
                const messages = data[key];
                const lastMessageDate = getLastMessageDate(messages);
                
                contacts.push({
                    number: number,
                    displayName: name || formatDisplayName(number),
                    hasName: !!name,
                    originalKey: key,
                    lastActivity: lastMessageDate
                });
            }
        });
        
        console.log('Contactos procesados desde objeto:', contacts);
        
        // Ordenar contactos por fecha del último mensaje (más reciente primero)
        contacts.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
        
        return contacts;
    }

    console.log('No se pudo procesar el formato de datos');
    return [];
}

// Obtener la fecha del último mensaje de un array de mensajes
function getLastMessageDate(messages) {
    if (!Array.isArray(messages) || messages.length === 0) {
        return new Date().toISOString();
    }
    
    // Buscar el mensaje más reciente con timestamp
    let latestTimestamp = null;
    
    for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i];
        const messageText = message.mensaje || message.message || message.text || message;
        
        // Extraer timestamp del mensaje
        const { timestamp } = extractTimestampFromMessage(messageText);
        
        if (timestamp) {
            if (!latestTimestamp || new Date(timestamp) > new Date(latestTimestamp)) {
                latestTimestamp = timestamp;
            }
        }
    }
    
    // Si no se encontró ningún timestamp válido, usar la fecha actual
    const finalDate = latestTimestamp || new Date().toISOString();
    console.log(`📅 Último mensaje del contacto: ${finalDate}`);
    
    return finalDate;
}

// Parsear key del contacto (puede ser "59896243943" o "59896243943 | Lucas Perazzo")
function parseContactKey(key) {
    if (!key) return { number: '', name: null };
    
    const keyStr = key.toString().trim();
    
    // Verificar si contiene el separador " | "
    if (keyStr.includes(' | ')) {
        const parts = keyStr.split(' | ');
        const number = formatPhoneNumber(parts[0]);
        const name = parts[1].trim();
        
        console.log(`🔍 Key con nombre: "${keyStr}" -> Número: "${number}", Nombre: "${name}"`);
        
        return {
            number: number,
            name: name
        };
    } else {
        // Solo es el número
        const number = formatPhoneNumber(keyStr);
        
        console.log(`🔍 Key sin nombre: "${keyStr}" -> Número: "${number}"`);
        
        return {
            number: number,
            name: null
        };
    }
}

// Formatear tiempo del último mensaje para la lista de contactos
function formatLastMessageTime(timestamp) {
    try {
        const messageDate = new Date(timestamp);
        const now = new Date();
        
        // Calcular diferencia en minutos
        const diffMs = now - messageDate;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffMinutes < 1) {
            return 'Ahora';
        } else if (diffMinutes < 60) {
            return `${diffMinutes}m`;
        } else if (diffHours < 24) {
            return `${diffHours}h`;
        } else if (diffDays < 7) {
            return `${diffDays}d`;
        } else {
            // Mostrar fecha
            return messageDate.toLocaleDateString('es-ES', { 
                day: '2-digit', 
                month: '2-digit' 
            });
        }
    } catch (error) {
        console.error('Error formateando tiempo del último mensaje:', error);
        return '';
    }
}

// Formatear número de teléfono
function formatPhoneNumber(number) {
    if (!number) return '';
    const cleaned = number.toString().replace(/\D/g, '');
    return cleaned;
}

// Formatear nombre para mostrar
function formatDisplayName(number) {
    if (!number) return 'Desconocido';
    const cleaned = formatPhoneNumber(number);
    
    // Formatear número para visualización
    if (cleaned.length >= 10) {
        const country = cleaned.slice(0, -8);
        const area = cleaned.slice(-8, -4);
        const local = cleaned.slice(-4);
        return `+${country} ${area} ${local}`;
    }
    
    return `+${cleaned}`;
}

// Mostrar loading en contactos
function showContactsLoading() {
    elements.contactsList.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i>
            <span>Cargando contactos...</span>
        </div>
    `;
}

// Mostrar error en contactos
function showContactsError() {
    elements.contactsList.innerHTML = `
        <div class="error-state">
            <i class="fas fa-exclamation-triangle"></i>
            <h4>Error al cargar contactos</h4>
            <p>Verifica la conexión a internet y los endpoints</p>
            <button onclick="loadContacts()" class="btn btn-primary" style="margin-top: 1rem;">
                Reintentar
            </button>
        </div>
    `;
}

// Renderizar lista de contactos
function renderContacts() {
    console.log('Renderizando contactos:', appState.contacts);
    
    if (appState.contacts.length === 0) {
        elements.contactsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h4>No hay contactos</h4>
                <p>No se encontraron conversaciones</p>
            </div>
        `;
        return;
    }

    const contactsHTML = appState.contacts.map(contact => {
        console.log('Renderizando contacto:', contact);
        
        // Determinar qué mostrar en el nombre y en el subtítulo
        const primaryText = contact.hasName ? contact.displayName : formatDisplayName(contact.number);
        const secondaryText = contact.hasName ? formatDisplayName(contact.number) : contact.number;
        
        // Formatear fecha del último mensaje
        const lastMessageTime = formatLastMessageTime(contact.lastActivity);
        
        return `
            <div class="contact-item" onclick="selectContact('${contact.number}')">
                <div class="contact-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="contact-info">
                    <div class="contact-main">
                        <h4>${primaryText}</h4>
                        <span class="contact-time">${lastMessageTime}</span>
                    </div>
                    <div class="contact-number">${secondaryText}</div>
                </div>
            </div>
        `;
    }).join('');

    elements.contactsList.innerHTML = contactsHTML;
    console.log('Contactos renderizados en el DOM');
}

// Filtrar contactos por búsqueda
function filterContacts(searchTerm) {
    const contactItems = elements.contactsList.querySelectorAll('.contact-item');
    const term = searchTerm.toLowerCase();

    contactItems.forEach(item => {
        const contactInfo = item.querySelector('.contact-info');
        const name = contactInfo.querySelector('h4').textContent.toLowerCase();
        const number = contactInfo.querySelector('.contact-number').textContent.toLowerCase();
        
        const matches = name.includes(term) || number.includes(term);
        item.style.display = matches ? 'flex' : 'none';
    });
}

// Seleccionar contacto
async function selectContact(contactNumber) {
    console.log('Seleccionando contacto:', contactNumber);
    
    // Verificar que el número no esté vacío
    if (!contactNumber) {
        console.error('Error: número de contacto vacío');
        showError('Error: número de contacto no válido');
        return;
    }
    
    // Actualizar estado visual
    const contactItems = elements.contactsList.querySelectorAll('.contact-item');
    contactItems.forEach(item => item.classList.remove('active'));
    
    // Buscar el elemento clickeado y marcarlo como activo
    contactItems.forEach(item => {
        const numberSpan = item.querySelector('.contact-info .contact-number');
        if (numberSpan && numberSpan.textContent === contactNumber) {
            item.classList.add('active');
        }
    });
    
    // Actualizar estado de la aplicación
    appState.currentContact = contactNumber;
    
    // Mostrar información del contacto
    const contact = appState.contacts.find(c => c.number === contactNumber);
    if (contact) {
        // Mostrar el nombre si está disponible, sino el número formateado
        const displayName = contact.hasName ? contact.displayName : formatDisplayName(contact.number);
        const displayNumber = contact.hasName ? formatDisplayName(contact.number) : contact.number;
        
        elements.currentContactName.textContent = displayName;
        elements.currentContactNumber.textContent = displayNumber;
        console.log('Contacto encontrado:', contact);
    } else {
        console.warn('Contacto no encontrado en el estado:', contactNumber);
    }
    
    // Mostrar contenedor de chat y ocultar pantalla de bienvenida
    elements.welcomeScreen.style.display = 'none';
    elements.chatContainer.style.display = 'flex';
    
    // Cargar mensajes
    await loadMessages(contactNumber);
}

// Cargar mensajes de un contacto
async function loadMessages(contactNumber) {
    if (appState.isLoadingMessages) return;
    
    appState.isLoadingMessages = true;
    showMessagesLoading();

    try {
        // Buscar el contacto para obtener la originalKey si está disponible
        const contact = appState.contacts.find(c => c.number === contactNumber);
        const waId = contact && contact.originalKey ? contact.originalKey : contactNumber;
        
        const url = `${CONFIG.MESSAGES_ENDPOINT}?wa_id=${encodeURIComponent(waId)}`;
        console.log('Cargando mensajes desde:', url);
        console.log('wa_id usado:', waId);
        console.log('Origen de la petición:', window.location.origin);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            mode: 'cors' // Agregar modo CORS explícito
        });

        console.log('Response status (mensajes):', response.status);

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
        }

        // Verificar si la respuesta tiene contenido antes de parsear JSON
        const responseText = await response.text();
        console.log('Respuesta de mensajes (texto):', responseText);
        
        if (!responseText || responseText.trim() === '') {
            console.warn('Respuesta vacía del servidor de mensajes');
            appState.currentMessages = [];
            renderMessages();
            return;
        }

        let messages;
        try {
            messages = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Error al parsear JSON de mensajes:', parseError);
            throw new Error('Respuesta del servidor no es JSON válido');
        }

        console.log('Mensajes recibidos:', messages);
        console.log('Cantidad de mensajes:', Array.isArray(messages) ? messages.length : 'No es array');
        
        appState.currentMessages = processMessagesData(messages);
        renderMessages();

    } catch (error) {
        console.error('Error detallado al cargar mensajes:', error);
        console.error('Tipo de error:', error.name);
        console.error('Mensaje de error:', error.message);
        
        // Verificar si es un error de CORS
        if (error.message.includes('CORS') || error.message.includes('fetch')) {
            console.error('❌ Error de CORS detectado en mensajes');
            showError('Error de CORS: El servidor necesita permitir peticiones desde localhost.');
        } else {
            showError('No se pudieron cargar los mensajes de este contacto.');
        }
        
        showMessagesError();
    } finally {
        appState.isLoadingMessages = false;
    }
}

// Procesar datos de mensajes
function processMessagesData(data) {
    if (!Array.isArray(data)) {
        console.warn('Formato de mensajes inesperado:', data);
        return [];
    }

    console.log(`Procesando ${data.length} mensajes con patrón: cliente, IA, cliente, IA...`);

    return data.map((msg, index) => {
        const messageText = msg.mensaje || msg.message || msg.text || '';
        
        // Extraer timestamp del final del mensaje si existe
        const { text, timestamp } = extractTimestampFromMessage(messageText);
        
        const messageType = determineMessageType(msg, index);
        
        return {
            id: index,
            text: text,
            timestamp: timestamp,
            type: messageType,
            original: msg // Mantener el mensaje original para debug
        };
    });
}

// Extraer timestamp del mensaje
function extractTimestampFromMessage(messageText) {
    // Buscar el patrón °timestamp al final del mensaje (más flexible)
    const timestampMatch = messageText.match(/^(.*?)\s*°(\d+)\s*$/s);
    
    if (timestampMatch) {
        let text = timestampMatch[1].trim(); // Texto sin el timestamp
        const timestampStr = timestampMatch[2]; // Timestamp como string
        
        // Remover prefijo "Cliente:" o "IA:" del texto para mostrar solo el contenido
        if (text.startsWith('Cliente:')) {
            text = text.substring(8).trim(); // Remover "Cliente:" (8 caracteres)
        } else if (text.startsWith('IA:')) {
            text = text.substring(3).trim(); // Remover "IA:" (3 caracteres)
        }
        
        console.log(`🔍 Mensaje original: "${messageText}"`);
        console.log(`📝 Texto extraído (sin prefijo): "${text}"`);
        console.log(`⏰ Timestamp raw: "${timestampStr}"`);
        
        // Convertir timestamp a Date
        const timestampNum = parseInt(timestampStr);
        let timestamp;
        
        // Determinar si es timestamp de Unix (segundos) o JavaScript (milisegundos)
        if (timestampStr.length <= 10) {
            // Timestamp de Unix (segundos desde 1970)
            timestamp = new Date(timestampNum * 1000);
        } else if (timestampStr.length === 13) {
            // Timestamp de JavaScript (milisegundos desde 1970)
            timestamp = new Date(timestampNum);
        } else {
            // Para otros casos, intentar como está
            timestamp = new Date(timestampNum);
        }
        
        console.log(`✅ Timestamp convertido: ${timestamp.toISOString()}`);
        console.log(`📅 Fecha legible: ${timestamp.toLocaleString('es-ES')}`);
        
        return {
            text: text,
            timestamp: timestamp.toISOString()
        };
    } else {
        // Si no hay timestamp, usar timestamp actual
        let cleanText = messageText;
        // Remover prefijo también en caso de fallback
        if (cleanText.startsWith('Cliente:')) {
            cleanText = cleanText.substring(8).trim();
        } else if (cleanText.startsWith('IA:')) {
            cleanText = cleanText.substring(3).trim();
        }
        
        console.log('❌ No se encontró timestamp en el mensaje:', messageText.substring(0, 50) + '...');
        return {
            text: cleanText,
            timestamp: new Date().toISOString()
        };
    }
}

// Determinar tipo de mensaje (enviado/recibido)
function determineMessageType(message, index) {
    const text = message.mensaje || message.message || message.text || '';
    
    // Verificar si el mensaje tiene prefijo "Cliente:" o "IA:"
    if (text.startsWith('Cliente:')) {
        console.log(`Mensaje ${index}: "${text.substring(0, 50)}..." -> CLIENTE (received)`);
        return 'received';
    } else if (text.startsWith('IA:')) {
        console.log(`Mensaje ${index}: "${text.substring(0, 50)}..." -> IA (sent)`);
        return 'sent';
    } else {
        // Fallback al método anterior si no hay prefijo
        console.log(`Mensaje ${index}: "${text.substring(0, 50)}..." -> ${index % 2 === 0 ? 'CLIENTE' : 'IA'} (fallback)`);
        return index % 2 === 0 ? 'received' : 'sent';
    }
}

// Mostrar loading en mensajes
function showMessagesLoading() {
    elements.messagesContainer.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i>
            <span>Cargando mensajes...</span>
        </div>
    `;
}

// Mostrar error en mensajes
function showMessagesError() {
    elements.messagesContainer.innerHTML = `
        <div class="error-state">
            <i class="fas fa-exclamation-triangle"></i>
            <h4>Error al cargar mensajes</h4>
            <p>No se pudieron cargar los mensajes de esta conversación</p>
            <button onclick="loadMessages(appState.currentContact)" class="btn btn-primary" style="margin-top: 1rem;">
                Reintentar
            </button>
        </div>
    `;
}

// Renderizar mensajes
function renderMessages() {
    if (appState.currentMessages.length === 0) {
        elements.messagesContainer.innerHTML = `
            <div class="empty-state">
                <i class="far fa-comments"></i>
                <h4>No hay mensajes</h4>
                <p>Esta conversación no tiene mensajes</p>
            </div>
        `;
        return;
    }

    console.log('Renderizando mensajes:', appState.currentMessages);

    let messagesHTML = '';
    let lastDate = null;

    appState.currentMessages.forEach((message, index) => {
        const senderLabel = message.type === 'received' ? 'Cliente' : 'IA';
        const formattedTime = formatMessageTime(message.timestamp);
        const messageDate = new Date(message.timestamp);
        const currentDate = messageDate.toDateString();
        
        // Agregar separador de fecha si es un día diferente
        if (lastDate !== currentDate) {
            const dateLabel = formatDateSeparator(messageDate);
            messagesHTML += `
                <div class="date-separator">
                    <div class="date-label">${dateLabel}</div>
                </div>
            `;
            lastDate = currentDate;
        }
        
        console.log(`Mensaje ${index}: ${senderLabel} - "${message.text.substring(0, 30)}..." [${formattedTime}]`);
        
        messagesHTML += `
            <div class="message ${message.type}">
                <div class="message-bubble">
                    <div class="message-text">${formatMessageText(message.text)}</div>
                    <div class="message-time">${formattedTime}</div>
                </div>
            </div>
        `;
    });

    elements.messagesContainer.innerHTML = messagesHTML;
    
    // Forzar scroll al final después de que el DOM se actualice
    scrollToBottom();
    
    console.log(`✅ ${appState.currentMessages.length} mensajes renderizados correctamente`);
}

// Formatear separador de fecha
function formatDateSeparator(date) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const diffTime = today - messageDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return 'Hoy';
    } else if (diffDays === 1) {
        return 'Ayer';
    } else if (diffDays <= 7) {
        return date.toLocaleDateString('es-ES', { 
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });
    } else {
        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }
}

// Formatear texto del mensaje
function formatMessageText(text) {
    if (!text) return '';
    
    // Escapar HTML para prevenir XSS
    const escapedText = escapeHtml(text);
    
    // Convertir saltos de línea a <br>
    const withBreaks = escapedText.replace(/\n/g, '<br>');
    
    // Hacer que el texto en negritas (*texto*) sea bold
    const withBold = withBreaks.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
    
    return withBold;
}

// Formatear tiempo del mensaje
function formatMessageTime(timestamp) {
    try {
        const date = new Date(timestamp);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        
        // Calcular diferencia en días
        const diffTime = today - messageDate;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Formatear hora
        const timeStr = date.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Determinar si mostrar solo hora o fecha también
        if (diffDays === 0) {
            // Hoy - solo mostrar hora
            return timeStr;
        } else if (diffDays === 1) {
            // Ayer
            return `Ayer ${timeStr}`;
        } else if (diffDays <= 7) {
            // Esta semana - mostrar día de la semana
            const dayName = date.toLocaleDateString('es-ES', { weekday: 'short' });
            return `${dayName} ${timeStr}`;
        } else {
            // Más de una semana - mostrar fecha completa
            const dateStr = date.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit'
            });
            return `${dateStr} ${timeStr}`;
        }
    } catch (error) {
        console.error('Error al formatear timestamp:', error);
        return '--:--';
    }
}

// Escapar HTML para prevenir XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Exportar chat actual
function exportCurrentChat() {
    if (!appState.currentContact || appState.currentMessages.length === 0) {
        showError('No hay mensajes para exportar');
        return;
    }

    const contact = appState.contacts.find(c => c.number === appState.currentContact);
    const chatData = {
        contact: contact,
        messages: appState.currentMessages,
        exportDate: new Date().toISOString()
    };

    const dataStr = JSON.stringify(chatData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `chat_${appState.currentContact}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
}

// Mostrar modal de error
function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorModal.style.display = 'block';
}

// Cerrar modal de error
function closeErrorModal() {
    elements.errorModal.style.display = 'none';
}

// Funciones de utilidad para debugging
window.debugApp = {
    getState: () => appState,
    getConfig: () => CONFIG,
    loadContacts: loadContacts,
    loadMessages: loadMessages,
    selectContact: selectContact,
    testUrl: async (url) => {
        try {
            const response = await fetch(url);
            const data = await response.json();
            console.log('Test URL result:', data);
            return data;
        } catch (error) {
            console.error('Test URL error:', error);
            return null;
        }
    },
    testContactsEndpoint: async () => {
        console.log('🔍 Probando endpoint de contactos...');
        console.log('📡 URL:', CONFIG.CONTACTS_ENDPOINT);
        
        try {
            const response = await fetch(CONFIG.CONTACTS_ENDPOINT, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                mode: 'cors'
            });
            
            console.log('📊 Status:', response.status);
            console.log('📊 Status Text:', response.statusText);
            console.log('📊 Headers:', [...response.headers.entries()]);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Error response body:', errorText);
                try {
                    const errorJson = JSON.parse(errorText);
                    console.error('❌ Error details:', errorJson);
                    return { error: true, status: response.status, details: errorJson };
                } catch (e) {
                    return { error: true, status: response.status, message: errorText };
                }
            }
            
            const data = await response.json();
            console.log('✅ Respuesta exitosa:', data);
            console.log('📋 Tipo de datos:', typeof data);
            console.log('📋 Es array:', Array.isArray(data));
            if (typeof data === 'object') {
                console.log('📋 Claves:', Object.keys(data));
            }
            
            const processedContacts = processContactsData(data);
            console.log('👥 Contactos procesados:', processedContacts);
            
            return { error: false, data: data, processedContacts: processedContacts };
        } catch (error) {
            console.error('❌ Error de red/CORS:', error);
            console.error('❌ Tipo de error:', error.name);
            console.error('❌ Mensaje:', error.message);
            return { error: true, networkError: true, details: error.message };
        }
    },
    testMessagesEndpoint: async (contactNumber = '59896243943') => {
        console.log('🔍 Probando endpoint de mensajes...');
        console.log('📡 URL:', CONFIG.MESSAGES_ENDPOINT);
        console.log('📞 Contacto:', contactNumber);
        
        try {
            const response = await fetch(CONFIG.MESSAGES_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                mode: 'cors',
                body: JSON.stringify({ contacto: contactNumber })
            });
            
            console.log('📊 Status:', response.status);
            console.log('📊 Status Text:', response.statusText);
            console.log('📊 Headers:', [...response.headers.entries()]);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Error response body:', errorText);
                return { error: true, status: response.status, message: errorText };
            }
            
            const data = await response.json();
            console.log('✅ Respuesta de mensajes:', data);
            console.log('📋 Cantidad de mensajes:', Array.isArray(data) ? data.length : 'No es array');
            
            return { error: false, data: data };
        } catch (error) {
            console.error('❌ Error al probar mensajes:', error);
            return { error: true, networkError: true, details: error.message };
        }
    },
    testBothEndpoints: async () => {
        console.log('🧪 === DIAGNÓSTICO COMPLETO DE ENDPOINTS ===\n');
        
        console.log('1️⃣ Probando endpoint de CONTACTOS...');
        const contactsResult = await window.debugApp.testContactsEndpoint();
        
        console.log('\n2️⃣ Probando endpoint de MENSAJES...');
        const messagesResult = await window.debugApp.testMessagesEndpoint();
        
        console.log('\n📋 === RESUMEN DEL DIAGNÓSTICO ===');
        console.log('Contactos:', contactsResult.error ? '❌ FALLO' : '✅ OK');
        console.log('Mensajes:', messagesResult.error ? '❌ FALLO' : '✅ OK');
        
        if (contactsResult.error) {
            console.log('🔧 Contactos - Problema detectado:', contactsResult.details || contactsResult.message);
        }
        if (messagesResult.error) {
            console.log('🔧 Mensajes - Problema detectado:', messagesResult.details || messagesResult.message);
        }
        
        return { contacts: contactsResult, messages: messagesResult };
    },
    testTimestampExtraction: (messageText) => {
        console.log('🧪 Probando extracción de timestamp...');
        const result = extractTimestampFromMessage(messageText);
        console.log('📄 Mensaje original:', messageText);
        console.log('📝 Texto extraído:', result.text);
        console.log('⏰ Timestamp extraído:', result.timestamp);
        console.log('📅 Fecha formateada:', formatMessageTime(result.timestamp));
        console.log('📆 Separador de fecha:', formatDateSeparator(new Date(result.timestamp)));
        return result;
    },
    testMessages: () => {
        // Probar con mensajes de ejemplo en el nuevo formato
        const testMessages = [
            "Cliente: Perfecto, recordame las diferencias entre la speediance 1 y la 2 °1762460707810",
            "IA: ¡Claro, Lucas! Te resumo las diferencias principales entre la *Gym Monster Pro* y la *Gym Monster 2*.\n\nLa *Gym Monster 2* es la versión más nueva y mejorada. Es más *liviana*, tiene un *mejor sistema de audio* con subwoofer, y *mucho más almacenamiento* (128GB vs 16GB), lo que la hace más fluida.\n\nAdemás, la Gym Monster 2 tiene una *altura extra* en la polea, pensada específicamente para que el ejercicio de remo sea más cómodo y efectivo. También cuenta con mejor conexión WiFi y un sistema de enfriamiento optimizado.\n\nBásicamente, la 2 es una evolución de la Pro con varias mejoras para que la experiencia sea superior.\n\nQuedo a la orden. °1762460721699",
            "Cliente: me gustaria agendarme °1762460769942",
            "IA: ¡Bárbaro! Podemos agendarte una visita a nuestro showroom en Constitución 1618 para que pruebes los equipos.\n\n¿Qué día y hora te queda bien? °1762460786271"
        ];
        
        console.log('🧪 Probando mensajes de ejemplo con nuevo formato...');
        testMessages.forEach((msg, index) => {
            console.log(`\n--- Mensaje ${index + 1} ---`);
            window.debugApp.testTimestampExtraction(msg);
            
            // También probar el tipo de mensaje
            const messageObj = { mensaje: msg };
            const type = determineMessageType(messageObj, index);
            console.log(`🎯 Tipo de mensaje detectado: ${type}`);
        });
    },
    testContactFormat: () => {
        // Probar con el nuevo formato de contactos
        const testData = [
            {
                "59896243943 | Lucas Perazzo": [
                    "Ayudame para saber como voy a instalar esas maquinotas en mi casa °1762348741923",
                    "Lucas, de eso no te preocupes. Los equipos llegan listos para usar, no requieren instalación ni armado complejo.\n\nQuedo a la orden. °1762348753041"
                ]
            },
            {
                "59812345678": [
                    "Hola, me interesa el producto °1762348700000"
                ]
            },
            {
                "59898765432 | María García": [
                    "Buenos días °1762300000000",
                    "Hola María! ¿En qué te puedo ayudar? °1762300060000",
                    "Quisiera información sobre los precios °1762348800000"
                ]
            }
        ];
        
        console.log('🧪 Probando nuevo formato de contactos con ordenamiento...');
        const processedContacts = processContactsData(testData);
        console.log('📊 Contactos procesados y ordenados:', processedContacts);
        
        // Mostrar el orden de las fechas
        processedContacts.forEach((contact, index) => {
            console.log(`${index + 1}. ${contact.displayName} - Último mensaje: ${formatLastMessageTime(contact.lastActivity)} (${contact.lastActivity})`);
        });
        
        return processedContacts;
    },
    // Solo función de consulta del auto-refresh (no control)
    getAutoRefreshStatus: () => {
        return autoRefreshInterval ? 'Auto-refresh ACTIVO (cada 2 minutos - OBLIGATORIO)' : 'Auto-refresh INACTIVO (reiniciando...)';
    }
};

// Función para scroll automático al final del chat
function scrollToBottom() {
    if (elements.messagesContainer) {
        setTimeout(() => {
            elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
        }, 100);
    }
}

// Función para forzar redimensionado y scroll
function refreshChatLayout() {
    if (elements.messagesContainer) {
        // Forzar recálculo del layout
        elements.messagesContainer.style.display = 'none';
        elements.messagesContainer.offsetHeight; // Trigger reflow
        elements.messagesContainer.style.display = '';
        
        // Scroll al final
        scrollToBottom();
    }
}

// Manejo de errores globales
window.addEventListener('error', (event) => {
    console.error('Error global:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Promise rechazada:', event.reason);
});

// Auto-refresh cada 2 minutos para mantener datos actualizados
let autoRefreshInterval = null;

function startAutoRefresh() {
    // Limpiar cualquier intervalo existente
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    // Configurar nuevo intervalo de 2 minutos (120,000 ms)
    autoRefreshInterval = setInterval(() => {
        // Siempre hacer refresh, independientemente de si la página está visible
        console.log('🔄 Auto-refresh activado - Recargando contactos...');
        loadContacts();
        
        // Si hay un contacto seleccionado, también recargar sus mensajes
        if (appState.currentContact) {
            console.log('🔄 Auto-refresh - Recargando mensajes del contacto actual...');
            loadMessages(appState.currentContact);
        }
    }, 120000); // 2 minutos = 120,000 milisegundos
    
    // Mostrar indicador visual
    if (elements.autoRefreshStatus) {
        elements.autoRefreshStatus.style.display = 'block';
    }
    
    console.log('✅ Auto-refresh configurado: cada 2 minutos (funciona en segundo plano)');
}

// Función privada para detener auto-refresh (solo para limpieza interna)
function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        console.log('⏹️ Auto-refresh detenido (solo para limpieza interna)');
    }
}

// Monitorear visibilidad de página (solo para logging)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('📱 Página oculta - Auto-refresh continúa en segundo plano');
    } else {
        console.log('📱 Página visible - Auto-refresh activo');
    }
});

// Función para verificar y garantizar que el auto-refresh esté activo
function ensureAutoRefreshActive() {
    if (!autoRefreshInterval) {
        console.log('⚠️ Auto-refresh no está activo - Reiniciando...');
        startAutoRefresh();
    }
}

// Iniciar auto-refresh cuando la página esté completamente cargada
window.addEventListener('load', () => {
    setTimeout(() => {
        startAutoRefresh();
        
        // Verificar cada 30 segundos que el auto-refresh esté activo
        setInterval(() => {
            ensureAutoRefreshActive();
        }, 30000); // 30 segundos
        
    }, 5000); // Esperar 5 segundos después de cargar para empezar el auto-refresh
});

// El auto-refresh es obligatorio y no se detiene al cerrar la página
// (Se limpiará automáticamente cuando el navegador cierre la pestaña)

console.log('Script de WhatsApp Visualizador cargado correctamente');