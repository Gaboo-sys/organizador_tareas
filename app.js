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

let activeFilter = 'all';
let username = localStorage.getItem('agenda-current-user') || '';
let tasks = [];

const dateInput = document.getElementById('taskDue');
const userModal = document.getElementById('userModal');
function localToday(){const d=new Date();const off=d.getTimezoneOffset();return new Date(d.getTime()-off*60000).toISOString().slice(0,10);}
const today = localToday();
dateInput.value = today;

function prettyDate(value){if(!value)return 'Sin fecha límite';const day=new Date(value+'T12:00:00');return 'Entrega: '+day.toLocaleDateString('es-MX',{day:'numeric',month:'long'});}
function escapeHtml(value){const el=document.createElement('div');el.textContent=value;return el.innerHTML;}

// Cada tarea guarda un mapa completedBy: { "Ana": true, "Gabo": true }.
// Así cada persona marca su
