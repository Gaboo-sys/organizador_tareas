// -------------------------------------------------------------
// 1. CONFIGURACIÓN E INICIALIZACIÓN DE FIREBASE
// -------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyC-ZBr1jG9mRA0tGDc_n00X8vtQbvHsKuI",
  authDomain: "organizador-tareas-compartidas.firebaseapp.com",
  projectId: "organizador-tareas-compartidas",
  storageBucket: "organizador-tareas-compartidas.firebasestorage.app",
  messagingSenderId: "840628870631",
  appId: "1:840628870631:web:87cb6bad470490520fb142"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
const messaging = firebase.messaging();

// Persistencia local para funcionamiento Offline
db.settings({ cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED });
db.enablePersistence({ synchronizeTabs: true }).catch(err => {
  if (err.code === 'failed-precondition') {
    console.warn('Persistencia: Abierta en múltiples pestañas.');
  } else if (err.code === 'unimplemented') {
    console.warn('Persistencia no soportada por el navegador.');
  }
});

const tasksCollection = db.collection('tasks');
const VAPID_KEY = "BK3fiy_90rnrxY5jKf0uXAo3UUyK3kC55pasjtQuZ55r-e8Xsh_0BaqebdPXc-W35ijwClh5Zy9Ub4fdodlDhU8";
let username = "Gabo";

// Actualizar la fecha actual en pantalla automáticamente
function setDynamicDate() {
  const dateEl = document.getElementById('currentDateDisplay');
  if (dateEl) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const today = new Date().toLocaleDateString('es-ES', options);
    dateEl.textContent = today.charAt(0).toUpperCase() + today.slice(1);
  }
}
setDynamicDate();

// -------------------------------------------------------------
// 2. CONFIGURACIÓN DE NOTIFICACIONES PUSH (FCM)
// -------------------------------------------------------------
function setupNotifications() {
  if ('serviceWorker' in navigator && 'Notification' in window) {
    navigator.serviceWorker.register('./firebase-messaging-sw.js')
      .then((registration) => {
        messaging.useServiceWorker(registration);
        return Notification.requestPermission();
      })
      .then((permission) => {
        if (permission === 'granted') {
          return messaging.getToken({ vapidKey: VAPID_KEY });
        }
      })
      .then((currentToken) => {
        if (currentToken) {
          db.collection('fcmTokens').doc(currentToken).set({
            token: currentToken,
            user: username,
            updatedAt: Date.now()
          }, { merge: true });
        }
      })
      .catch((err) => console.error('Error configurando FCM:', err));
  }
}

// Escuchar notificaciones en primer plano
messaging.onMessage((payload) => {
  if (Notification.permission === 'granted') {
    new Notification(payload.notification?.title || '📌 Nueva Tarea', {
      body: payload.notification?.body || 'Se ha creado una nueva tarea.',
      icon: 'https://cdn-icons-png.flaticon.com/512/906/906334.png'
    });
  }
});

// -------------------------------------------------------------
// 3. LÓGICA DE LA APLICACIÓN Y RENDERIZADO
// -------------------------------------------------------------
let tasks = [];
let currentFilter = 'all';

// Elementos DOM
const taskForm = document.getElementById('taskForm');
const taskTitle = document.getElementById('taskTitle');
const taskSubject = document.getElementById('taskSubject');
const taskDue = document.getElementById('taskDue');
const taskPriority = document.getElementById('taskPriority');
const taskList = document.getElementById('taskList');
const taskCounterText = document.getElementById('taskCounterText');
const progressText = document.getElementById('progressText');
const progressBarFill = document.getElementById('progressBarFill');
const tabButtons = document.querySelectorAll('.tab-btn');

// Establecer fecha por defecto hoy
const todayString = new Date().toISOString().split('T')[0];
if (taskDue) taskDue.value = todayString;

// Escuchar base de datos en tiempo real (Offline enabled)
function listenTasks() {
  tasksCollection.orderBy('createdAt', 'desc').onSnapshot({ includeMetadataChanges: true }, snapshot => {
    tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    render();
  }, err => {
    console.error('Error al obtener tareas:', err);
  });
}

// Renderizar tareas y barra de progreso
function render() {
  const filteredTasks = tasks.filter(t => {
    if (currentFilter === 'pending') return !t.done;
    if (currentFilter === 'completed') return t.done;
    return true;
  });

  const total = tasks.length;
  const completed = tasks.filter(t => t.done).length;
  const pending = total - completed;

  if (progressText) progressText.textContent = `${completed} de ${total}`;
  if (progressBarFill) {
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    progressBarFill.style.width = `${percentage}%`;
  }
  if (taskCounterText) taskCounterText.textContent = `${pending} pendientes de ${total} tareas.`;

  taskList.innerHTML = '';
  if (filteredTasks.length === 0) {
    taskList.innerHTML = `<li class="empty-msg">No hay tareas para mostrar.</li>`;
    return;
  }

  filteredTasks.forEach(task => {
    const li = document.createElement('li');
    li.className = `task-item ${task.done ? 'done' : ''}`;

    li.innerHTML = `
      <div class="task-left">
        <input type="checkbox" class="task-checkbox" ${task.done ? 'checked' : ''} data-id="${task.id}">
        <div class="task-info">
          <span class="task-name">${escapeHTML(task.title)}</span>
          <span class="task-meta">${escapeHTML(task.subject || 'General')} ${task.due ? '• Entrega: ' + task.due : ''} ${task.createdBy ? '• por ' + escapeHTML(task.createdBy) : ''}</span>
        </div>
      </div>
      <div class="task-right">
        <span class="badge priority-${(task.priority || 'media').toLowerCase()}">${task.priority || 'Media'}</span>
        <button class="btn-delete" data-id="${task.id}">✕</button>
      </div>
    `;

    taskList.appendChild(li);
  });
}

function escapeHTML(str) {
  return str ? str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag] || tag)) : '';
}

// Evento: Crear Tarea
taskForm.addEventListener('submit', event => {
  event.preventDefault();

  const title = taskTitle.value.trim();
  if (!title) return;

  const newTask = {
    title: title,
    subject: taskSubject.value,
    due: taskDue.value,
    priority: taskPriority.value,
    done: false,
    createdBy: username,
    createdAt: Date.now()
  };

  tasksCollection.add(newTask)
    .then(() => {
      if (Notification.permission === 'granted') {
        new Notification('Tarea agregada 📝', {
          body: `${username} agregó: "${title}"`,
          icon: 'https://cdn-icons-png.flaticon.com/512/906/906334.png'
        });
      }
    })
    .catch(err => console.error('Error guardando la tarea:', err));

  taskTitle.value = '';
  taskDue.value = todayString;
});

// Eventos Checkbox y Borrar
taskList.addEventListener('click', event => {
  const target = event.target;
  const taskId = target.getAttribute('data-id');

  if (!taskId) return;

  if (target.classList.contains('task-checkbox')) {
    tasksCollection.doc(taskId).update({ done: target.checked });
  }

  if (target.classList.contains('btn-delete')) {
    tasksCollection.doc(taskId).delete();
  }
});

// Eventos de Pestañas/Filtros
tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    tabButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.getAttribute('data-filter');
    render();
  });
});

// Inicializar
setupNotifications();
listenTasks();
