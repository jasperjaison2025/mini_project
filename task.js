const taskInput = document.getElementById("taskInput");
const alarmInput = document.getElementById("alarmInput");
const addButton = document.getElementById("addButton");
const taskList = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const taskCount = document.getElementById("taskCount");
const todayDate = document.getElementById("todayDate");
const alarmSound = document.getElementById("alarmSound");

let tasks = [];
let triggeredAlarms = new Set();

function loadTasks() {
    try {
        const savedTasks = localStorage.getItem("todoTasks");

        if (!savedTasks) {
            tasks = [];
            return;
        }

        const parsed = JSON.parse(savedTasks);

        if (!Array.isArray(parsed)) {
            tasks = [];
            return;
        }

        tasks = parsed
            .filter(task => task && typeof task.text === "string")
            .map(task => ({
                id: task.id ?? `${Date.now()}-${Math.random()}`,
                text: task.text,
                completed: Boolean(task.completed),
                alarm: typeof task.alarm === "string" ? task.alarm : ""
            }));
    } catch (error) {
        console.error("Could not load tasks:", error);
        tasks = [];
    }
}

function saveTasks() {
    try {
        localStorage.setItem("todoTasks", JSON.stringify(tasks));
    } catch (error) {
        console.error("Could not save tasks:", error);
    }
}

function displayToday() {
    const date = new Date();
    todayDate.textContent = date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric"
    });
}

function setupAlarmInput() {
    if (!alarmInput) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");

    alarmInput.min = `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatAlarmDate(value) {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });
}

function getAlarmStatus(value) {
    if (!value) return null;

    const alarmTime = new Date(value);
    if (Number.isNaN(alarmTime.getTime())) return null;

    const now = new Date();
    const difference = alarmTime.getTime() - now.getTime();

    if (difference < 0) {
        return {
            text: `Alarm passed • ${formatAlarmDate(value)}`,
            className: "triggered"
        };
    }

    if (difference < 60000) {
        return {
            text: "⏰ Alarm soon",
            className: "triggered"
        };
    }

    return {
        text: `⏰ ${formatAlarmDate(value)}`,
        className: ""
    };
}

function addTask() {
    const text = taskInput.value.trim();
    const alarm = alarmInput ? alarmInput.value : "";

    if (!text) {
        taskInput.focus();
        return;
    }

    const task = {
        id: `${Date.now()}-${Math.random()}`,
        text: text,
        completed: false,
        alarm: alarm || ""
    };

    tasks.push(task);
    saveTasks();

    taskInput.value = "";
    if (alarmInput) alarmInput.value = "";

    renderTasks();
    taskInput.focus();
}

function toggleTask(id) {
    tasks = tasks.map(task => {
        if (task.id === id) {
            return { ...task, completed: !task.completed };
        }
        return task;
    });

    saveTasks();
    renderTasks();
}

function deleteTask(id) {
    triggeredAlarms.delete(id);
    tasks = tasks.filter(task => task.id !== id);
    saveTasks();
    renderTasks();
}

function createCheckButton(task) {
    const check = document.createElement("button");
    check.type = "button";
    check.className = "check-button";
    check.textContent = "✓";
    check.setAttribute(
        "aria-label",
        task.completed ? "Mark task as incomplete" : "Mark task as completed"
    );

    check.addEventListener("click", () => toggleTask(task.id));
    return check;
}

function createTaskInfo(task) {
    const info = document.createElement("div");
    info.className = "task-info";

    const title = document.createElement("p");
    title.className = "task-title";
    title.textContent = task.text;

    const status = document.createElement("small");
    status.className = "task-status";
    status.textContent = task.completed ? "Completed" : "Not completed";

    info.appendChild(title);
    info.appendChild(status);

    if (task.alarm) {
        const alarmStatus = getAlarmStatus(task.alarm);
        if (alarmStatus) {
            const alarmElement = document.createElement("span");
            alarmElement.className = `task-datetime ${alarmStatus.className}`;
            alarmElement.textContent = alarmStatus.text;
            info.appendChild(alarmElement);
        }
    }

    return info;
}

function createDeleteButton(task) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "delete-button";
    button.textContent = "×";
    button.setAttribute("aria-label", `Delete task: ${task.text}`);
    button.addEventListener("click", () => deleteTask(task.id));
    return button;
}

function createTaskElement(task) {
    const taskElement = document.createElement("div");
    taskElement.className = "task";

    if (task.completed) {
        taskElement.classList.add("completed");
    }

    if (
        task.alarm &&
        new Date(task.alarm).getTime() <= Date.now() &&
        !task.completed &&
        triggeredAlarms.has(task.id)
    ) {
        taskElement.classList.add("alarm-triggered");
    }

    const left = document.createElement("div");
    left.className = "task-left";

    left.appendChild(createCheckButton(task));
    left.appendChild(createTaskInfo(task));

    taskElement.appendChild(left);
    taskElement.appendChild(createDeleteButton(task));

    return taskElement;
}

function renderTasks() {
    taskList.innerHTML = "";

    if (tasks.length === 0) {
        emptyState.style.display = "block";
    } else {
        emptyState.style.display = "none";
    }

    tasks.forEach(task => {
        taskList.appendChild(createTaskElement(task));
    });

    updateProgress();
}

function updateProgress() {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const percentage = total === 0 ? 0 : (completed / total) * 100;

    progressBar.style.width = `${percentage}%`;
    progressText.textContent = `${completed} of ${total} completed`;
    taskCount.textContent = total === 1 ? "1 task" : `${total} tasks`;
}

function playAlarm(task) {
    if (triggeredAlarms.has(task.id)) return;

    triggeredAlarms.add(task.id);
    renderTasks();

    if (alarmSound) {
        alarmSound.currentTime = 0;
        const playPromise = alarmSound.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.warn("Alarm audio could not play automatically:", error);
            });
        }
    }

    showAlarmNotification(task);
}

function showAlarmNotification(task) {
    // FIXED: was missing backticks → this broke the entire script
    document.title = `⏰ ALARM - ${task.text}`;

    if ("Notification" in window && Notification.permission === "granted") {
        new Notification("⏰ Task Alarm", {
            body: `Time for: ${task.text}`
        });
    }

    setTimeout(() => {
        document.title = "To-Do List";
    }, 10000);
}

function checkAlarms() {
    const now = Date.now();

    tasks.forEach(task => {
        if (!task.alarm || task.completed) return;

        const alarmTime = new Date(task.alarm).getTime();
        if (Number.isNaN(alarmTime)) return;

        if (alarmTime <= now && !triggeredAlarms.has(task.id)) {
            playAlarm(task);
        }
    });
}

function requestNotificationPermission() {
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
    }
}

// Event listeners
addButton.addEventListener("click", () => {
    addTask();
    requestNotificationPermission();
});

taskInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        event.preventDefault();
        addTask();
        requestNotificationPermission();
    }
});

if (alarmInput) {
    alarmInput.addEventListener("change", () => {
        setupAlarmInput();
    });
}

// Timers
setInterval(() => {
    displayToday();
    setupAlarmInput();
    renderTasks();
}, 60000);

setInterval(() => {
    checkAlarms();
}, 1000);

// Init
loadTasks();
displayToday();
setupAlarmInput();
renderTasks();
checkAlarms();

// Make the calendar open reliably when clicking the 📅 box
const datetimeBox = document.querySelector(".datetime-box");

if (datetimeBox && alarmInput) {
    datetimeBox.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Modern browsers
        if (typeof alarmInput.showPicker === "function") {
            try {
                alarmInput.showPicker();
            } catch (err) {
                // Fallback if showPicker fails
                alarmInput.focus();
                alarmInput.click();
            }
        } else {
            // Older browsers
            alarmInput.focus();
            alarmInput.click();
        }
    });
}