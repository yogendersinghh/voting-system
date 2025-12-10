// State
let isLoggedIn = false;
let options = [];
let questions = [];

// DOM Elements
const loginModal = document.getElementById('loginModal');
const adminPanel = document.getElementById('adminPanel');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');

// Check if already logged in
document.addEventListener('DOMContentLoaded', () => {
  const adminToken = sessionStorage.getItem('adminLoggedIn');
  if (adminToken === 'true') {
    isLoggedIn = true;
    showAdminPanel();
  } else {
    loginModal.classList.add('active');
  }
});

// Login Handler
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  
  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      sessionStorage.setItem('adminLoggedIn', 'true');
      isLoggedIn = true;
      loginModal.classList.remove('active');
      showAdminPanel();
    } else {
      showLoginError(data.error || 'Login failed');
    }
  } catch (error) {
    showLoginError('Connection error. Please try again.');
  }
});

// Logout Handler
logoutBtn.addEventListener('click', () => {
  sessionStorage.removeItem('adminLoggedIn');
  isLoggedIn = false;
  adminPanel.style.display = 'none';
  loginModal.classList.add('active');
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
});

function showLoginError(message) {
  document.getElementById('loginErrorText').textContent = message;
  loginError.style.display = 'flex';
  setTimeout(() => {
    loginError.style.display = 'none';
  }, 3000);
}

function showAdminPanel() {
  adminPanel.style.display = 'block';
  loadPolls();
}

// Tab Navigation
document.querySelectorAll('.sidebar-menu a').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const tab = e.currentTarget.dataset.tab;
    
    // Update active states
    document.querySelectorAll('.sidebar-menu a').forEach(l => l.classList.remove('active'));
    e.currentTarget.classList.add('active');
    
    // Show/hide tabs
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.getElementById(`${tab}Tab`).style.display = 'block';
    
    if (tab === 'manage') {
      loadPolls();
    }
  });
});

// Options Management
const addOptionBtn = document.getElementById('addOptionBtn');
const newOptionInput = document.getElementById('newOption');
const optionsContainer = document.getElementById('optionsContainer');

addOptionBtn.addEventListener('click', addOptions);
newOptionInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    addOptions();
  }
});

// Handle multiple options with comma separation
function addOptions() {
  const input = newOptionInput.value;
  
  // Split by comma and process each option
  const newOptions = input
    .split(',')
    .map(opt => opt.trim())  // Remove extra spaces
    .filter(opt => opt.length > 0)  // Remove empty strings
    .filter(opt => !options.includes(opt));  // Remove duplicates
  
  if (newOptions.length > 0) {
    options.push(...newOptions);
    renderOptions();
    newOptionInput.value = '';
    newOptionInput.focus();
    
    // Show feedback if multiple options were added
    if (newOptions.length > 1) {
      showToast(`Added ${newOptions.length} options`);
    }
  }
}

// Toast notification helper
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'alert alert-success';
  toast.style.cssText = 'position: fixed; bottom: 24px; right: 24px; z-index: 9999; animation: slideIn 0.3s ease;';
  toast.innerHTML = `
    <svg class="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

function removeOption(index) {
  options.splice(index, 1);
  renderOptions();
}

function renderOptions() {
  optionsContainer.innerHTML = options.map((opt, index) => `
    <div class="option-tag">
      <span>${escapeHtml(opt)}</span>
      <button type="button" class="option-remove" onclick="removeOption(${index})">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  `).join('');
}

// Questions Management
const addQuestionBtn = document.getElementById('addQuestionBtn');
const newQuestionInput = document.getElementById('newQuestion');
const questionsList = document.getElementById('questionsList');

addQuestionBtn.addEventListener('click', addQuestions);
newQuestionInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    addQuestions();
  }
});

// Handle multiple questions (one per line or comma-separated for short questions)
function addQuestions() {
  const input = newQuestionInput.value;
  
  // Split by newline first, then by comma if no newlines
  let newQuestions;
  if (input.includes('\n')) {
    newQuestions = input.split('\n');
  } else {
    // For single line, don't split by comma (questions might contain commas)
    newQuestions = [input];
  }
  
  newQuestions = newQuestions
    .map(q => q.trim())
    .filter(q => q.length > 0);
  
  if (newQuestions.length > 0) {
    questions.push(...newQuestions);
    renderQuestions();
    newQuestionInput.value = '';
    newQuestionInput.focus();
    
    if (newQuestions.length > 1) {
      showToast(`Added ${newQuestions.length} questions`);
    }
  }
}

function removeQuestion(index) {
  questions.splice(index, 1);
  renderQuestions();
}

function renderQuestions() {
  questionsList.innerHTML = questions.map((q, index) => `
    <div class="question-item">
      <div class="question-number">${index + 1}</div>
      <div class="question-text">${escapeHtml(q)}</div>
      <button type="button" class="question-remove" onclick="removeQuestion(${index})">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          <line x1="10" y1="11" x2="10" y2="17"/>
          <line x1="14" y1="11" x2="14" y2="17"/>
        </svg>
      </button>
    </div>
  `).join('');
}

// Create Poll
const createPollForm = document.getElementById('createPollForm');
const createSuccess = document.getElementById('createSuccess');
const createError = document.getElementById('createError');

createPollForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const title = document.getElementById('pollTitle').value.trim();
  const description = document.getElementById('pollDescription').value.trim();
  
  if (options.length < 2) {
    showCreateError('Please add at least 2 voting options');
    return;
  }
  
  if (questions.length < 1) {
    showCreateError('Please add at least 1 question');
    return;
  }
  
  try {
    const response = await fetch('/api/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, options, questions })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      const baseUrl = window.location.origin;
      document.getElementById('voteUrl').value = baseUrl + data.voteUrl;
      document.getElementById('resultsUrl').value = baseUrl + data.resultsUrl;
      createSuccess.style.display = 'block';
      createError.style.display = 'none';
      
      // Reset form
      document.getElementById('pollTitle').value = '';
      document.getElementById('pollDescription').value = '';
      options = [];
      questions = [];
      renderOptions();
      renderQuestions();
      
      // Scroll to success message
      createSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      showCreateError(data.error || 'Failed to create poll');
    }
  } catch (error) {
    showCreateError('Connection error. Please try again.');
  }
});

function showCreateError(message) {
  document.getElementById('createErrorText').textContent = message;
  createError.style.display = 'flex';
  createSuccess.style.display = 'none';
}

// Copy URL functionality
document.querySelectorAll('.copy-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = btn.dataset.target;
    const input = document.getElementById(targetId);
    input.select();
    document.execCommand('copy');
    
    const originalHTML = btn.innerHTML;
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      Copied!
    `;
    btn.classList.add('copied');
    
    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.classList.remove('copied');
    }, 2000);
  });
});

// Load Polls
async function loadPolls() {
  const pollsList = document.getElementById('pollsList');
  const pollsLoading = document.getElementById('pollsLoading');
  const emptyPolls = document.getElementById('emptyPolls');
  
  pollsLoading.style.display = 'block';
  pollsList.innerHTML = '';
  emptyPolls.style.display = 'none';
  
  try {
    const response = await fetch('/api/quizzes');
    const polls = await response.json();
    
    pollsLoading.style.display = 'none';
    
    if (polls.length === 0) {
      emptyPolls.style.display = 'block';
      return;
    }
    
    const baseUrl = window.location.origin;
    
    pollsList.innerHTML = `
      <table class="quiz-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Voters</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${polls.map(poll => `
            <tr>
              <td>
                <strong>${escapeHtml(poll.title)}</strong>
                <br>
                <small style="color: var(--text-muted);">${poll.options.length} options • ${escapeHtml(poll.description || 'No description')}</small>
              </td>
              <td>
                <span style="font-family: var(--font-mono); font-weight: 600; color: var(--accent-secondary);">${poll.total_voters}</span>
              </td>
              <td>
                <span class="status-badge ${poll.is_active ? 'status-active' : 'status-inactive'}">
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
                    <circle cx="4" cy="4" r="4"/>
                  </svg>
                  ${poll.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td style="color: var(--text-muted);">${new Date(poll.created_at).toLocaleDateString()}</td>
              <td>
                <div class="action-buttons">
                  <button class="btn btn-secondary btn-sm btn-icon" onclick="copyUrl('${baseUrl}/vote.html?id=${poll.id}')" title="Copy Vote URL">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                    </svg>
                  </button>
                  <a href="${baseUrl}/results.html?id=${poll.id}" class="btn btn-secondary btn-sm btn-icon" target="_blank" title="View Results">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" y1="20" x2="18" y2="10"/>
                      <line x1="12" y1="20" x2="12" y2="4"/>
                      <line x1="6" y1="20" x2="6" y2="14"/>
                    </svg>
                  </a>
                  <a href="${baseUrl}/leaderboard.html?id=${poll.id}" class="btn btn-secondary btn-sm btn-icon" target="_blank" title="View Leaderboard" style="background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 170, 0, 0.2)); border-color: rgba(255, 215, 0, 0.4);">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffd700" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="8" r="7"/>
                      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
                    </svg>
                  </a>
                  <button class="btn btn-secondary btn-sm btn-icon" onclick="togglePoll('${poll.id}')" title="${poll.is_active ? 'Deactivate' : 'Activate'}">
                    ${poll.is_active ? `
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="6" y="4" width="4" height="16"/>
                        <rect x="14" y="4" width="4" height="16"/>
                      </svg>
                    ` : `
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="5 3 19 12 5 21 5 3"/>
                      </svg>
                    `}
                  </button>
                  <button class="btn btn-danger btn-sm btn-icon" onclick="deletePoll('${poll.id}')" title="Delete">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (error) {
    pollsLoading.style.display = 'none';
    pollsList.innerHTML = `
      <div class="alert alert-error">
        <svg class="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <span>Failed to load polls</span>
      </div>
    `;
  }
}

// Copy URL
function copyUrl(url) {
  navigator.clipboard.writeText(url).then(() => {
    // Show temporary toast
    const toast = document.createElement('div');
    toast.className = 'alert alert-success';
    toast.style.cssText = 'position: fixed; bottom: 24px; right: 24px; z-index: 9999; animation: slideIn 0.3s ease;';
    toast.innerHTML = `
      <svg class="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      <span>URL copied to clipboard!</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  });
}

// Toggle Poll Status
async function togglePoll(id) {
  try {
    const response = await fetch(`/api/quiz/${id}/toggle`, {
      method: 'PATCH'
    });
    
    if (response.ok) {
      loadPolls();
    }
  } catch (error) {
    alert('Failed to toggle poll status');
  }
}

// Delete Poll
async function deletePoll(id) {
  if (!confirm('Are you sure you want to delete this poll? All votes will be lost.')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/quiz/${id}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      loadPolls();
    }
  } catch (error) {
    alert('Failed to delete poll');
  }
}

// Utility: Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
