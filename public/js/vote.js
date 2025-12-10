// State
let quizId = null;
let quizData = null;
let voterSession = null;
let answers = {};
let currentStep = 0;
let totalSteps = 0;
let openDropdown = null;

// DOM Elements
const loadingOverlay = document.getElementById('loadingOverlay');
const errorState = document.getElementById('errorState');
const alreadyVotedState = document.getElementById('alreadyVotedState');
const votingSection = document.getElementById('votingSection');
const successState = document.getElementById('successState');
const voteForm = document.getElementById('voteForm');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const submitBtn = document.getElementById('submitBtn');
const stepProgress = document.getElementById('stepProgress');

// Get quiz ID from URL
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  quizId = urlParams.get('id');
  
  if (!quizId) {
    showError('No poll ID provided');
    return;
  }
  
  // Generate or retrieve voter session
  voterSession = getOrCreateVoterSession();
  
  loadQuiz();
  
  // Keyboard navigation
  document.addEventListener('keydown', handleKeyNavigation);
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (openDropdown && !e.target.closest('.dropdown-wrapper')) {
      closeDropdown(openDropdown);
    }
  });
});

// Keyboard navigation
function handleKeyNavigation(e) {
  if (votingSection.style.display === 'none') return;
  
  // Don't navigate if typing in search
  if (e.target.tagName === 'INPUT') return;
  
  if (e.key === 'ArrowRight') {
    e.preventDefault();
    if (currentStep < totalSteps - 1) {
      navigateToStep(currentStep + 1);
    }
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    if (currentStep > 0) {
      navigateToStep(currentStep - 1);
    }
  }
}

// Generate unique voter session ID
function getOrCreateVoterSession() {
  const key = `voter_session_${quizId}`;
  let session = localStorage.getItem(key);
  
  if (!session) {
    session = 'voter_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem(key, session);
  }
  
  return session;
}

// Check if user already voted
function hasAlreadyVoted() {
  const key = `voted_${quizId}`;
  return localStorage.getItem(key) === 'true';
}

// Mark as voted
function markAsVoted() {
  const key = `voted_${quizId}`;
  localStorage.setItem(key, 'true');
}

// Load Quiz Data
async function loadQuiz() {
  try {
    const response = await fetch(`/api/quiz/${quizId}`);
    
    if (!response.ok) {
      const data = await response.json();
      showError(data.error || 'Poll not found');
      return;
    }
    
    quizData = await response.json();
    
    // Check if quiz is active
    if (!quizData.is_active) {
      showError('This poll has been deactivated');
      return;
    }
    
    // Check if already voted
    if (hasAlreadyVoted()) {
      showAlreadyVoted();
      return;
    }
    
    renderQuiz();
  } catch (error) {
    showError('Failed to load poll. Please try again.');
  }
}

// Show Error State
function showError(message) {
  loadingOverlay.style.display = 'none';
  errorState.style.display = 'block';
  document.getElementById('errorMessage').textContent = message;
}

// Show Already Voted State
function showAlreadyVoted() {
  loadingOverlay.style.display = 'none';
  alreadyVotedState.style.display = 'block';
  document.getElementById('viewResultsLink').href = `/results.html?id=${quizId}`;
}

// Render Quiz with Multi-Step
function renderQuiz() {
  loadingOverlay.style.display = 'none';
  votingSection.style.display = 'block';
  
  // Set header info
  document.getElementById('pollTitle').textContent = quizData.title;
  document.getElementById('pollDescription').textContent = quizData.description || '';
  
  totalSteps = quizData.questions.length;
  currentStep = 0;
  
  // Render step progress
  renderStepProgress();
  
  // Render questions as slides with searchable dropdown
  const wrapper = document.getElementById('questionsWrapper');
  wrapper.innerHTML = quizData.questions.map((question, index) => `
    <div class="question-slide ${index === 0 ? 'active' : ''}" data-step="${index}" id="slide-${index}">
      <div class="card question-card">
        <div class="card-header">
          <div class="question-badge">${index + 1}</div>
          <div class="question-text-wrapper">
            <h3>${escapeHtml(question.question_text)}</h3>
            <p>Select your answer from the dropdown below</p>
          </div>
        </div>
        
        <div class="dropdown-wrapper" data-question-id="${question.id}" data-step="${index}">
          <button type="button" class="dropdown-trigger" onclick="toggleDropdown(this, ${question.id})">
            <span class="placeholder" id="selected-text-${question.id}">Choose an option...</span>
            <svg class="arrow-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          <div class="dropdown-menu" id="dropdown-${question.id}">
            <div class="dropdown-search">
              <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input type="text" placeholder="Search options..." oninput="filterOptions(${question.id}, this.value)">
            </div>
            <div class="dropdown-options" id="options-${question.id}">
              ${quizData.options.map((option, optIndex) => `
                <div class="dropdown-option" data-value="${escapeHtml(option)}" onclick="selectOption(${question.id}, '${escapeHtml(option).replace(/'/g, "\\'")}')">
                  <span class="option-check">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </span>
                  <span class="option-text">${escapeHtml(option)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
  `).join('');
  
  updateNavigation();
}

// Toggle Dropdown
function toggleDropdown(trigger, questionId) {
  const dropdown = document.getElementById(`dropdown-${questionId}`);
  const isOpen = dropdown.classList.contains('open');
  
  // Close any open dropdown first
  if (openDropdown && openDropdown !== dropdown) {
    closeDropdown(openDropdown);
  }
  
  if (isOpen) {
    closeDropdown(dropdown);
  } else {
    openDropdownMenu(dropdown, trigger);
  }
}

function openDropdownMenu(dropdown, trigger) {
  dropdown.classList.add('open');
  trigger.classList.add('active');
  openDropdown = dropdown;
  
  // Focus search input
  const searchInput = dropdown.querySelector('input');
  if (searchInput) {
    setTimeout(() => searchInput.focus(), 100);
  }
}

function closeDropdown(dropdown) {
  dropdown.classList.remove('open');
  const trigger = dropdown.previousElementSibling;
  if (trigger) {
    trigger.classList.remove('active');
  }
  
  // Reset search
  const searchInput = dropdown.querySelector('input');
  if (searchInput) {
    searchInput.value = '';
    const questionId = dropdown.id.replace('dropdown-', '');
    filterOptions(questionId, '');
  }
  
  openDropdown = null;
}

// Filter Options
function filterOptions(questionId, searchTerm) {
  const optionsContainer = document.getElementById(`options-${questionId}`);
  const options = optionsContainer.querySelectorAll('.dropdown-option');
  const term = searchTerm.toLowerCase().trim();
  let visibleCount = 0;
  
  options.forEach(option => {
    const text = option.querySelector('.option-text').textContent.toLowerCase();
    const matches = text.includes(term);
    option.style.display = matches ? 'flex' : 'none';
    if (matches) visibleCount++;
  });
  
  // Show no results message
  let noResults = optionsContainer.querySelector('.dropdown-no-results');
  if (visibleCount === 0) {
    if (!noResults) {
      noResults = document.createElement('div');
      noResults.className = 'dropdown-no-results';
      noResults.textContent = 'No options found';
      optionsContainer.appendChild(noResults);
    }
    noResults.style.display = 'block';
  } else if (noResults) {
    noResults.style.display = 'none';
  }
}

// Select Option
function selectOption(questionId, optionValue) {
  // Store the answer
  answers[questionId] = optionValue;
  
  // Update the trigger button text
  const selectedText = document.getElementById(`selected-text-${questionId}`);
  selectedText.innerHTML = `
    <span class="selected-value">
      <svg class="check-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      ${escapeHtml(optionValue)}
    </span>
  `;
  selectedText.classList.remove('placeholder');
  
  // Update trigger style
  const trigger = selectedText.closest('.dropdown-trigger');
  trigger.classList.add('has-value');
  
  // Update option visual state
  const optionsContainer = document.getElementById(`options-${questionId}`);
  optionsContainer.querySelectorAll('.dropdown-option').forEach(opt => {
    opt.classList.remove('selected');
    if (opt.dataset.value === optionValue) {
      opt.classList.add('selected');
    }
  });
  
  // Close dropdown
  const dropdown = document.getElementById(`dropdown-${questionId}`);
  closeDropdown(dropdown);
  
  // Update progress
  renderStepProgress();
  updateNavigation();
}

// Render Step Progress
function renderStepProgress() {
  let html = '';
  
  for (let i = 0; i < totalSteps; i++) {
    if (i > 0) {
      const prevAnswered = quizData.questions[i-1] && answers[quizData.questions[i-1].id] !== undefined;
      html += `<div class="step-connector ${prevAnswered ? 'completed' : ''}" data-step="${i}"></div>`;
    }
    
    const questionId = quizData.questions[i].id;
    const isCompleted = answers[questionId] !== undefined;
    const isActive = i === currentStep;
    
    html += `
      <div class="step-dot ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}" 
           data-step="${i}" 
           onclick="navigateToStep(${i})"
           title="Question ${i + 1}${isCompleted ? ' (answered)' : ''}">
      </div>
    `;
  }
  
  html += `
    <div class="step-info">
      <span class="step-counter">
        <span>${currentStep + 1}</span> / ${totalSteps}
      </span>
    </div>
  `;
  
  stepProgress.innerHTML = html;
}

// Navigate to specific step
function navigateToStep(step) {
  if (step < 0 || step >= totalSteps || step === currentStep) return;
  
  const direction = step > currentStep ? 'left' : 'right';
  const currentSlide = document.getElementById(`slide-${currentStep}`);
  const nextSlide = document.getElementById(`slide-${step}`);
  
  if (!currentSlide || !nextSlide) return;
  
  // Close any open dropdown
  if (openDropdown) {
    closeDropdown(openDropdown);
  }
  
  // Animate out current slide
  currentSlide.classList.remove('active');
  currentSlide.classList.add(direction === 'left' ? 'slide-out-left' : 'slide-out-right');
  
  // Update step
  currentStep = step;
  
  // Animate in next slide after a short delay
  setTimeout(() => {
    currentSlide.classList.remove('slide-out-left', 'slide-out-right');
    nextSlide.classList.add('active');
    
    renderStepProgress();
    updateNavigation();
  }, 300);
}

// Update Navigation Buttons
function updateNavigation() {
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === totalSteps;
  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;
  
  // Previous button
  prevBtn.style.display = isFirstStep ? 'none' : 'flex';
  
  // Next button
  nextBtn.style.display = isLastStep ? 'none' : 'flex';
  
  // Submit button
  submitBtn.style.display = isLastStep ? 'flex' : 'none';
  submitBtn.disabled = !allAnswered;
  submitBtn.style.opacity = allAnswered ? '1' : '0.5';
}

// Navigation button handlers
prevBtn.addEventListener('click', () => navigateToStep(currentStep - 1));
nextBtn.addEventListener('click', () => navigateToStep(currentStep + 1));

// Submit Vote
voteForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Validate all questions answered
  if (Object.keys(answers).length < totalSteps) {
    // Find first unanswered question
    for (let i = 0; i < quizData.questions.length; i++) {
      if (!answers[quizData.questions[i].id]) {
        navigateToStep(i);
        // Highlight the dropdown
        const wrapper = document.querySelector(`[data-question-id="${quizData.questions[i].id}"]`);
        if (wrapper) {
          const trigger = wrapper.querySelector('.dropdown-trigger');
          trigger.style.borderColor = 'var(--danger)';
          trigger.style.boxShadow = '0 0 0 4px var(--danger-glow)';
          setTimeout(() => {
            trigger.style.borderColor = '';
            trigger.style.boxShadow = '';
          }, 2000);
        }
        return;
      }
    }
    return;
  }
  
  // Prepare votes data
  const votes = Object.entries(answers).map(([questionId, selectedOption]) => ({
    questionId: parseInt(questionId),
    selectedOption
  }));
  
  try {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <div class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></div>
      Submitting...
    `;
    
    const response = await fetch(`/api/quiz/${quizId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ votes, voterSession })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      markAsVoted();
      showSuccess();
    } else {
      alert(data.error || 'Failed to submit vote');
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Submit Vote
      `;
    }
  } catch (error) {
    alert('Connection error. Please try again.');
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      Submit Vote
    `;
  }
});

// Show Success State
function showSuccess() {
  votingSection.style.display = 'none';
  successState.style.display = 'block';
  document.getElementById('viewResultsBtn').href = `/results.html?id=${quizId}`;
}

// Utility: Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
