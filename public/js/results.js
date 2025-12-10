// State
let quizId = null;

// DOM Elements
const loadingOverlay = document.getElementById('loadingOverlay');
const errorState = document.getElementById('errorState');
const resultsSection = document.getElementById('resultsSection');
const refreshBtn = document.getElementById('refreshBtn');

// Get quiz ID from URL
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  quizId = urlParams.get('id');
  
  if (!quizId) {
    showError('No poll ID provided');
    return;
  }
  
  loadResults();
  
  // Set up share URL
  document.getElementById('shareUrl').value = window.location.href;
});

// Refresh button
refreshBtn.addEventListener('click', () => {
  loadingOverlay.style.display = 'flex';
  resultsSection.style.display = 'none';
  loadResults();
});

// Copy share URL
document.getElementById('copyShareUrl').addEventListener('click', () => {
  const input = document.getElementById('shareUrl');
  input.select();
  document.execCommand('copy');
  
  const btn = document.getElementById('copyShareUrl');
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

// Load Results
async function loadResults() {
  try {
    const response = await fetch(`/api/quiz/${quizId}/results`);
    
    if (!response.ok) {
      const data = await response.json();
      showError(data.error || 'Results not found');
      return;
    }
    
    const data = await response.json();
    renderResults(data);
  } catch (error) {
    showError('Failed to load results. Please try again.');
  }
}

// Show Error State
function showError(message) {
  loadingOverlay.style.display = 'none';
  errorState.style.display = 'block';
  document.getElementById('errorMessage').textContent = message;
}

// Render Results
function renderResults(data) {
  loadingOverlay.style.display = 'none';
  resultsSection.style.display = 'block';
  
  const { quiz, results, totalVoters } = data;
  
  // Set header info
  document.getElementById('pollTitle').textContent = quiz.title;
  document.getElementById('pollDescription').textContent = quiz.description || '';
  
  // Set summary cards with animation
  animateValue('totalVoters', 0, totalVoters, 1000);
  animateValue('totalQuestions', 0, results.length, 800);
  animateValue('totalOptions', 0, quiz.options.length, 600);
  
  // Render results
  const container = document.getElementById('resultsContainer');
  container.innerHTML = results.map((result, index) => {
    const totalVotes = Object.values(result.votes).reduce((a, b) => a + b, 0);
    const maxVotes = Math.max(...Object.values(result.votes));
    
    return `
      <div class="card result-card slide-up" style="animation-delay: ${index * 0.15}s;">
        <h3>
          <div class="question-badge">${index + 1}</div>
          <span>${escapeHtml(result.questionText)}</span>
        </h3>
        <div class="result-options">
          ${quiz.options.map(option => {
            const count = result.votes[option] || 0;
            const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            const isWinner = count === maxVotes && count > 0;
            
            return `
              <div class="result-option ${isWinner ? 'winner' : ''}">
                <div class="result-bar-wrapper">
                  <div class="result-bar" style="width: 0%;" data-width="${percentage}%"></div>
                  <span class="result-label">
                    ${isWinner ? `
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;">
                        <circle cx="12" cy="8" r="7"/>
                        <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
                      </svg>
                    ` : ''}
                    ${escapeHtml(option)}
                  </span>
                  <span class="result-count">
                    ${count} vote${count !== 1 ? 's' : ''}
                    <span class="percentage">${percentage}%</span>
                  </span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
  
  // Animate bars after render
  setTimeout(() => {
    document.querySelectorAll('.result-bar').forEach(bar => {
      const width = bar.dataset.width;
      bar.style.width = width;
    });
  }, 300);
}

// Animate number values
function animateValue(elementId, start, end, duration) {
  const element = document.getElementById(elementId);
  const range = end - start;
  const startTime = performance.now();
  
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Ease out cubic
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(start + range * easeOut);
    
    element.textContent = current;
    
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }
  
  requestAnimationFrame(update);
}

// Utility: Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
