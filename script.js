// Configuración de la aplicación
const CONFIG = {
    CONTACTS_ENDPOINT: 'https://n8n.uni.uy/webhook/3b5f9ce4-3482-4077-aa8c-cb0def78dd4a',
    MESSAGES_ENDPOINT: 'https://n8n.uni.uy/webhook/a7e6d994-fe18-4b68-8d47-cba715c349c4'
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
    errorMessage: document.getElementById('errorMessage')
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
            throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
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
        
        // Verificar si es un error de CORS
        if (error.message.includes('CORS') || error.message.includes('fetch')) {
            console.error('❌ Error de CORS detectado');
            showError('Error de CORS: El servidor necesita permitir peticiones desde localhost. Usando contactos de prueba.');
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
    return [
        {
            number: '59896243943',
            displayName: '+598 9624 3943',
            lastActivity: new Date().toISOString()
        },
        {
            number: '59812345678',
            displayName: '+598 1234 5678',
            lastActivity: new Date().toISOString()
        },
        {
            number: '59898765432',
            displayName: '+598 9876 5432',
            lastActivity: new Date().toISOString()
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
                    const phoneNumber = formatPhoneNumber(key);
                    if (phoneNumber && phoneNumber.length >= 8) {
                        console.log('Encontrado número de teléfono:', phoneNumber);
                        contacts.push({
                            number: phoneNumber,
                            displayName: formatDisplayName(phoneNumber),
                            lastActivity: new Date().toISOString()
                        });
                    }
                });
            } else if (typeof item === 'string' || typeof item === 'number') {
                // Si el elemento del array es directamente un número
                const phoneNumber = formatPhoneNumber(item);
                if (phoneNumber && phoneNumber.length >= 8) {
                    contacts.push({
                        number: phoneNumber,
                        displayName: formatDisplayName(phoneNumber),
                        lastActivity: new Date().toISOString()
                    });
                }
            }
        });
        
        console.log('Contactos procesados desde array:', contacts);
        return contacts;
    }
    
    // Si es un objeto con estructura diferente
    if (data.contacts) {
        return data.contacts.map(contact => ({
            number: formatPhoneNumber(contact.number || contact.wa_id || contact.phone),
            displayName: formatDisplayName(contact.number || contact.wa_id || contact.phone),
            lastActivity: contact.lastActivity || new Date().toISOString()
        }));
    }

    // Si es un objeto donde las keys son los números de teléfono
    if (typeof data === 'object' && !Array.isArray(data)) {
        const contacts = [];
        
        // Iterar sobre las keys del objeto
        Object.keys(data).forEach(key => {
            // La key es el número de teléfono
            const phoneNumber = formatPhoneNumber(key);
            if (phoneNumber && phoneNumber.length >= 8) {
                contacts.push({
                    number: phoneNumber,
                    displayName: formatDisplayName(phoneNumber),
                    lastActivity: new Date().toISOString()
                });
            }
        });
        
        console.log('Contactos procesados desde objeto:', contacts);
        return contacts;
    }

    console.log('No se pudo procesar el formato de datos');
    return [];
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
        return `
            <div class="contact-item" onclick="selectContact('${contact.number}')">
                <div class="contact-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="contact-info">
                    <h4>${contact.displayName}</h4>
                    <span>${contact.number}</span>
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
        const number = contactInfo.querySelector('span').textContent.toLowerCase();
        
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
        const numberSpan = item.querySelector('.contact-info span');
        if (numberSpan && numberSpan.textContent === contactNumber) {
            item.classList.add('active');
        }
    });
    
    // Actualizar estado de la aplicación
    appState.currentContact = contactNumber;
    
    // Mostrar información del contacto
    const contact = appState.contacts.find(c => c.number === contactNumber);
    if (contact) {
        elements.currentContactName.textContent = contact.displayName;
        elements.currentContactNumber.textContent = contact.number;
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
        const url = `${CONFIG.MESSAGES_ENDPOINT}?wa_id=${contactNumber}`;
        console.log('Cargando mensajes desde:', url);
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
        const text = timestampMatch[1].trim(); // Texto sin el timestamp
        const timestampStr = timestampMatch[2]; // Timestamp como string
        
        console.log(`🔍 Mensaje original: "${messageText}"`);
        console.log(`📝 Texto extraído: "${text}"`);
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
        console.log('❌ No se encontró timestamp en el mensaje:', messageText.substring(0, 50) + '...');
        return {
            text: messageText,
            timestamp: new Date().toISOString()
        };
    }
}

// Determinar tipo de mensaje (enviado/recibido)
function determineMessageType(message, index) {
    // Los mensajes alternan: cliente, IA, cliente, IA...
    // Índice par (0, 2, 4...) = cliente (received)
    // Índice impar (1, 3, 5...) = IA/bot (sent)
    
    const text = message.mensaje || message.message || message.text || '';
    console.log(`Mensaje ${index}: "${text.substring(0, 50)}..." -> ${index % 2 === 0 ? 'CLIENTE' : 'IA'}`);
    
    return index % 2 === 0 ? 'received' : 'sent';
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
        try {
            console.log('Probando endpoint de contactos...');
            const response = await fetch(CONFIG.CONTACTS_ENDPOINT);
            const data = await response.json();
            console.log('Respuesta del endpoint de contactos:', data);
            console.log('Claves del objeto:', Object.keys(data));
            console.log('Contactos procesados:', processContactsData(data));
            return data;
        } catch (error) {
            console.error('Error al probar endpoint de contactos:', error);
            return null;
        }
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
        // Probar con mensajes de ejemplo
        const testMessages = [
            "Me encantaria per antes me gustaria saber realmente como son los productos que venden, muy brevemente °1762290761",
            "Dale, Lucas. Te cuento rápido:\n\nTenemos tres gimnasios inteligentes. °1762290794949"
        ];
        
        console.log('🧪 Probando mensajes de ejemplo...');
        testMessages.forEach((msg, index) => {
            console.log(`\n--- Mensaje ${index + 1} ---`);
            debugApp.testTimestampExtraction(msg);
        });
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

console.log('Script de WhatsApp Visualizador cargado correctamente');