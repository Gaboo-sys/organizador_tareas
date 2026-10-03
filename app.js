// ====== CONFIGURA TU FIREBASE AQUÍ ======
const firebaseConfig = {
  apiKey: "AIzaSyC-ZBr1jG9mRA0tGDc_n00X8vtQbvHsKuI",
  authDomain: "organizador-tareas-compartidas.firebaseapp.com",
  projectId: "organizador-tareas-compartidas",
  storageBucket: "organizador-tareas-compartidas.firebasestorage.app",
  messagingSenderId: "840628870631",
  appId: "1:840628870631:web:87cb6bad470490520fb142"
};
// ==========================================

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const tasksCollection = db.collection('tasks');

let activeFilter = 'all';
let username = localStorage.getItem('agenda-current-user') || '';
let tasks = [];

const dateInput = document.getElementById('taskDue');
const userModal = document.getElementById('userModal');
const editModal = document.getElementById('editModal');

function localToday(){
  const d=new Date();
  const off=d.getTimezoneOffset();
  return new Date(d.getTime()-off*60000).toISOString().slice(0,10);
}
const today = localToday();
dateInput.value = today;

function prettyDate(value){
  if(!value)return 'Sin fecha límite';
  const day=new Date(value+'T12:00:00');
  return 'Entrega: '+day.toLocaleDateString('es-MX',{day:'numeric',month:'long'});
}

function escapeHtml(value){
  const el=document.createElement('div');
  el.textContent=value;
  return el.innerHTML;
}

function render(){
  const visible = tasks.filter(task => 
    activeFilter === 'all' || 
    (activeFilter === 'pending' && !task.done) || 
    (activeFilter === 'done' && task.done)
  );

  document.getElementById('taskList').innerHTML = visible.map(task => `
    <article class="task ${task.done ? 'done' : ''}">
      <input class="checkbox" type="checkbox" data-id="${task.id}" ${task.done ? 'checked' : ''} aria-label="Completar tarea" />
      <div>
        <p class="task-title">${escapeHtml(task.title)}</p>
        <p class="task-meta">${escapeHtml(task.subject || 'Sin materia')} · ${prettyDate(task.due)}${task.createdBy ? ` · agregó ${escapeHtml(task.createdBy)}` : ''}</p>
      </div>
      <span class="priority ${task.priority}">${task.priority[0].toUpperCase() + task.priority.slice(1)}</span>
      <button class="edit-button" data-edit="${task.id}" aria-label="Editar tarea">✏️</button>
      <button class="delete-button" data-delete="${task.id}" aria-label="Eliminar tarea">×</button>
    </article>
  `).join('');

  document.getElementById('emptyState').hidden = visible.length > 0;
  
  const pending = tasks.filter(t => !t.done).length;
  const completed = tasks.filter(t => t.done).length;
  const total = tasks.length;

  document.getElementById('pendingSummary').textContent = `${pending} pendiente${pending === 1 ? '' : 's'} de ${total} tarea${total === 1 ? '' : 's'}.`;
  document.getElementById('progressText').textContent = `${completed} de ${total}`;
  document.getElementById('progressBar').style.width = total ? `${Math.round(completed / total * 100)}%` : '0%';
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

// Crear nueva tarea
document.getElementById('taskForm').addEventListener('submit', event=>{
  event.preventDefault();
  const title = document.getElementById('taskTitle');
  tasksCollection.add({
    title: title.value.trim(),
    subject: document.getElementById('taskSubject').value,
    due: dateInput.value,
    priority: document.getElementById('taskPriority').value,
    done: false,
    createdBy: username,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).catch(err=>alert('No se pudo guardar la tarea: '+err.message));
  title.value = '';
  dateInput.value = today;
});

// Filtros de tareas
document.getElementById('filters').addEventListener('click', event=>{
  const button = event.target.closest('button[data-filter]');
  if(!button) return;
  activeFilter = button.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach(item=>item.classList.toggle('active', item===button));
  render();
});

// Eventos en la lista de tareas (Eliminar y Abrir modal para Editar)
document.getElementById('taskList').addEventListener('click', event=>{
  // Eliminar
  const remove = event.target.closest('[data-delete]');
  if(remove) {
    tasksCollection.doc(remove.dataset.delete).delete().catch(err=>alert('No se pudo borrar la tarea: '+err.message));
    return;
  }

  // Editar
  const editBtn = event.target.closest('[data-edit]');
  if(editBtn && editModal) {
    const taskId = editBtn.dataset.edit;
    const taskToEdit = tasks.find(t => t.id === taskId);
    
    if (taskToEdit) {
      document.getElementById('editTaskId').value = taskToEdit.id;
      document.getElementById('editTaskTitle').value = taskToEdit.title;
      document.getElementById('editTaskSubject').value = taskToEdit.subject || 'Matemáticas';
      document.getElementById('editTaskDue').value = taskToEdit.due || '';
      document.getElementById('editTaskPriority').value = taskToEdit.priority || 'media';
      editModal.showModal();
    }
  }
});

// Marcar como completada/pendiente
document.getElementById('taskList').addEventListener('change', event=>{
  if(!event.target.matches('.checkbox')) return;
  tasksCollection.doc(event.target.dataset.id).update({done: event.target.checked}).catch(err=>alert('No se pudo actualizar la tarea: '+err.message));
});

// Cerrar modal de edición al hacer clic en Cancelar
const closeEditBtn = document.getElementById('closeEditModal');
if (closeEditBtn && editModal) {
  closeEditBtn.addEventListener('click', () => {
    editModal.close();
  });
}

// Enviar cambios de edición a Firestore
const editTaskForm = document.getElementById('editTaskForm');
if (editTaskForm && editModal) {
  editTaskForm.addEventListener('submit', event => {
    event.preventDefault();
    const taskId = document.getElementById('editTaskId').value;
    
    tasksCollection.doc(taskId).update({
      title: document.getElementById('editTaskTitle').value.trim(),
      subject: document.getElementById('editTaskSubject').value,
      due: document.getElementById('editTaskDue').value,
      priority: document.getElementById('editTaskPriority').value
    }).then(() => {
      editModal.close();
    }).catch(err => alert('No se pudo actualizar la tarea: ' + err.message));
  });
}

// Modal de usuario
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
