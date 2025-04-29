// ======= VARIABLES GLOBALES =======
const form = document.getElementById("task-form");
const taskList = document.getElementById("task-list");
const filterButtons = document.querySelectorAll(".filters button");
const taskCounter = document.getElementById("task-counter");
const themeToggle = document.getElementById("theme-toggle");
const undoBtn = document.getElementById("undo-btn");
const redoBtn = document.getElementById("redo-btn");

let tareas = JSON.parse(localStorage.getItem("tareas")) || [];
let filtroActual = "todas";
let undoStack = [];
let redoStack = [];

// ======= FUNCIONES =======

// Genera un ID único
function generarId() {
  return Date.now().toString();
}

// Guarda en localStorage
function guardarTareas() {
  localStorage.setItem("tareas", JSON.stringify(tareas));
}

// Renderiza las tareas según el filtro actual
function renderTasks(filtro = "todas") {
  taskList.innerHTML = "";

  let tareasFiltradas = tareas.filter((t) => {
    if (filtro === "completadas") return t.completada;
    if (filtro === "pendientes") return !t.completada;
    return true;
  });

  tareasFiltradas.forEach((tarea) => {
    const li = document.createElement("li");
    li.className = "task-item";
    if (tarea.completada) li.classList.add("completed");
    li.draggable = true;
    li.dataset.id = tarea.id;

    li.innerHTML = `
      <div class="task-order">
      <input class="checkbox" type="checkbox" ${tarea.completada ? "checked" : ""} />
      <div class="task-content">
        <div class="task-priority-tag priority-${tarea.prioridad}">${tarea.prioridad}</div>
        <span class="task-text">${tarea.texto} - ${tarea.fecha}</span>
      </div>
      </div>
      <div class="task-actions">
        <button class="edit">✏️</button>
        <button class="delete">🗑️</button>
      </div>
    `;

    // Cambiar estilo si la tarea está completada
    if (tarea.completada) {
      li.querySelector(".task-text").style.textDecoration = "line-through"; // Tachar texto
      const actionButtons = li.querySelectorAll(".task-actions button");
      actionButtons.forEach((button) => {
        button.style.textDecoration = "none"; // Asegura que los botones no tengan subrayado
      });
    }

    // Eventos
    li.querySelector('input[type="checkbox"]').addEventListener("change", () =>
      toggleCompletada(tarea.id)
    );
    li.querySelector(".delete").addEventListener("click", () =>
      eliminarTarea(tarea.id)
    );
    li.querySelector(".edit").addEventListener("click", () =>
      editarTarea(li, tarea.id)
    );

    // Drag events
    li.addEventListener("dragstart", dragStart);
    li.addEventListener("dragover", dragOver);
    li.addEventListener("drop", drop);

    taskList.appendChild(li);
  });

  actualizarContador();
  guardarTareas();
  updateUndoRedoButtons();
}

// Añade tarea
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const texto = document.getElementById("task-text").value.trim();
  const fecha = document.getElementById("task-date").value;
  const prioridad = document.getElementById("task-priority").value;

  if (!texto || !fecha) {
    alert("Texto o fecha inválidos");
    return;
  }

  const nuevaTarea = {
    id: generarId(),
    texto,
    fecha,
    prioridad,
    completada: false,
  };

  tareas.push(nuevaTarea);
  undoStack.push(["add", nuevaTarea]);
  redoStack = [];
  form.reset();
  renderTasks(filtroActual);
});

// Marcar como completada
function toggleCompletada(id) {
  const tarea = tareas.find((t) => t.id === id);
  if (tarea) {
    tarea.completada = !tarea.completada;
    undoStack.push(["toggle", id]);
    redoStack = [];
    renderTasks(filtroActual);
  }
}

// Eliminar tarea
function eliminarTarea(id) {
    const index = tareas.findIndex((t) => t.id === id);
    if (index !== -1) {
      const li = document.querySelector(`li[data-id="${id}"]`);
      li.classList.add("fade-out");
  
      li.addEventListener("animationend", () => {
        const eliminada = tareas.splice(index, 1)[0];
        undoStack.push(["delete", eliminada]);
        redoStack = [];
        renderTasks(filtroActual);
      });
    }
  }
  

// Editar tarea
function editarTarea(li, id) {
  const tarea = tareas.find((t) => t.id === id);
  const span = li.querySelector(".task-text");
  const acciones = li.querySelector(".task-actions");

  const inputTexto = document.createElement("input");
  inputTexto.type = "text";
  inputTexto.value = tarea.texto;

  const inputFecha = document.createElement("input");
  inputFecha.type = "date";
  inputFecha.value = tarea.fecha;

  const inputPrioridad = document.createElement("select");
  ["alta", "media", "baja"].forEach((nivel) => {
    const option = document.createElement("option");
    option.value = nivel;
    option.textContent = nivel;
    if (tarea.prioridad === nivel) option.selected = true;
    inputPrioridad.appendChild(option);
  });

  const guardar = document.createElement("button");
  guardar.textContent = "💾";

  const cancelar = document.createElement("button");
  cancelar.textContent = "❌";

  span.replaceWith(inputTexto);
  acciones.innerHTML = "";
  acciones.appendChild(inputFecha);
  acciones.appendChild(inputPrioridad);
  acciones.appendChild(guardar);
  acciones.appendChild(cancelar);

  guardar.addEventListener("click", () => {
    const nuevoTexto = inputTexto.value.trim();
    const nuevaFecha = inputFecha.value;
    const nuevaPrioridad = inputPrioridad.value;

    if (!nuevoTexto || !isValidDate(nuevaFecha)) {
      alert("Texto vacío o fecha inválida");
      return;
    }

    const anterior = { ...tarea };
    tarea.texto = nuevoTexto;
    tarea.fecha = nuevaFecha;
    tarea.prioridad = nuevaPrioridad;

    undoStack.push(["edit", anterior]);
    redoStack = [];
    renderTasks(filtroActual);
  });

  cancelar.addEventListener("click", () => renderTasks(filtroActual));
}

// Valida fechas
function isValidDate(fecha) {
  return !isNaN(new Date(fecha).getTime());
}

// Filtro de tareas
filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    filtroActual = btn.dataset.filter;
    renderTasks(filtroActual);
  });
});

// Contador de tareas pendientes
function actualizarContador() {
  const restantes = tareas.filter((t) => !t.completada).length;
  taskCounter.textContent = `${restantes} tareas pendientes`;
}

// === DRAG & DROP ===
let draggedId = null;

function dragStart(e) {
  draggedId = e.currentTarget.dataset.id;
}

function dragOver(e) {
  e.preventDefault();
}

function drop(e) {
  e.preventDefault();
  const targetId = e.currentTarget.dataset.id;
  if (draggedId === targetId) return;

  const fromIndex = tareas.findIndex((t) => t.id === draggedId);
  const toIndex = tareas.findIndex((t) => t.id === targetId);
  const [movedTask] = tareas.splice(fromIndex, 1);
  tareas.splice(toIndex, 0, movedTask);
  renderTasks(filtroActual);
}

// Botón de cambio de tema
themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-theme");
  const tema = document.body.classList.contains("dark-theme")
    ? "oscuro"
    : "claro";
  localStorage.setItem("tema", tema);
});

// Aplicar tema al iniciar
(function initTema() {
  const temaGuardado = localStorage.getItem("tema");
  if (temaGuardado === "oscuro") {
    document.body.classList.add("dark-theme");
  }
})();

// === UNDO / REDO ===
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "z") undo();
  if (e.ctrlKey && e.key === "y") redo();
});

undoBtn.addEventListener("click", undo);
redoBtn.addEventListener("click", redo);

function undo() {
  const accion = undoStack.pop();
  if (!accion) return;

  const [tipo, data] = accion;
  if (tipo === "add") {
    tareas = tareas.filter((t) => t.id !== data.id);
  } else if (tipo === "delete") {
    tareas.push(data);
  } else if (tipo === "edit") {
    const tarea = tareas.find((t) => t.id === data.id);
    Object.assign(tarea, data);
  } else if (tipo === "toggle") {
    const tarea = tareas.find((t) => t.id === data);
    tarea.completada = !tarea.completada;
  }

  redoStack.push(accion);
  renderTasks(filtroActual);
}

function redo() {
  const accion = redoStack.pop();
  if (!accion) return;

  const [tipo, data] = accion;
  if (tipo === "add") {
    tareas.push(data);
  } else if (tipo === "delete") {
    tareas = tareas.filter((t) => t.id !== data.id);
  } else if (tipo === "edit") {
    const tarea = tareas.find((t) => t.id === data.id);
    Object.assign(tarea, data);
  } else if (tipo === "toggle") {
    const tarea = tareas.find((t) => t.id === data);
    tarea.completada = !tarea.completada;
  }

  undoStack.push(accion);
  renderTasks(filtroActual);
}

// Actualiza estado de botones undo/redo
function updateUndoRedoButtons() {
  undoBtn.disabled = undoStack.length === 0;
  redoBtn.disabled = redoStack.length === 0;
}

// Exportar tareas a CSV

document.getElementById("export-csv").addEventListener("click", () => {
    if (tareas.length === 0) {
      alert("No hay tareas para exportar.");
      return;
    }
  
    const encabezados = ["Texto", "Fecha", "Prioridad", "Completada"];
    const filas = tareas.map((t) =>
      [t.texto, t.fecha, t.prioridad, t.completada ? "Sí" : "No"].join(",")
    );
  
    const contenido = [encabezados.join(","), ...filas].join("\n");
    const blob = new Blob([contenido], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
  
    const a = document.createElement("a");
    a.href = url;
    a.download = "tareas.csv";
    a.click();
  
    URL.revokeObjectURL(url);
  });

  //Alerta de tareas por vencer
  function verificarTareasProximas() {
    const ahora = new Date();
    const en24h = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
  
    const proximas = tareas.filter((t) => {
      const fechaTarea = new Date(t.fecha);
      return !t.completada && fechaTarea >= ahora && fechaTarea <= en24h;
    });
  
    if (proximas.length > 0) {
      const nombres = proximas.map((t) => `- ${t.texto} (${t.fecha})`).join("\n");
      alert(`Tareas próximas a vencer:\n\n${nombres}`);
    }
  }
  
  // Revisa cada minuto si hay tareas próximas a vencer
  setInterval(verificarTareasProximas, 60 * 1000);
  
  

// Carga inicial
renderTasks();
