// Constants and State Management
const STORAGE_KEYS = {
  PROFILE: "user_profile",
  TASKS: "daily_tasks",
  EXPENSES: "expenses",
  SUBJECTS: "subjects",
  THEME: "theme_preference",
  ALARMS: "alarms",
  RESOURCES: "resources",
  NOTES: "notes",
  SOCIAL_PROFILES: "social_profiles",
};

let currentPage = "planner";
let currentDate = new Date();
let activeCategory = "all";
let activeResourceType = "all";

// Theme Management with improved transitions
function toggleTheme() {
  const isDark = document.body.classList.toggle("dark-theme");
  localStorage.setItem(STORAGE_KEYS.THEME, isDark ? "dark" : "light");
  updateThemeIcon();

  // Add transition class for smooth color changes
  document.body.classList.add("theme-transitioning");
  setTimeout(() => {
    document.body.classList.remove("theme-transitioning");
  }, 300);
}

function updateThemeIcon() {
  const isDark = document.body.classList.contains("dark-theme");
  document.querySelectorAll(".theme-toggle i").forEach((icon) => {
    icon.className = isDark ? "fas fa-sun" : "fas fa-moon";
  });
}

// Page Navigation
async function loadPage(pageName) {
  try {
    const response = await fetch(`pages/${pageName}.html`);
    const content = await response.text();
    document.getElementById("pageContent").innerHTML = content;

    // Update active state and breadcrumb
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.classList.toggle("active", link.dataset.page === pageName);
    });
    document.getElementById("currentSection").textContent = `/ ${
      pageName.charAt(0).toUpperCase() + pageName.slice(1)
    }`;

    // Initialize page-specific content
    switch (pageName) {
      case "planner":
        initializePlanner();
        break;
      case "expenses":
        initializeExpenses();
        break;
      case "subjects":
        initializeSubjects();
        break;
    }
  } catch (error) {
    console.error("Error loading page:", error);
  }
}

// Profile Management
function previewAvatar(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      document.getElementById("avatarPreview").src = e.target.result;
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function updateProfile() {
  const name = document.getElementById("profileName").value;
  const email = document.getElementById("profileEmail").value;
  const bio = document.getElementById("profileBio").value;
  const avatar = document.getElementById("avatarPreview").src;

  if (!name || !email) {
    showNotification("Please fill in all required fields", "error");
    return;
  }

  const profile = {
    name,
    email,
    bio,
    avatar,
    lastUpdated: new Date().toISOString(),
  };

  localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));

  // Update UI
  document.getElementById("userName").textContent = name;
  document.getElementById("userEmail").textContent = email;
  document.getElementById("userAvatar").src = avatar;

  showNotification("Profile updated successfully", "success");
  hideModal("profile-modal");
}

function loadProfile() {
  const profile = JSON.parse(
    localStorage.getItem(STORAGE_KEYS.PROFILE) || "{}"
  );
  if (profile.name) {
    document.getElementById("profileName").value = profile.name;
    document.getElementById("profileEmail").value = profile.email;
    document.getElementById("profileBio").value = profile.bio || "";
    document.getElementById("avatarPreview").src = profile.avatar;
    document.getElementById("userAvatar").src = profile.avatar;
    document.getElementById("userName").textContent = profile.name;
    document.getElementById("userEmail").textContent = profile.email;
  }
}

// Task Management
function initializePlanner() {
  generateTimeSlots();
  updateCurrentDate();
  renderTasks();
  updateTaskSummary();
}

function generateTimeSlots() {
  const container = document.getElementById("timeSlots");
  if (!container) return;

  const startHour = 6; // 6 AM
  const endHour = 22; // 10 PM
  let html = "";

  for (let hour = startHour; hour <= endHour; hour++) {
    const time = `${hour.toString().padStart(2, "0")}:00`;
    const tasks = getTasksForTime(time);

    html += `
            <div class="time-slot-item" data-time="${time}">
                <div class="time-slot-time">${formatTime(time)}</div>
                <div class="time-slot-content">
                    ${tasks
                      .map(
                        (task) => `
                        <div class="task-item priority-${task.priority} ${
                          task.completed ? "completed" : ""
                        }">
                            <div class="task-info">
                                <h4>${task.title}</h4>
                                <p>${task.description || ""}</p>
                            </div>
                            <div class="task-priority">
                                <span class="priority-badge">${
                                  task.priority
                                }</span>
                            </div>
                            <div class="task-actions">
                                <button onclick="toggleTaskComplete(${
                                  task.id
                                })" class="btn-icon" title="${
                          task.completed ? "Mark Incomplete" : "Mark Complete"
                        }">
                                    <i class="fas ${
                                      task.completed
                                        ? "fa-check-circle"
                                        : "fa-circle"
                                    }"></i>
                                </button>
                                <button onclick="editTask(${
                                  task.id
                                })" class="btn-icon" title="Edit">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="deleteTask(${
                                  task.id
                                })" class="btn-icon btn-danger" title="Delete">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `
                      )
                      .join("")}
                </div>
                <div class="time-slot-add">
                    <button class="btn-icon" onclick="quickAddTask('${time}')" title="Add task">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
        `;
  }

  container.innerHTML = html;
}

function updateCurrentDate() {
  const dateDisplay = document.getElementById("currentDate");
  const fullDateDisplay = document.getElementById("fullDate");

  if (dateDisplay && fullDateDisplay) {
    const today = new Date();
    const isToday = isSameDay(today, currentDate);
    const isTomorrow = isSameDay(addDays(today, 1), currentDate);
    const isYesterday = isSameDay(addDays(today, -1), currentDate);

    dateDisplay.textContent = isToday
      ? "Today"
      : isTomorrow
      ? "Tomorrow"
      : isYesterday
      ? "Yesterday"
      : formatDate(currentDate);

    fullDateDisplay.textContent = currentDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
}

function changeDate(days) {
  currentDate = addDays(currentDate, days);
  updateCurrentDate();
  renderTasks();
  updateTaskSummary();
}

function quickAddTask(time) {
  document.getElementById("taskTime").value = time;
  showModal("task-modal");
}

function addTask() {
  const title = document.getElementById("taskTitle").value;
  const time = document.getElementById("taskTime").value;
  const priority = document.getElementById("taskPriority").value;
  const description = document.getElementById("taskDescription").value;

  if (!title || !time) {
    showNotification("Please fill in required fields", "error");
    return;
  }

  const task = {
    id: Date.now(),
    title,
    time,
    priority,
    description,
    completed: false,
    date: formatDateForStorage(currentDate),
  };

  const tasks = getTasks();
  tasks.push(task);
  localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));

  hideModal("task-modal");
  resetTaskForm();
  renderTasks();
  updateTaskSummary();
  showNotification("Task added successfully", "success");
}

function editTask(id) {
  const tasks = getTasks();
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  document.getElementById("taskTitle").value = task.title;
  document.getElementById("taskTime").value = task.time;
  document.getElementById("taskPriority").value = task.priority;
  document.getElementById("taskDescription").value = task.description || "";

  const modal = document.getElementById("task-modal");
  modal.dataset.editId = id;
  showModal("task-modal");
}

function updateTaskSummary() {
  const tasks = getTasksForDate(formatDateForStorage(currentDate));
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.completed).length;
  const remainingTasks = totalTasks - completedTasks;

  document.getElementById("totalTasks").textContent = totalTasks;
  document.getElementById("completedTasks").textContent = completedTasks;
  document.getElementById("remainingTasks").textContent = remainingTasks;
}

// Helper Functions
function getTasks() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || "[]");
}

function getTasksForDate(date) {
  return getTasks().filter((task) => task.date === date);
}

function getTasksForTime(time) {
  return getTasksForDate(formatDateForStorage(currentDate))
    .filter((task) => task.time === time)
    .sort((a, b) => {
      if (a.completed === b.completed) return 0;
      return a.completed ? 1 : -1;
    });
}

function formatDateForStorage(date) {
  return date.toISOString().split("T")[0];
}

function isSameDay(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function resetTaskForm() {
  document.getElementById("taskTitle").value = "";
  document.getElementById("taskTime").value = "";
  document.getElementById("taskPriority").value = "low";
  document.getElementById("taskDescription").value = "";
  delete document.getElementById("task-modal").dataset.editId;
}

// Expense Management
function initializeExpenses() {
  renderExpenseSummary();
  renderExpenseChart();
  renderExpenseList();
  initializeExpenseCategories();
}

function renderExpenseSummary() {
  const expenses = getExpenses();
  const total = calculateTotal(expenses);
  const monthly = calculateMonthlyTotal(expenses);
  const daily = calculateDailyAverage(expenses);

  document.getElementById("totalExpenses").textContent = formatCurrency(total);
  document.getElementById("monthlyExpenses").textContent =
    formatCurrency(monthly);
  document.getElementById("dailyAverage").textContent = formatCurrency(daily);
}

function renderExpenseChart() {
  const ctx = document.createElement("canvas");
  document.querySelector(".chart-container").innerHTML = "";
  document.querySelector(".chart-container").appendChild(ctx);

  const expenses = getExpenses();
  const categoryTotals = calculateCategoryTotals(expenses);

  new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: Object.keys(categoryTotals),
      datasets: [
        {
          data: Object.values(categoryTotals),
          backgroundColor: getCategoryColors(),
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "right",
          labels: {
            color: document.body.classList.contains("dark-theme")
              ? "#f1f5f9"
              : "#1f2937",
          },
        },
      },
    },
  });
}

function renderExpenseList(filter = "") {
  const expenses = filterExpenses(getExpenses(), filter);
  const container = document.getElementById("expenseList");

  if (expenses.length === 0) {
    container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-receipt"></i>
                <p>No expenses found</p>
            </div>
        `;
    return;
  }

  container.innerHTML = expenses
    .map(
      (expense) => `
        <div class="expense-item" data-id="${expense.id}">
            <div class="expense-category">
                <span class="expense-category-tag category-${expense.category}">
                    <i class="fas ${getCategoryIcon(expense.category)}"></i>
                    ${formatCategory(expense.category)}
                </span>
            </div>
            <div class="expense-details">
                <h4>${expense.description}</h4>
                <span class="expense-date">${formatDate(expense.date)}</span>
            </div>
            <div class="expense-amount">
                ${formatCurrency(expense.amount)}
            </div>
            <div class="expense-actions">
                <button class="btn-icon" onclick="editExpense(${
                  expense.id
                })" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon btn-danger" onclick="deleteExpense(${
                  expense.id
                })" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `
    )
    .join("");
}

function initializeExpenseCategories() {
  const categories = document.querySelectorAll(".category-card");
  categories.forEach((card) => {
    card.addEventListener("click", () => {
      categories.forEach((c) => c.classList.remove("active"));
      card.classList.add("active");
      activeCategory = card.dataset.category;
      renderExpenseList(activeCategory);
    });
  });
}

// Expense Utilities
function getExpenses() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.EXPENSES) || "[]");
}

function addExpense() {
  const description = document.getElementById("expenseDesc").value;
  const amount = parseFloat(document.getElementById("expenseAmount").value);
  const category = document.getElementById("expenseCategory").value;
  const date =
    document.getElementById("expenseDate").value ||
    new Date().toISOString().split("T")[0];

  if (!description || !amount || amount <= 0) {
    showNotification("Please fill in all required fields", "error");
    return;
  }

  const expense = {
    id: Date.now(),
    description,
    amount,
    category,
    date,
  };

  const expenses = getExpenses();
  expenses.push(expense);
  localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));

  hideModal("expense-modal");
  showNotification("Expense added successfully", "success");
  initializeExpenses();
}

// Helper Functions
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(date) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCategory(category) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function getCategoryIcon(category) {
  const icons = {
    food: "fa-utensils",
    transport: "fa-car",
    utilities: "fa-bolt",
    entertainment: "fa-film",
    shopping: "fa-shopping-bag",
    other: "fa-ellipsis-h",
  };
  return icons[category] || "fa-tag";
}

function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
        <i class="fas ${
          type === "success" ? "fa-check-circle" : "fa-exclamation-circle"
        }"></i>
        <span>${message}</span>
    `;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add("show");
    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }, 100);
}

// Utility Functions
function formatTime(time) {
  return new Date(`2000-01-01T${time}`).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function showModal(modalId) {
  document.getElementById(modalId).style.display = "flex";
  document.body.style.overflow = "hidden";
}

function hideModal(modalId) {
  document.getElementById(modalId).style.display = "none";
  document.body.style.overflow = "auto";
}

// Expense Calculations
function calculateTotal(expenses) {
  return expenses.reduce((sum, expense) => sum + expense.amount, 0);
}

function calculateMonthlyTotal(expenses) {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  return expenses
    .filter((expense) => {
      const expenseDate = new Date(expense.date);
      return (
        expenseDate.getMonth() === currentMonth &&
        expenseDate.getFullYear() === currentYear
      );
    })
    .reduce((sum, expense) => sum + expense.amount, 0);
}

function calculateDailyAverage(expenses) {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyExpenses = expenses.filter((expense) => {
    const expenseDate = new Date(expense.date);
    return (
      expenseDate.getMonth() === currentMonth &&
      expenseDate.getFullYear() === currentYear
    );
  });

  const total = calculateTotal(monthlyExpenses);
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  return total / daysInMonth;
}

function calculateCategoryTotals(expenses) {
  return expenses.reduce((totals, expense) => {
    totals[expense.category] = (totals[expense.category] || 0) + expense.amount;
    return totals;
  }, {});
}

// Filtering Functions
function filterExpenses(expenses, filter) {
  if (!filter || filter === "all") return expenses;

  return expenses.filter((expense) => expense.category === filter);
}

function getCategoryColors() {
  return {
    food: "#f87171",
    transport: "#60a5fa",
    utilities: "#34d399",
    entertainment: "#a78bfa",
    shopping: "#fbbf24",
    other: "#9ca3af",
  };
}

// Edit and Delete Functions
function editExpense(id) {
  const expenses = getExpenses();
  const expense = expenses.find((e) => e.id === id);
  if (!expense) return;

  // Populate modal with expense data
  document.getElementById("expenseDesc").value = expense.description;
  document.getElementById("expenseAmount").value = expense.amount;
  document.getElementById("expenseCategory").value = expense.category;
  document.getElementById("expenseDate").value = expense.date;

  // Store expense ID for updating
  document.getElementById("expense-modal").dataset.editId = id;

  showModal("expense-modal");
}

function deleteExpense(id) {
  if (!confirm("Are you sure you want to delete this expense?")) return;

  const expenses = getExpenses();
  const updatedExpenses = expenses.filter((expense) => expense.id !== id);
  localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(updatedExpenses));

  showNotification("Expense deleted successfully", "success");
  initializeExpenses();
}

// Search Function
function searchExpenses(query) {
  if (!query) {
    renderExpenseList(activeCategory);
    return;
  }

  const expenses = getExpenses();
  const filtered = expenses.filter(
    (expense) =>
      expense.description.toLowerCase().includes(query.toLowerCase()) ||
      expense.category.toLowerCase().includes(query.toLowerCase())
  );

  renderExpenseList(filtered);
}

// Alarm System Functions
function setAlarm() {
  const time = document.getElementById("alarmTime").value;
  const label = document.getElementById("alarmLabel").value;
  const sound = document.getElementById("alarmSound").value;
  const repeat = document.getElementById("alarmRepeat").checked;

  if (!time) {
    showNotification("Please set a time for the alarm", "error");
    return;
  }

  const alarm = {
    id: Date.now(),
    time,
    label: label || "Alarm",
    sound,
    repeat,
    active: true,
    created: new Date().toISOString(),
  };

  const alarms = JSON.parse(localStorage.getItem(STORAGE_KEYS.ALARMS) || "[]");
  alarms.push(alarm);
  localStorage.setItem(STORAGE_KEYS.ALARMS, JSON.stringify(alarms));

  renderAlarms();
  showNotification("Alarm set successfully", "success");
  hideModal("alarm-modal");
}

function renderAlarms() {
  const alarms = JSON.parse(localStorage.getItem(STORAGE_KEYS.ALARMS) || "[]");
  const container = document.getElementById("alarmsList");

  if (!container) return;

  container.innerHTML = alarms
    .map(
      (alarm) => `
        <div class="alarm-item" data-id="${alarm.id}">
            <div class="alarm-info">
                <div class="alarm-time">${formatTime(alarm.time)}</div>
                <div class="alarm-label">${alarm.label}</div>
            </div>
            <div class="alarm-actions">
                <div class="alarm-toggle ${alarm.active ? "active" : ""}" 
                     onclick="toggleAlarm(${alarm.id})" 
                     title="${alarm.active ? "Disable" : "Enable"} alarm">
                </div>
                <button class="btn-icon" onclick="deleteAlarm(${
                  alarm.id
                })" title="Delete alarm">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `
    )
    .join("");
}

function toggleAlarm(id) {
  const alarms = JSON.parse(localStorage.getItem(STORAGE_KEYS.ALARMS) || "[]");
  const index = alarms.findIndex((alarm) => alarm.id === id);

  if (index !== -1) {
    alarms[index].active = !alarms[index].active;
    localStorage.setItem(STORAGE_KEYS.ALARMS, JSON.stringify(alarms));
    renderAlarms();
  }
}

function deleteAlarm(id) {
  const alarms = JSON.parse(localStorage.getItem(STORAGE_KEYS.ALARMS) || "[]");
  const updatedAlarms = alarms.filter((alarm) => alarm.id !== id);
  localStorage.setItem(STORAGE_KEYS.ALARMS, JSON.stringify(updatedAlarms));
  renderAlarms();
  showNotification("Alarm deleted", "success");
}

function checkAlarms() {
  const alarms = JSON.parse(localStorage.getItem(STORAGE_KEYS.ALARMS) || "[]");
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}`;

  alarms.forEach((alarm) => {
    if (alarm.active && alarm.time === currentTime) {
      triggerAlarm(alarm);
    }
  });
}

function triggerAlarm(alarm) {
  // Add blinking effect to the body
  document.body.classList.add("alarm-active");

  // Play alarm sound
  const audio = new Audio(`sounds/${alarm.sound}.mp3`);
  audio.play();

  // Show notification
  showNotification(`Alarm: ${alarm.label}`, "warning");

  // Remove blinking effect after 2 seconds
  setTimeout(() => {
    document.body.classList.remove("alarm-active");
  }, 2000);

  // If not repeating, disable the alarm
  if (!alarm.repeat) {
    const alarms = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.ALARMS) || "[]"
    );
    const index = alarms.findIndex((a) => a.id === alarm.id);
    if (index !== -1) {
      alarms[index].active = false;
      localStorage.setItem(STORAGE_KEYS.ALARMS, JSON.stringify(alarms));
      renderAlarms();
    }
  }
}

// Resource Management Functions
function initializeResources() {
  renderResources();
  initializeResourceCategories();
}

function addResource() {
  const title = document.getElementById("resourceTitle").value;
  const type = document.getElementById("resourceType").value;
  const url = document.getElementById("resourceUrl").value;
  const description = document.getElementById("resourceDescription").value;
  const tags = document
    .getElementById("resourceTags")
    .value.split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag);

  if (!title || !url) {
    showNotification("Please fill in all required fields", "error");
    return;
  }

  const resource = {
    id: Date.now(),
    title,
    type,
    url,
    description,
    tags,
    dateAdded: new Date().toISOString(),
    lastAccessed: null,
  };

  const resources = JSON.parse(
    localStorage.getItem(STORAGE_KEYS.RESOURCES) || "[]"
  );
  resources.push(resource);
  localStorage.setItem(STORAGE_KEYS.RESOURCES, JSON.stringify(resources));

  renderResources();
  showNotification("Resource added successfully", "success");
  hideModal("resource-modal");
  resetResourceForm();
}

function renderResources() {
  const resources = JSON.parse(
    localStorage.getItem(STORAGE_KEYS.RESOURCES) || "[]"
  );
  const container = document.getElementById("resourceList");

  if (!container) return;

  const filteredResources =
    activeResourceType === "all"
      ? resources
      : resources.filter((r) => r.type === activeResourceType);

  if (filteredResources.length === 0) {
    container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <p>No resources found</p>
            </div>
        `;
    return;
  }

  container.innerHTML = filteredResources
    .map(
      (resource) => `
        <div class="resource-card" data-id="${resource.id}">
            <div class="resource-type ${resource.type}">
                <i class="fas ${getResourceTypeIcon(resource.type)}"></i>
                ${formatResourceType(resource.type)}
            </div>
            <h3 class="resource-title">${resource.title}</h3>
            <p class="resource-description">${resource.description || ""}</p>
            <div class="resource-tags">
                ${resource.tags
                  .map(
                    (tag) => `
                    <span class="resource-tag">#${tag}</span>
                `
                  )
                  .join("")}
            </div>
            <div class="resource-actions">
                <a href="${
                  resource.url
                }" target="_blank" class="btn btn-primary btn-sm">
                    <i class="fas fa-external-link-alt"></i> Open
                </a>
                <div class="action-buttons">
                    <button class="btn-icon" onclick="editResource(${
                      resource.id
                    })" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-danger" onclick="deleteResource(${
                      resource.id
                    })" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `
    )
    .join("");
}

function initializeResourceCategories() {
  const categories = document.querySelectorAll(".category-pill");
  categories.forEach((category) => {
    category.addEventListener("click", () => {
      categories.forEach((c) => c.classList.remove("active"));
      category.classList.add("active");
      activeResourceType = category.dataset.type;
      renderResources();
    });
  });
}

function getResourceTypeIcon(type) {
  const icons = {
    video: "fa-video",
    article: "fa-file-alt",
    document: "fa-file-pdf",
    other: "fa-file",
  };
  return icons[type] || "fa-file";
}

function formatResourceType(type) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function editResource(id) {
  const resources = JSON.parse(
    localStorage.getItem(STORAGE_KEYS.RESOURCES) || "[]"
  );
  const resource = resources.find((r) => r.id === id);
  if (!resource) return;

  document.getElementById("resourceTitle").value = resource.title;
  document.getElementById("resourceType").value = resource.type;
  document.getElementById("resourceUrl").value = resource.url;
  document.getElementById("resourceDescription").value =
    resource.description || "";
  document.getElementById("resourceTags").value = resource.tags.join(", ");

  document.getElementById("resource-modal").dataset.editId = id;
  showModal("resource-modal");
}

function deleteResource(id) {
  if (!confirm("Are you sure you want to delete this resource?")) return;

  const resources = JSON.parse(
    localStorage.getItem(STORAGE_KEYS.RESOURCES) || "[]"
  );
  const updatedResources = resources.filter((r) => r.id !== id);
  localStorage.setItem(
    STORAGE_KEYS.RESOURCES,
    JSON.stringify(updatedResources)
  );

  showNotification("Resource deleted successfully", "success");
  renderResources();
}

function resetResourceForm() {
  document.getElementById("resourceTitle").value = "";
  document.getElementById("resourceType").value = "video";
  document.getElementById("resourceUrl").value = "";
  document.getElementById("resourceDescription").value = "";
  document.getElementById("resourceTags").value = "";
  delete document.getElementById("resource-modal").dataset.editId;
}

// Notes Management Functions
function initializeNotes() {
  renderNotes();
  renderNoteCategories();
}

function addNote() {
  const title = document.getElementById("noteTitle").value;
  const category = document.getElementById("noteCategory").value;
  const content = document.getElementById("noteContent").value;

  if (!title || !content) {
    showNotification("Please fill in all required fields", "error");
    return;
  }

  const note = {
    id: Date.now(),
    title,
    category: category || "Uncategorized",
    content,
    created: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    color: getRandomNoteColor(),
  };

  const notes = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES) || "[]");
  notes.push(note);
  localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));

  renderNotes();
  renderNoteCategories();
  showNotification("Note added successfully", "success");
  hideModal("note-modal");
  resetNoteForm();
}

function renderNotes(filterCategory = "", searchQuery = "") {
  const notes = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES) || "[]");
  const container = document.getElementById("notesList");

  if (!container) return;

  let filteredNotes = notes;

  if (filterCategory) {
    filteredNotes = filteredNotes.filter(
      (note) => note.category === filterCategory
    );
  }

  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredNotes = filteredNotes.filter(
      (note) =>
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query) ||
        note.category.toLowerCase().includes(query)
    );
  }

  if (filteredNotes.length === 0) {
    container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-sticky-note"></i>
                <p>No notes found</p>
            </div>
        `;
    return;
  }

  container.innerHTML = filteredNotes
    .map(
      (note) => `
        <div class="note-card" style="background-color: ${
          note.color
        }" data-id="${note.id}">
            <div class="note-header">
                <h3>${note.title}</h3>
                <span class="note-category">${note.category}</span>
            </div>
            <div class="note-content">
                ${formatNoteContent(note.content)}
            </div>
            <div class="note-footer">
                <span class="note-date">${formatDate(note.lastModified)}</span>
                <div class="note-actions">
                    <button class="btn-icon" onclick="editNote(${
                      note.id
                    })" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-danger" onclick="deleteNote(${
                      note.id
                    })" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `
    )
    .join("");
}

function renderNoteCategories() {
  const notes = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES) || "[]");
  const categories = [...new Set(notes.map((note) => note.category))];
  const container = document.getElementById("noteCategories");

  if (!container) return;

  container.innerHTML = `
        <div class="note-category-item active" data-category="">
            All Notes (${notes.length})
        </div>
        ${categories
          .map(
            (category) => `
            <div class="note-category-item" data-category="${category}">
                ${category} (${
              notes.filter((note) => note.category === category).length
            })
            </div>
        `
          )
          .join("")}
    `;

  // Add click event listeners
  container.querySelectorAll(".note-category-item").forEach((item) => {
    item.addEventListener("click", () => {
      container
        .querySelectorAll(".note-category-item")
        .forEach((i) => i.classList.remove("active"));
      item.classList.add("active");
      renderNotes(item.dataset.category);
    });
  });
}

function editNote(id) {
  const notes = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES) || "[]");
  const note = notes.find((n) => n.id === id);
  if (!note) return;

  document.getElementById("noteTitle").value = note.title;
  document.getElementById("noteCategory").value = note.category;
  document.getElementById("noteContent").value = note.content;

  document.getElementById("note-modal").dataset.editId = id;
  showModal("note-modal");
}

function deleteNote(id) {
  if (!confirm("Are you sure you want to delete this note?")) return;

  const notes = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES) || "[]");
  const updatedNotes = notes.filter((note) => note.id !== id);
  localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(updatedNotes));

  renderNotes();
  renderNoteCategories();
  showNotification("Note deleted successfully", "success");
}

function searchNotes(query) {
  const activeCategory = document.querySelector(".note-category-item.active")
    .dataset.category;
  renderNotes(activeCategory, query);
}

function formatNoteContent(content) {
  // Truncate content if it's too long
  return content.length > 200 ? content.substring(0, 200) + "..." : content;
}

function getRandomNoteColor() {
  const colors = [
    "#fff8dc", // Cornsilk
    "#f0fff0", // Honeydew
    "#f5f5dc", // Beige
    "#e6e6fa", // Lavender
    "#f0f8ff", // AliceBlue
    "#fff0f5", // LavenderBlush
    "#f5fffa", // MintCream
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

function resetNoteForm() {
  document.getElementById("noteTitle").value = "";
  document.getElementById("noteCategory").value = "";
  document.getElementById("noteContent").value = "";
  delete document.getElementById("note-modal").dataset.editId;
}

// Social Media Management Functions
function initializeSocialMedia() {
  renderSocialProfiles();
  updateSocialAnalytics();
}

function addSocialProfile() {
  const platform = document.getElementById("socialPlatform").value;
  const username = document.getElementById("socialUsername").value;
  const url = document.getElementById("socialUrl").value;
  const followers =
    parseInt(document.getElementById("socialFollowers").value) || 0;
  const bio = document.getElementById("socialBio").value;
  const isActive = document.getElementById("socialActive").checked;

  if (!username || !url) {
    showNotification("Please fill in all required fields", "error");
    return;
  }

  const profile = {
    id: Date.now(),
    platform,
    username,
    url,
    followers,
    bio,
    isActive,
    dateAdded: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
  };

  const profiles = JSON.parse(
    localStorage.getItem(STORAGE_KEYS.SOCIAL_PROFILES) || "[]"
  );
  profiles.push(profile);
  localStorage.setItem(STORAGE_KEYS.SOCIAL_PROFILES, JSON.stringify(profiles));

  renderSocialProfiles();
  updateSocialAnalytics();
  showNotification("Social profile added successfully", "success");
  hideModal("social-modal");
  resetSocialForm();
}

function renderSocialProfiles() {
  const profiles = JSON.parse(
    localStorage.getItem(STORAGE_KEYS.SOCIAL_PROFILES) || "[]"
  );
  const container = document.getElementById("socialProfiles");

  if (!container) return;

  if (profiles.length === 0) {
    container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-share-alt"></i>
                <p>No social profiles added yet</p>
            </div>
        `;
    return;
  }

  container.innerHTML = profiles
    .map(
      (profile) => `
        <div class="social-profile-card ${
          profile.isActive ? "active" : "inactive"
        }" data-id="${profile.id}">
            <div class="profile-platform">
                <div class="platform-icon ${profile.platform}">
                    <i class="fab fa-${profile.platform}"></i>
                </div>
                <div class="profile-info">
                    <h3 class="profile-username">${profile.username}</h3>
                    <span class="profile-platform-name">${formatPlatformName(
                      profile.platform
                    )}</span>
                </div>
            </div>
            <p class="profile-bio">${profile.bio || ""}</p>
            <div class="profile-stats">
                <div class="stat-item">
                    <span class="stat-value">${formatNumber(
                      profile.followers
                    )}</span>
                    <span class="stat-label">Followers</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${formatDate(
                      profile.lastUpdated
                    )}</span>
                    <span class="stat-label">Last Updated</span>
                </div>
            </div>
            <div class="profile-actions">
                <a href="${
                  profile.url
                }" target="_blank" class="btn btn-primary btn-sm">
                    <i class="fas fa-external-link-alt"></i> View Profile
                </a>
                <div class="action-buttons">
                    <button class="btn-icon" onclick="editSocialProfile(${
                      profile.id
                    })" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon" onclick="toggleProfileStatus(${
                      profile.id
                    })" 
                            title="${
                              profile.isActive ? "Deactivate" : "Activate"
                            }">
                        <i class="fas fa-${
                          profile.isActive ? "toggle-on" : "toggle-off"
                        }"></i>
                    </button>
                    <button class="btn-icon btn-danger" onclick="deleteSocialProfile(${
                      profile.id
                    })" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `
    )
    .join("");
}

function updateSocialAnalytics() {
  const profiles = JSON.parse(
    localStorage.getItem(STORAGE_KEYS.SOCIAL_PROFILES) || "[]"
  );

  // Calculate total followers
  const totalFollowers = profiles.reduce(
    (sum, profile) => sum + profile.followers,
    0
  );
  document.getElementById("totalFollowers").textContent =
    formatNumber(totalFollowers);

  // Count active profiles
  const activeProfiles = profiles.filter((profile) => profile.isActive).length;
  document.getElementById("activeProfiles").textContent = activeProfiles;
}

function editSocialProfile(id) {
  const profiles = JSON.parse(
    localStorage.getItem(STORAGE_KEYS.SOCIAL_PROFILES) || "[]"
  );
  const profile = profiles.find((p) => p.id === id);
  if (!profile) return;

  document.getElementById("socialPlatform").value = profile.platform;
  document.getElementById("socialUsername").value = profile.username;
  document.getElementById("socialUrl").value = profile.url;
  document.getElementById("socialFollowers").value = profile.followers;
  document.getElementById("socialBio").value = profile.bio || "";
  document.getElementById("socialActive").checked = profile.isActive;

  document.getElementById("social-modal").dataset.editId = id;
  showModal("social-modal");
}

function toggleProfileStatus(id) {
  const profiles = JSON.parse(
    localStorage.getItem(STORAGE_KEYS.SOCIAL_PROFILES) || "[]"
  );
  const index = profiles.findIndex((p) => p.id === id);

  if (index !== -1) {
    profiles[index].isActive = !profiles[index].isActive;
    profiles[index].lastUpdated = new Date().toISOString();
    localStorage.setItem(
      STORAGE_KEYS.SOCIAL_PROFILES,
      JSON.stringify(profiles)
    );

    renderSocialProfiles();
    updateSocialAnalytics();
    showNotification(
      `Profile ${profiles[index].isActive ? "activated" : "deactivated"}`,
      "success"
    );
  }
}

function deleteSocialProfile(id) {
  if (!confirm("Are you sure you want to delete this social profile?")) return;

  const profiles = JSON.parse(
    localStorage.getItem(STORAGE_KEYS.SOCIAL_PROFILES) || "[]"
  );
  const updatedProfiles = profiles.filter((profile) => profile.id !== id);
  localStorage.setItem(
    STORAGE_KEYS.SOCIAL_PROFILES,
    JSON.stringify(updatedProfiles)
  );

  renderSocialProfiles();
  updateSocialAnalytics();
  showNotification("Social profile deleted successfully", "success");
}

function updateProfileFields() {
  const platform = document.getElementById("socialPlatform").value;
  const urlInput = document.getElementById("socialUrl");
  const usernameInput = document.getElementById("socialUsername");

  // Update placeholder based on platform
  switch (platform) {
    case "instagram":
      urlInput.placeholder = "https://instagram.com/username";
      usernameInput.placeholder = "@username";
      break;
    case "twitter":
      urlInput.placeholder = "https://twitter.com/username";
      usernameInput.placeholder = "@handle";
      break;
    case "linkedin":
      urlInput.placeholder = "https://linkedin.com/in/username";
      usernameInput.placeholder = "Full Name";
      break;
    // Add more platforms as needed
  }
}

function formatPlatformName(platform) {
  return platform.charAt(0).toUpperCase() + platform.slice(1);
}

function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}

function resetSocialForm() {
  document.getElementById("socialPlatform").value = "instagram";
  document.getElementById("socialUsername").value = "";
  document.getElementById("socialUrl").value = "";
  document.getElementById("socialFollowers").value = "";
  document.getElementById("socialBio").value = "";
  document.getElementById("socialActive").checked = true;
  delete document.getElementById("social-modal").dataset.editId;
}

// Materials Management Functions
let currentSubjectId = null;
let currentView = "grid";

function showMaterials(subjectId) {
  currentSubjectId = subjectId;
  const subjects = getSubjects();
  const subject = subjects.find((s) => s.id === subjectId);

  if (!subject) return;

  document.getElementById("subjectTitle").textContent = subject.name;
  renderMaterials(subject.materials || []);
  showModal("materials-modal");
  initializeMaterialsView();
  initializeFileUpload();
}

function initializeMaterialsView() {
  const viewButtons = document.querySelectorAll(".view-options .btn-icon");
  viewButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === currentView);
    btn.addEventListener("click", () => {
      viewButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentView = btn.dataset.view;
      const materialsGrid = document.getElementById("materialsList");
      materialsGrid.classList.toggle("list-view", currentView === "list");
    });
  });
}

function initializeFileUpload() {
  const uploadArea = document.querySelector(".upload-area");
  const fileInput = document.getElementById("materialFile");

  // Drag and drop functionality
  uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadArea.classList.add("drag-over");
  });

  uploadArea.addEventListener("dragleave", () => {
    uploadArea.classList.remove("drag-over");
  });

  uploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadArea.classList.remove("drag-over");
    handleFiles(e.dataTransfer.files);
  });

  fileInput.addEventListener("change", (e) => {
    handleFiles(e.target.files);
  });
}

function handleFiles(files) {
  const allowedTypes = getSelectedFileTypes();
  const validFiles = Array.from(files).filter((file) => {
    const fileType = getFileType(file);
    return allowedTypes.includes(fileType);
  });

  if (validFiles.length === 0) {
    showNotification("No valid files selected", "error");
    return;
  }

  validFiles.forEach((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      addMaterial({
        id: Date.now(),
        name: file.name,
        type: getFileType(file),
        size: file.size,
        data: e.target.result,
        dateAdded: new Date().toISOString(),
      });
    };
    reader.readAsDataURL(file);
  });
}

function addMaterial(material) {
  const subjects = getSubjects();
  const subjectIndex = subjects.findIndex((s) => s.id === currentSubjectId);

  if (subjectIndex === -1) return;

  if (!subjects[subjectIndex].materials) {
    subjects[subjectIndex].materials = [];
  }

  subjects[subjectIndex].materials.push(material);
  localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects));

  renderMaterials(subjects[subjectIndex].materials);
  showNotification("Material added successfully", "success");
}

function renderMaterials(materials) {
  const container = document.getElementById("materialsList");
  if (!container) return;

  if (!materials || materials.length === 0) {
    container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <p>No materials added yet</p>
            </div>
        `;
    return;
  }

  container.innerHTML = materials
    .map(
      (material) => `
        <div class="material-card" data-id="${material.id}">
            <div class="material-icon ${material.type}">
                <i class="fas ${getFileIcon(material.type)}"></i>
            </div>
            <div class="material-info">
                <h4>${material.name}</h4>
                <div class="material-meta">
                    <span>${formatFileSize(material.size)}</span>
                    <span>${formatDate(material.dateAdded)}</span>
                </div>
            </div>
            <div class="material-actions">
                <button class="btn-icon" onclick="viewMaterial(${
                  material.id
                })" title="View">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-icon" onclick="downloadMaterial(${
                  material.id
                })" title="Download">
                    <i class="fas fa-download"></i>
                </button>
                <button class="btn-icon btn-danger" onclick="deleteMaterial(${
                  material.id
                })" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `
    )
    .join("");

  container.classList.toggle("list-view", currentView === "list");
}

function searchMaterials(query) {
  const subjects = getSubjects();
  const subject = subjects.find((s) => s.id === currentSubjectId);

  if (!subject || !subject.materials) return;

  const filteredMaterials = subject.materials.filter((material) =>
    material.name.toLowerCase().includes(query.toLowerCase())
  );

  renderMaterials(filteredMaterials);
}

function getSelectedFileTypes() {
  return Array.from(
    document.querySelectorAll(".filter-options input:checked")
  ).map((input) => input.value);
}

function getFileType(file) {
  if (file.type.includes("pdf")) return "pdf";
  if (file.type.includes("image")) return "image";
  return "document";
}

function getFileIcon(type) {
  const icons = {
    pdf: "fa-file-pdf",
    image: "fa-file-image",
    document: "fa-file-alt",
  };
  return icons[type] || "fa-file";
}

function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function viewMaterial(materialId) {
  const material = getMaterialById(materialId);
  if (!material) return;

  // Handle different file types
  if (material.type === "image") {
    window.open(material.data, "_blank");
  } else {
    // For PDFs and other documents
    const viewer = window.open("", "_blank");
    viewer.document.write(`
            <iframe src="${material.data}" style="width:100%;height:100vh;border:none;"></iframe>
        `);
  }
}

function downloadMaterial(materialId) {
  const material = getMaterialById(materialId);
  if (!material) return;

  const link = document.createElement("a");
  link.href = material.data;
  link.download = material.name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function deleteMaterial(materialId) {
  if (!confirm("Are you sure you want to delete this material?")) return;

  const subjects = getSubjects();
  const subjectIndex = subjects.findIndex((s) => s.id === currentSubjectId);

  if (subjectIndex === -1) return;

  subjects[subjectIndex].materials = subjects[subjectIndex].materials.filter(
    (m) => m.id !== materialId
  );

  localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects));
  renderMaterials(subjects[subjectIndex].materials);
  showNotification("Material deleted successfully", "success");
}

function getMaterialById(materialId) {
  const subjects = getSubjects();
  const subject = subjects.find((s) => s.id === currentSubjectId);
  return subject?.materials?.find((m) => m.id === materialId);
}

// File Organization Features
function createFolder(subjectId) {
  const folderName = prompt("Enter folder name:");
  if (!folderName) return;

  const subjects = getSubjects();
  const subjectIndex = subjects.findIndex((s) => s.id === subjectId);

  if (subjectIndex === -1) return;

  if (!subjects[subjectIndex].folders) {
    subjects[subjectIndex].folders = [];
  }

  const folder = {
    id: Date.now(),
    name: folderName,
    materials: [],
    dateCreated: new Date().toISOString(),
  };

  subjects[subjectIndex].folders.push(folder);
  localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects));
  renderFolders();
  showNotification("Folder created successfully", "success");
}

function renderFolders() {
  const subjects = getSubjects();
  const subject = subjects.find((s) => s.id === currentSubjectId);
  const container = document.querySelector(".folders-list");

  if (!container || !subject?.folders) return;

  container.innerHTML = subject.folders
    .map(
      (folder) => `
        <div class="folder-item" data-id="${folder.id}" onclick="openFolder(${
        folder.id
      })">
            <div class="folder-icon">
                <i class="fas fa-folder${
                  currentFolderId === folder.id ? "-open" : ""
                }"></i>
            </div>
            <div class="folder-info">
                <span class="folder-name">${folder.name}</span>
                <span class="material-count">${
                  folder.materials.length
                } items</span>
            </div>
            <div class="folder-actions">
                <button class="btn-icon" onclick="renameFolder(${
                  folder.id
                }, event)" title="Rename">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon btn-danger" onclick="deleteFolder(${
                  folder.id
                }, event)" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `
    )
    .join("");
}

// File Sharing Features
function shareMaterial(materialId) {
  const material = getMaterialById(materialId);
  if (!material) return;

  const shareModal = document.createElement("div");
  shareModal.className = "share-modal modal";
  shareModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Share Material</h3>
                <button class="close-btn" onclick="this.closest('.share-modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="share-options">
                    <button class="share-btn" onclick="copyShareLink(${materialId})">
                        <i class="fas fa-link"></i>
                        Copy Link
                    </button>
                    <button class="share-btn" onclick="shareViaEmail(${materialId})">
                        <i class="fas fa-envelope"></i>
                        Share via Email
                    </button>
                    <button class="share-btn" onclick="generateQRCode(${materialId})">
                        <i class="fas fa-qrcode"></i>
                        Generate QR Code
                    </button>
                </div>
                <div class="share-settings">
                    <label class="checkbox-label">
                        <input type="checkbox" id="shareExpiry">
                        Set expiry date
                    </label>
                    <input type="date" id="expiryDate" class="form-input" disabled>
                    <label class="checkbox-label">
                        <input type="checkbox" id="sharePassword">
                        Protect with password
                    </label>
                    <input type="password" id="sharePasswordInput" class="form-input" disabled>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="generateShareLink(${materialId})">
                    Generate Share Link
                </button>
            </div>
        </div>
    `;
  document.body.appendChild(shareModal);
}

function generateShareLink(materialId) {
  const material = getMaterialById(materialId);
  if (!material) return;

  const shareSettings = {
    expiry: document.getElementById("shareExpiry").checked
      ? document.getElementById("expiryDate").value
      : null,
    password: document.getElementById("sharePassword").checked
      ? document.getElementById("sharePasswordInput").value
      : null,
  };

  const shareId = btoa(
    JSON.stringify({
      materialId,
      subjectId: currentSubjectId,
      settings: shareSettings,
    })
  );

  const shareLink = `${window.location.origin}/share/${shareId}`;

  // Store share settings
  const shares = JSON.parse(localStorage.getItem("material_shares") || "{}");
  shares[shareId] = {
    materialId,
    subjectId: currentSubjectId,
    settings: shareSettings,
    created: new Date().toISOString(),
  };
  localStorage.setItem("material_shares", JSON.stringify(shares));

  // Show success message with copy button
  showNotification(
    `
        <div class="share-link-container">
            <input type="text" value="${shareLink}" readonly>
            <button onclick="navigator.clipboard.writeText('${shareLink}')">
                <i class="fas fa-copy"></i>
            </button>
        </div>
    `,
    "success",
    5000
  );
}

// Interactive Features
function initializeDragAndDrop() {
  const materialCards = document.querySelectorAll(".material-card");
  const folders = document.querySelectorAll(".folder-item");

  materialCards.forEach((card) => {
    card.setAttribute("draggable", true);
    card.addEventListener("dragstart", handleDragStart);
    card.addEventListener("dragend", handleDragEnd);
  });

  folders.forEach((folder) => {
    folder.addEventListener("dragover", handleDragOver);
    folder.addEventListener("drop", handleDrop);
  });
}

function handleDragStart(e) {
  e.target.classList.add("dragging");
  e.dataTransfer.setData("text/plain", e.target.dataset.id);
}

function handleDragEnd(e) {
  e.target.classList.remove("dragging");
}

function handleDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add("drag-over");
}

function handleDrop(e) {
  e.preventDefault();
  const folderId = e.currentTarget.dataset.id;
  const materialId = e.dataTransfer.getData("text/plain");
  moveMaterialToFolder(materialId, folderId);
  e.currentTarget.classList.remove("drag-over");
}

function moveMaterialToFolder(materialId, folderId) {
  const subjects = getSubjects();
  const subject = subjects.find((s) => s.id === currentSubjectId);
  if (!subject) return;

  const material = getMaterialById(materialId);
  if (!material) return;

  // Remove from current location
  if (currentFolderId) {
    const currentFolder = subject.folders.find((f) => f.id === currentFolderId);
    currentFolder.materials = currentFolder.materials.filter(
      (m) => m.id !== materialId
    );
  } else {
    subject.materials = subject.materials.filter((m) => m.id !== materialId);
  }

  // Add to new folder
  const targetFolder = subject.folders.find((f) => f.id === parseInt(folderId));
  if (targetFolder) {
    targetFolder.materials.push(material);
    showNotification("Material moved successfully", "success");
  }

  localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects));
  renderMaterials(getCurrentMaterials());
  renderFolders();
}

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
  // Load saved theme
  const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
  if (savedTheme === "dark") {
    document.body.classList.add("dark-theme");
  }
  updateThemeIcon();

  // Load saved profile
  const profile = JSON.parse(
    localStorage.getItem(STORAGE_KEYS.PROFILE) || "{}"
  );
  if (profile.name) {
    document.getElementById("userName").textContent = profile.name;
    document.getElementById("userEmail").textContent = profile.email;
    document.getElementById("userAvatar").src = profile.avatar;
  }

  // Set up navigation
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      loadPage(link.dataset.page);
    });
  });

  // Load initial page
  loadPage("planner");

  // Start clock
  setInterval(() => {
    document.getElementById("digitalClock").textContent =
      new Date().toLocaleTimeString();
  }, 1000);

  // Add search functionality
  const searchInput = document.getElementById("searchExpense");
  if (searchInput) {
    searchInput.addEventListener("input", (e) =>
      searchExpenses(e.target.value)
    );
  }

  // Add month filter functionality
  const monthFilter = document.getElementById("monthFilter");
  if (monthFilter) {
    monthFilter.addEventListener("change", () => {
      const selectedMonth = monthFilter.value;
      // Implementation for month filtering
      // This will be added in the next update
    });
  }

  // Load profile
  loadProfile();

  // Start alarm checker
  setInterval(checkAlarms, 1000);

  // Initialize alarms list
  renderAlarms();

  // Initialize resources
  initializeResources();

  // Initialize notes
  initializeNotes();

  // Initialize social media
  initializeSocialMedia();
});
