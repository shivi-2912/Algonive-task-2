class TaskFlowApp {
  constructor() {
    this.currentUser = null
    this.tasks = []
    this.currentFilter = "all"
    this.editingTaskId = null

    this.init()
  }

  init() {
    console.log("🚀 TaskFlow initializing...")

    this.checkAuthState()

    this.setupEventListeners()

    if (this.currentUser) {
      this.loadUserTasks()
      this.renderTasks()
      this.updateStats()
    }
  }

  checkAuthState() {
    const savedUser = localStorage.getItem("taskflow_user")
    if (savedUser) {
      try {
        this.currentUser = JSON.parse(savedUser)
        console.log("👤 User found:", this.currentUser.name)
        this.showApp()
        this.loadUserTasks()
        this.updateStats()
      } catch (error) {
        console.error("Error parsing saved user:", error)
        this.showAuth()
      }
    } else {
      this.showAuth()
    }
  }

  async handleLogin(e) {
    e.preventDefault()

    const email = document.getElementById("loginEmail").value.trim()
    const password = document.getElementById("loginPassword").value

    if (!email || !password) {
      this.showNotification("Please fill in all fields", "error")
      return
    }

    this.showLoading()

    await this.delay(1000)

    const users = JSON.parse(localStorage.getItem("taskflow_users") || "[]")
    const user = users.find((u) => u.email === email && u.password === password)

    this.hideLoading()

    if (user) {
      this.currentUser = user
      localStorage.setItem("taskflow_user", JSON.stringify(user))
      this.showNotification(`Welcome back, ${user.firstName}!`, "success")
      this.showApp()
      this.loadUserTasks()
      this.updateStats()
    } else {
      this.showNotification("Invalid email or password", "error")
    }
  }

  async handleSignup(e) {
    e.preventDefault()

    const firstName = document.getElementById("firstName").value.trim()
    const lastName = document.getElementById("lastName").value.trim()
    const email = document.getElementById("signupEmail").value.trim()
    const password = document.getElementById("signupPassword").value
    const confirmPassword = document.getElementById("confirmPassword").value
    const agreeTerms = document.getElementById("agreeTerms").checked

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      this.showNotification("Please fill in all fields", "error")
      return
    }

    if (!agreeTerms) {
      this.showNotification("Please agree to the Terms of Service", "error")
      return
    }

    if (password !== confirmPassword) {
      this.showNotification("Passwords do not match", "error")
      return
    }

    if (password.length < 6) {
      this.showNotification("Password must be at least 6 characters", "error")
      return
    }

    this.showLoading()

    await this.delay(1500)

    const users = JSON.parse(localStorage.getItem("taskflow_users") || "[]")

    if (users.find((u) => u.email === email)) {
      this.hideLoading()
      this.showNotification("Email already exists", "error")
      return
    }

    const newUser = {
      id: Date.now().toString(),
      name: `${firstName} ${lastName}`,
      firstName,
      lastName,
      email,
      password, 
      createdAt: new Date().toISOString(),
    }

    users.push(newUser)
    localStorage.setItem("taskflow_users", JSON.stringify(users))

    this.currentUser = newUser
    localStorage.setItem("taskflow_user", JSON.stringify(newUser))

    this.hideLoading()
    this.showNotification(`Welcome to TaskFlow, ${firstName}!`, "success")
    this.showApp()
    this.updateStats()
  }

  logout() {
    localStorage.removeItem("taskflow_user")
    this.currentUser = null
    this.tasks = []
    this.showAuth()
    this.showNotification("Logged out successfully", "success")
  }

  showAuth() {
    document.getElementById("authContainer").classList.remove("hidden")
    document.getElementById("appContainer").classList.add("hidden")
  }

  showApp() {
    document.getElementById("authContainer").classList.add("hidden")
    document.getElementById("appContainer").classList.remove("hidden")
    this.updateUserInterface()
  }

  updateUserInterface() {
    if (this.currentUser) {
      document.getElementById("userGreeting").textContent = `Hello, ${this.currentUser.firstName}`

      const initials = this.currentUser.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
      document.getElementById("userInitials").textContent = initials
    }
  }

  async handleAddTask(e) {
    e.preventDefault()

    const title = document.getElementById("taskTitle").value.trim()
    const description = document.getElementById("taskDescription").value.trim()
    const priority = document.getElementById("taskPriority").value
    const dueDate = document.getElementById("taskDueDate").value
    const category = document.getElementById("taskCategory").value

    if (!title) {
      this.showNotification("Please enter a task title", "error")
      return
    }

    const taskData = {
      title,
      description,
      priority,
      dueDate,
      category,
    }

    this.showLoading()
    await this.delay(500) 

    if (this.editingTaskId) {
      this.updateTask(this.editingTaskId, taskData)
      this.showNotification("Task updated successfully", "success")
    } else {
      this.addTask(taskData)
      this.showNotification("Task added successfully", "success")
    }

    this.hideLoading()
    this.closeAddTaskModal()
    this.renderTasks()
    this.updateStats()
  }

  addTask(taskData) {
    const task = {
      id: Date.now().toString(),
      userId: this.currentUser.id,
      ...taskData,
      completed: false,
      createdAt: new Date().toISOString(),
      completedAt: null,
    }

    this.tasks.push(task)
    this.saveUserTasks()

    console.log("✅ Task added:", task.title)
  }

  updateTask(taskId, updates) {
    const taskIndex = this.tasks.findIndex((task) => task.id === taskId)
    if (taskIndex !== -1) {
      this.tasks[taskIndex] = { ...this.tasks[taskIndex], ...updates }
      this.saveUserTasks()
      console.log("📝 Task updated:", this.tasks[taskIndex].title)
    }
  }

  deleteTask(taskId) {
    if (confirm("Are you sure you want to delete this task?")) {
      const taskToDelete = this.tasks.find((task) => task.id === taskId)
      this.tasks = this.tasks.filter((task) => task.id !== taskId)
      this.saveUserTasks()
      this.renderTasks()
      this.updateStats()
      this.showNotification("Task deleted successfully", "success")
      console.log("🗑️ Task deleted:", taskToDelete?.title)
    }
  }

  toggleTaskComplete(taskId) {
    const task = this.tasks.find((task) => task.id === taskId)
    if (task) {
      task.completed = !task.completed
      task.completedAt = task.completed ? new Date().toISOString() : null
      this.saveUserTasks()
      this.renderTasks()
      this.updateStats()

      const message = task.completed ? "Task completed! 🎉" : "Task marked as incomplete"
      this.showNotification(message, task.completed ? "success" : "info")

      console.log(`${task.completed ? "✅" : "⏳"} Task ${task.completed ? "completed" : "reopened"}:`, task.title)
    }
  }

  editTask(taskId) {
    const task = this.tasks.find((task) => task.id === taskId)
    if (task) {
      this.editingTaskId = taskId

      document.getElementById("taskTitle").value = task.title
      document.getElementById("taskDescription").value = task.description || ""
      document.getElementById("taskPriority").value = task.priority
      document.getElementById("taskDueDate").value = task.dueDate || ""
      document.getElementById("taskCategory").value = task.category

      document.getElementById("modalTitle").textContent = "Edit Task"
      document.getElementById("submitTaskBtn").textContent = "Update Task"
      this.showAddTaskModal()
    }
  }

  setFilter(filter) {
    this.currentFilter = filter

    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.classList.remove("active")
    })
    document.querySelector(`[data-filter="${filter}"]`).classList.add("active")

    this.renderTasks()
  }

  getFilteredTasks() {
    let filtered = this.tasks

    switch (this.currentFilter) {
      case "completed":
        filtered = filtered.filter((task) => task.completed)
        break
      case "pending":
        filtered = filtered.filter((task) => !task.completed)
        break
    }

    return filtered
  }

  renderTasks() {
    const taskList = document.getElementById("taskList")
    const emptyState = document.getElementById("emptyState")
    const filteredTasks = this.getFilteredTasks()

    if (filteredTasks.length === 0) {
      taskList.innerHTML = ""
      emptyState.classList.remove("hidden")
      return
    }

    emptyState.classList.add("hidden")

    const sortedTasks = filteredTasks.sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1
      }

      const priorityOrder = { high: 3, medium: 2, low: 1 }
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      }

      return new Date(b.createdAt) - new Date(a.createdAt)
    })

    taskList.innerHTML = sortedTasks.map((task) => this.renderTaskCard(task)).join("")
  }

  renderTaskCard(task) {
    const formattedDate = task.dueDate ? this.formatDate(task.dueDate) : ""

    return `
      <div class="task-item ${task.completed ? "completed" : ""}" data-task-id="${task.id}">
        <div class="task-header">
          <h3 class="task-title">${this.escapeHtml(task.title)}</h3>
          <span class="priority-badge ${task.priority}">${task.priority}</span>
        </div>
        
        ${task.description ? `<p class="task-description">${this.escapeHtml(task.description)}</p>` : ""}
        
        <div class="task-meta">
          <div class="task-info">
            <span class="category">📁 ${task.category}</span>
            ${task.dueDate ? `<span class="due-date">📅 ${formattedDate}</span>` : ""}
          </div>
          <span class="created-date">Created: ${this.formatDate(task.createdAt, true)}</span>
        </div>
        
        <div class="task-actions">
          <button class="task-btn ${task.completed ? "incomplete-btn" : "complete-btn"}" 
                  onclick="window.app.toggleTaskComplete('${task.id}')">
            ${task.completed ? "Mark Incomplete" : "Mark Complete"}
          </button>
          <button class="task-btn edit-btn" onclick="window.app.editTask('${task.id}')">
            Edit
          </button>
          <button class="task-btn delete-btn" onclick="window.app.deleteTask('${task.id}')">
            Delete
          </button>
        </div>
      </div>
    `
  }

  updateStats() {
    const total = this.tasks.length
    const completed = this.tasks.filter((task) => task.completed).length
    const pending = this.tasks.filter((task) => !task.completed).length

    document.getElementById("totalTasks").textContent = total
    document.getElementById("completedTasks").textContent = completed
    document.getElementById("pendingTasks").textContent = pending
  }

  showAddTaskModal() {
    document.getElementById("addTaskModal").classList.remove("hidden")
    document.getElementById("taskTitle").focus()
  }

  closeAddTaskModal() {
    document.getElementById("addTaskModal").classList.add("hidden")
    this.resetTaskForm()
  }

  resetTaskForm() {
    document.getElementById("addTaskForm").reset()
    document.getElementById("modalTitle").textContent = "Add New Task"
    document.getElementById("submitTaskBtn").textContent = "Add Task"
    this.editingTaskId = null
  }

  saveUserTasks() {
    const userTasks = {
      userId: this.currentUser.id,
      tasks: this.tasks,
      lastUpdated: new Date().toISOString(),
    }
    localStorage.setItem(`taskflow_tasks_${this.currentUser.id}`, JSON.stringify(userTasks))
  }

  loadUserTasks() {
    const savedTasks = localStorage.getItem(`taskflow_tasks_${this.currentUser.id}`)
    if (savedTasks) {
      try {
        const userTasks = JSON.parse(savedTasks)
        this.tasks = userTasks.tasks || []
        console.log("📂 Loaded", this.tasks.length, "tasks for user:", this.currentUser.name)
      } catch (error) {
        console.error("Error loading tasks:", error)
        this.tasks = []
      }
    }
  }

  showNotification(message, type = "info", duration = 5000) {
    const container = document.getElementById("toastContainer")
    const notification = document.createElement("div")
    notification.className = `toast ${type}`
    notification.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span>${message}</span>
        <button onclick="this.parentElement.parentElement.remove()" 
                style="background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #a0aec0; margin-left: 1rem;">×</button>
      </div>
    `

    container.appendChild(notification)

    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove()
      }
    }, duration)
  }

  formatDate(dateString, includeTime = false) {
    if (!dateString) return ""

    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const dateStr = date.toDateString()
    const todayStr = today.toDateString()
    const tomorrowStr = tomorrow.toDateString()

    if (dateStr === todayStr) {
      return includeTime ? `Today ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Today"
    } else if (dateStr === tomorrowStr) {
      return includeTime
        ? `Tomorrow ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
        : "Tomorrow"
    } else {
      const formatted = date.toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      })
      return includeTime
        ? `${formatted} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
        : formatted
    }
  }

  escapeHtml(text) {
    const div = document.createElement("div")
    div.textContent = text
    return div.innerHTML
  }

  showLoading() {
    document.getElementById("loadingOverlay").classList.remove("hidden")
  }

  hideLoading() {
    document.getElementById("loadingOverlay").classList.add("hidden")
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  setupEventListeners() {
    const loginForm = document.getElementById("loginForm")
    const signupForm = document.getElementById("signupForm")

    if (loginForm) {
      loginForm.addEventListener("submit", (e) => this.handleLogin(e))
    }

    if (signupForm) {
      signupForm.addEventListener("submit", (e) => this.handleSignup(e))
    }

    const addTaskForm = document.getElementById("addTaskForm")
    if (addTaskForm) {
      addTaskForm.addEventListener("submit", (e) => this.handleAddTask(e))
    }

    const filterButtons = document.querySelectorAll(".filter-btn")
    filterButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const filter = e.target.dataset.filter
        this.setFilter(filter)
      })
    })

    const userAvatar = document.getElementById("userAvatar")
    if (userAvatar) {
      userAvatar.addEventListener("click", () => {
        const dropdown = document.getElementById("userDropdown")
        dropdown.classList.toggle("hidden")
      })
    }

    document.addEventListener("click", (e) => {
      const userMenu = document.querySelector(".user-menu")
      const dropdown = document.getElementById("userDropdown")

      if (userMenu && !userMenu.contains(e.target) && dropdown) {
        dropdown.classList.add("hidden")
      }
    })

    const modal = document.getElementById("addTaskModal")
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          this.closeAddTaskModal()
        }
      })
    }
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault()
        if (this.currentUser) {
          this.showAddTaskModal()
        }
      }

      if (e.key === "Escape") {
        const modal = document.getElementById("addTaskModal")
        if (modal && !modal.classList.contains("hidden")) {
          this.closeAddTaskModal()
        }
      }
    })
  }
}


function showSignup() {
  document.getElementById("loginSection").classList.add("hidden")
  document.getElementById("signupSection").classList.remove("hidden")
}

function showLogin() {
  document.getElementById("signupSection").classList.add("hidden")
  document.getElementById("loginSection").classList.remove("hidden")
}

function showAddTaskModal() {
  if (window.app) {
    window.app.showAddTaskModal()
  }
}

function closeAddTaskModal() {
  if (window.app) {
    window.app.closeAddTaskModal()
  }
}

function logout() {
  if (window.app) {
    window.app.logout()
  }
}

function togglePassword(inputId) {
  const input = document.getElementById(inputId)
  const button = input.nextElementSibling

  if (input.type === "password") {
    input.type = "text"
    button.textContent = "🙈"
  } else {
    input.type = "password"
    button.textContent = "👁️"
  }
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("🎯 DOM loaded, initializing TaskFlow...")
  window.app = new TaskFlowApp()
})
if (typeof module !== "undefined" && module.exports) {
  module.exports = TaskFlowApp
}
