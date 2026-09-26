// ====== CONFIGURA TU FIREBASE AQUÍ ======
// 1. Ve a https://console.firebase.google.com/ y crea un proyecto (es gratis).
// 2. En el menú "Compilación" -> "Firestore Database", crea una base de datos.
// 3. En "Configuración del proyecto" (el engranito) -> "Tus apps", agrega una app web
//    y copia aquí los valores que te dé (reemplaza todo lo de abajo):
const firebaseConfig = {
  apiKey: "AIzaSyC-ZBr1jG9mRA0tGDc_n00X8vtQbvHsKuI",
  authDomain: "organizador-tareas-compartidas.firebaseapp.com",
  projectId: "organizador-tareas-compartidas",
  storageBucket: "organizador-tareas-compartidas.firebasestorage.app",
  messagingSenderId: "840628870631",
  appId: "1:840628870631:web:87cb6bad470490520fb142"
};
// 4. En Firestore, pestaña "Reglas", pega esto para que el grupo pueda leer/escribir
//    (cualquiera con el link podrá agregar/editar/borrar tareas, así que úsalo solo
//    con tu grupo de confianza):
//    rules_version = '2';
//    service cloud.firestore {
//      match /databases/{database}/documents {
//        match /tasks/{taskId} {
//          allow read, write: if true;
//        }
//      }
//    }
// ==========================================

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const tasksCollection = db.collection('tasks');

let username = localStorage.getItem('agenda-current-user') || '';
let tasks = [];

const dateInput = document.getElementById('taskDue');
const userModal = document.getElementById('userModal');
function localToday(){const d=new Date();const off=d.getTimezoneOffset();return new Date(d.getTime()-off*60000).toISOString().slice(0,10);}
const today = localToday();
dateInput.value = today;

function prettyDate(value){if(!value)return 'Sin fecha límite';const day=new Date(value+'T12:00:00');return 'Entrega: '+day.toLocaleDateString('es-MX',{day:'numeric',month:'long'});}
function escapeHtml(value){const el=document.createElement('div');el.textContent=value;return el.innerHTML;}

function render(){
  document.getElementById('taskList').innerHTML = tasks.map(task=>`<article class="task"><div><p class="task-title">${escapeHtml(task.title)}</p><p class="task-meta">${escapeHtml(task.subject||'Sin materia')} · ${prettyDate(task.due)}${task.createdBy?` · agregó ${escapeHtml(task.createdBy)}`:''}</p></div><span class="priority ${task.priority}">${task.priority[0].toUpperCase()+task.priority.slice(1)}</span><button class="delete-button" data-delete="${task.id}" aria-label="Eliminar tarea">×</button></article>`).join('');
  document.getElementById('emptyState').hidden = tasks.length>0;
  const total = tasks.length;
  document.getElementById('pendingSummary').textContent = `${total} tarea${total===1?'':'s'} en total.`;
  document.getElementById('progressText').textContent = `${total} tarea${total===1?'':'s'}`;
  document.getElementById('progressBar').style.width = total? '100%' : '0%';
}

function listenTasks(){
  tasksCollection.orderBy('createdAt','desc').onSnapshot(snapshot=>{
    tasks = snapshot.docs.map(doc=>({id:doc.id,...doc.data()}));
    render();
  }, err=>{
    console.error('Error leyendo tareas:', err);
    document.getElementById('pendingSummary').textContent = 'No se pudieron cargar las tareas. Revisa la configuración de Firebase o tu conexión.';
  });
}

function startUser(name){
  username = name.trim();
  localStorage.setItem('agenda-current-user', username);
  document.getElementById('usernameDisplay').textContent = username;
}

document.getElementById('todayLabel').textContent = 'Hoy es ' + new Date().toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long'}) + '.';

document.getElementById('taskForm').addEventListener('submit', event=>{
  event.preventDefault();
  const title = document.getElementById('taskTitle');
  tasksCollection.add({
    title: title.value.trim(),
    subject: document.getElementById('taskSubject').value,
    due: dateInput.value,
    priority: document.getElementById('taskPriority').value,
    createdBy: username,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).catch(err=>alert('No se pudo guardar la tarea: '+err.message));
  title.value = '';
  dateInput.value = today;
});

document.getElementById('taskList').addEventListener('click', event=>{
  const remove = event.target.closest('[data-delete]');
  if(!remove) return;
  tasksCollection.doc(remove.dataset.delete).delete().catch(err=>alert('No se pudo borrar la tarea: '+err.message));
});

document.getElementById('changeUser').addEventListener('click', ()=>{
  document.getElementById('usernameInput').value = username;
  userModal.showModal();
});

document.getElementById('userForm').addEventListener('submit', event=>{
  event.preventDefault();
  startUser(document.getElementById('usernameInput').value);
  userModal.close();
});

if(username){ startUser(username); } else { userModal.showModal(); }
listenTasks();
