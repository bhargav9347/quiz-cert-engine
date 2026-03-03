import { fetchAPI, showToast, formatTime, API_BASE } from './utils.js';

let currentUser = null;

const VIEWS = {
  HOME: 'home',
  AVAILABLE_QUIZZES: 'available-quizzes',
  MY_ATTEMPTS: 'my-attempts',
  CREATE_QUIZ: 'create-quiz',
  MY_QUIZZES: 'my-quizzes',
  VIEW_ATTEMPTS: 'view-attempts'
};

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const data = await fetchAPI('/auth/me');
    currentUser = data.user;
    initDashboard();
  } catch (err) {
    window.location.href = '/index.html';
  }

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await fetchAPI('/auth/logout', { method: 'POST' });
    window.location.href = '/index.html';
  });
});

function initDashboard() {
  document.getElementById('user-info').innerText = `${currentUser.full_name} (${currentUser.role})`;
  renderSidebar();
  navigateTo(VIEWS.HOME);
}

function renderSidebar() {
  const nav = document.getElementById('sidebar-nav');
  let items = [
    { id: VIEWS.HOME, label: 'Dashboard', icon: 'fa-house' },
    { id: VIEWS.AVAILABLE_QUIZZES, label: 'Available Quizzes', icon: 'fa-box' }
  ];

  if (currentUser.role === 'student') {
    items.push({ id: VIEWS.MY_ATTEMPTS, label: 'My Attempts', icon: 'fa-history' });
  }

  if (['admin', 'instructor'].includes(currentUser.role)) {
    items.push(
      { id: VIEWS.CREATE_QUIZ, label: 'Create Quiz', icon: 'fa-plus' },
      { id: VIEWS.MY_QUIZZES, label: 'My Quizzes', icon: 'fa-list-check' }
    );
  }

  nav.innerHTML = items.map(item => `
    <div class="nav-item" data-view="${item.id}">
      <i class="fa-solid ${item.icon}"></i> ${item.label}
    </div>
  `).join('');

  nav.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => {
      nav.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      el.classList.add('active');
      navigateTo(el.dataset.view);
    });
  });
}

function navigateTo(view, params = {}) {
  if (window.quizInterval) {
    clearInterval(window.quizInterval);
    window.quizInterval = null;
  }
  const container = document.getElementById('view-container');
  const title = document.getElementById('page-title');
  container.innerHTML = '<div class="skeleton" style="height: 200px;"></div>';

  switch (view) {
    case VIEWS.HOME:
      title.innerText = 'Dashboard Overview';
      renderHome(container);
      break;
    case VIEWS.AVAILABLE_QUIZZES:
      title.innerText = 'Available Quizzes';
      renderAvailableQuizzes(container);
      break;
    case VIEWS.MY_ATTEMPTS:
      title.innerText = 'Project Results & Certificates';
      renderMyAttempts(container);
      break;
    case VIEWS.CREATE_QUIZ:
      title.innerText = 'Design New Quiz';
      renderCreateQuiz(container);
      break;
    case VIEWS.MY_QUIZZES:
      title.innerText = 'Manage Your Quizzes';
      renderMyQuizzes(container);
      break;
    default:
      container.innerHTML = '<h3>View coming soon</h3>';
  }
}

async function renderHome(container) {
  try {
    const quizzes = await fetchAPI('/quizzes');
    let attempts = [];
    if (currentUser.role === 'student') {
      attempts = await fetchAPI('/attempts/my');
    }

    const passedCount = attempts.filter(a => a.passed).length;

    container.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="label">Ready Quizzes</div>
          <div class="stat-val">${quizzes.length}</div>
        </div>
        <div class="stat-card">
          <div class="label">Total Attempts</div>
          <div class="stat-val">${attempts.length}</div>
        </div>
        <div class="stat-card">
          <div class="label">Certificates Earned</div>
          <div class="stat-val">${passedCount}</div>
        </div>
      </div>
      <div class="glass-card">
        <h3>Welcome, ${currentUser.full_name}!</h3>
        <p class="mt-4">You are logged in as <strong>${currentUser.role}</strong>. ${currentUser.role === 'student'
        ? 'Browse available quizzes to start earning certifications.'
        : 'You can create and manage quizzes from the sidebar.'
      }</p>
      </div>
    `;
  } catch (err) { }
}

async function renderAvailableQuizzes(container) {
  try {
    const quizzes = await fetchAPI('/quizzes');
    if (quizzes.length === 0) {
      container.innerHTML = '<p>No quizzes available at the moment.</p>';
      return;
    }

    container.innerHTML = `
      <div class="quiz-grid">
        ${quizzes.map(q => `
          <div class="glass-card quiz-card">
            <h3>${q.title}</h3>
            <p style="margin: 15px 0; font-size: 0.9rem; opacity: 0.8;">${q.description || 'No description'}</p>
            <div style="display: flex; gap: 15px; margin-bottom: 20px;">
              <span style="font-size: 0.8rem;"><i class="fa-regular fa-clock"></i> ${q.time_limit} mins</span>
              <span style="font-size: 0.8rem;"><i class="fa-solid fa-trophy"></i> Pass: ${q.passing_score}%</span>
            </div>
            <button class="btn btn-primary start-quiz-btn" data-id="${q.id}">Start Quiz</button>
          </div>
        `).join('')}
      </div>
    `;

    container.querySelectorAll('.start-quiz-btn').forEach(btn => {
      btn.addEventListener('click', () => startQuiz(btn.dataset.id));
    });
  } catch (err) { }
}

async function startQuiz(id) {
  try {
    const quiz = await fetchAPI(`/quizzes/${id}`);
    const container = document.getElementById('view-container');
    document.getElementById('page-title').innerText = quiz.title;

    let currentQuestionIdx = 0;
    const answers = {};
    let timeLeft = quiz.time_limit * 60;

    function renderQuestion() {
      const q = quiz.questions[currentQuestionIdx];
      container.innerHTML = `
        <div class="quiz-header">
          <div>Question ${currentQuestionIdx + 1} of ${quiz.questions.length}</div>
          <div class="timer" id="quiz-timer">${formatTime(timeLeft)}</div>
        </div>
        <div class="glass-card question-card">
          ${q.image_url ? `<img src="${q.image_url}" style="max-width: 100%; border-radius: 10px; margin-bottom: 20px;">` : ''}
          <h3>${q.question_text}</h3>
          <div class="options-list">
            ${q.options.map(o => `
              <div class="option-item ${answers[q.id] == o.id ? 'selected' : ''}" data-id="${o.id}">
                ${o.option_text}
              </div>
            `).join('')}
          </div>
          <div style="display: flex; gap: 15px; margin-top: 30px;">
            <button class="btn btn-outline" id="prev-q" ${currentQuestionIdx === 0 ? 'disabled' : ''}>Previous</button>
            ${currentQuestionIdx === quiz.questions.length - 1
          ? '<button class="btn btn-primary" id="submit-quiz">Submit Quiz</button>'
          : '<button class="btn btn-primary" id="next-q">Next Question</button>'
        }
          </div>
        </div>
      `;

      container.querySelectorAll('.option-item').forEach(opt => {
        opt.addEventListener('click', () => {
          answers[q.id] = opt.dataset.id;
          container.querySelectorAll('.option-item').forEach(i => i.classList.remove('selected'));
          opt.classList.add('selected');
        });
      });

      document.getElementById('next-q')?.addEventListener('click', () => {
        currentQuestionIdx++;
        renderQuestion();
      });

      document.getElementById('prev-q')?.addEventListener('click', () => {
        currentQuestionIdx--;
        renderQuestion();
      });

      document.getElementById('submit-quiz')?.addEventListener('click', () => {
        if (confirm('Are you sure you want to submit?')) finishQuiz(id, answers);
      });
    }

    const timerInterval = setInterval(() => {
      timeLeft--;
      const timerEl = document.getElementById('quiz-timer');
      if (timerEl) timerEl.innerText = formatTime(timeLeft);
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        showToast('Time is up! Submitting automatically.', 'error');
        finishQuiz(id, answers);
      }
    }, 1000);

    renderQuestion();

    window.quizInterval = timerInterval; // To clear it if user navigates away

  } catch (err) { }
}

async function finishQuiz(quizId, answers) {
  clearInterval(window.quizInterval);
  try {
    const result = await fetchAPI(`/attempts/${quizId}`, {
      method: 'POST',
      body: JSON.stringify({ answers })
    });

    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="glass-card text-center" style="max-width: 600px; margin: 0 auto;">
        <i class="fa-solid ${result.passed ? 'fa-circle-check' : 'fa-circle-xmark'}" style="font-size: 4rem; color: ${result.passed ? 'var(--success)' : 'var(--danger)'}; margin-bottom: 20px;"></i>
        <h2>${result.message}</h2>
        <div class="stat-val" style="margin: 20px 0;">Your Score: ${result.score}%</div>
        ${result.passed
        ? `<button class="btn btn-primary" id="download-cert" data-id="${result.attemptId}">Download Certificate</button>`
        : '<button class="btn btn-outline" onclick="location.reload()">Back to Dashboard</button>'
      }
      </div>
    `;

    document.getElementById('download-cert')?.addEventListener('click', () => {
      window.open(`/api/certificates/${result.attemptId}`, '_blank');
    });
  } catch (err) { }
}

async function renderMyAttempts(container) {
  try {
    const attempts = await fetchAPI('/attempts/my');
    container.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Quiz Title</th>
            <th>Attempt Date</th>
            <th>Score</th>
            <th>Result</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${attempts.map(a => `
            <tr>
              <td>${a.quiz_title}</td>
              <td>${new Date(a.attempted_at).toLocaleDateString()}</td>
              <td>${a.score}%</td>
              <td><span class="badge ${a.passed ? 'badge-success' : 'badge-danger'}">${a.passed ? 'PASSED' : 'FAILED'}</span></td>
              <td>
                ${a.passed
        ? `<a href="/api/certificates/${a.id}" target="_blank" class="btn btn-outline" style="padding: 5px 10px; font-size: 0.8rem;">Download PDF</a>`
        : '-'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) { }
}

function renderCreateQuiz(container) {
  container.innerHTML = `
    <div class="glass-card">
      <form id="create-quiz-form">
        <div class="form-group">
          <label>Quiz Title</label>
          <input type="text" name="title" required placeholder="Advanced Node.js Mastery">
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea name="description" rows="3" placeholder="Enter quiz details..."></textarea>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div class="form-group">
            <label>Time Limit (minutes)</label>
            <input type="number" name="time_limit" value="30" required>
          </div>
          <div class="form-group">
            <label>Passing Score (%)</label>
            <input type="number" name="passing_score" value="60" required>
          </div>
        </div>
        <button type="submit" class="btn btn-primary">Create & Add Questions</button>
      </form>
    </div>
  `;

  document.getElementById('create-quiz-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    try {
      const quiz = await fetchAPI('/quizzes', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      renderAddQuestions(container, quiz.id);
    } catch (err) { }
  });
}

function renderAddQuestions(container, quizId) {
  document.getElementById('page-title').innerText = 'Add Questions';
  container.innerHTML = `
    <div class="glass-card mb-4">
      <form id="add-question-form">
        <div class="form-group">
          <label>Question Text</label>
          <textarea name="question_text" required></textarea>
        </div>
        <div class="form-group">
          <label>Question Image (Optional)</label>
          <input type="file" name="image" accept="image/*">
        </div>
        <div id="options-container">
          <label>Options (Check correct one)</label>
          <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;">
            <input type="radio" name="is_correct" value="0" checked>
            <input type="text" class="opt-text" placeholder="Option 1" required style="flex:1">
          </div>
          <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;">
            <input type="radio" name="is_correct" value="1">
            <input type="text" class="opt-text" placeholder="Option 2" required style="flex:1">
          </div>
        </div>
        <button type="button" class="btn btn-outline mb-4" id="add-opt-btn" style="padding: 5px;">+ Add Option</button>
        <div style="display: flex; gap: 15px;">
          <button type="submit" class="btn btn-primary">Save Question</button>
          <button type="button" class="btn btn-outline" id="finish-quiz-btn">Finish & Publish</button>
        </div>
      </form>
    </div>
    <div id="questions-list"></div>
  `;

  const optContainer = document.getElementById('options-container');
  let optCount = 2;

  document.getElementById('add-opt-btn').addEventListener('click', () => {
    const div = document.createElement('div');
    div.style = "display: flex; gap: 10px; align-items: center; margin-bottom: 10px;";
    div.innerHTML = `
      <input type="radio" name="is_correct" value="${optCount}">
      <input type="text" class="opt-text" placeholder="Option ${optCount + 1}" required style="flex:1">
    `;
    optContainer.appendChild(div);
    optCount++;
  });

  document.getElementById('add-question-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const options = [];
    const optTexts = optContainer.querySelectorAll('.opt-text');
    const correctIdx = formData.get('is_correct');

    optTexts.forEach((input, index) => {
      options.push({ text: input.value, isCorrect: index == correctIdx });
    });

    const body = new FormData();
    body.append('question_text', formData.get('question_text'));
    body.append('options', JSON.stringify(options));
    if (formData.get('image').size > 0) {
      body.append('image', formData.get('image'));
    }

    try {
      await fetch(`${API_BASE}/quizzes/${quizId}/questions`, {
        method: 'POST',
        body: body // Send as form data
      });
      showToast('Question added');
      e.target.reset();
      optContainer.innerHTML = `
        <label>Options (Check correct one)</label>
        <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;">
          <input type="radio" name="is_correct" value="0" checked>
          <input type="text" class="opt-text" placeholder="Option 1" required style="flex:1">
        </div>
        <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;">
          <input type="radio" name="is_correct" value="1">
          <input type="text" class="opt-text" placeholder="Option 2" required style="flex:1">
        </div>
      `;
      optCount = 2;
    } catch (err) { }
  });

  document.getElementById('finish-quiz-btn').addEventListener('click', async () => {
    await fetchAPI(`/quizzes/${quizId}/publish`, {
      method: 'PATCH',
      body: JSON.stringify({ is_published: true })
    });
    showToast('Quiz published!');
    navigateTo(VIEWS.MY_QUIZZES);
  });
}

async function renderMyQuizzes(container) {
  try {
    const quizzes = await fetchAPI('/quizzes/my');
    container.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Status</th>
            <th>Results</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${quizzes.map(q => `
            <tr>
              <td>${q.title}</td>
              <td><span class="badge ${q.is_published ? 'badge-success' : 'badge-danger'}">${q.is_published ? 'Published' : 'Draft'}</span></td>
              <td>
                <button class="btn btn-outline view-attempts-btn" data-id="${q.id}" style="padding: 5px 10px; font-size: 0.8rem;">View All Attempts</button>
              </td>
              <td>
                <a href="/api/attempts/quiz/${q.id}?format=csv" class="btn btn-primary" style="padding: 5px 10px; font-size: 0.8rem;">Export CSV</a>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    container.querySelectorAll('.view-attempts-btn').forEach(btn => {
      btn.addEventListener('click', () => renderAllAttempts(btn.dataset.id));
    });
  } catch (err) { }
}

async function renderAllAttempts(quizId) {
  const container = document.getElementById('view-container');
  document.getElementById('page-title').innerText = 'All Quiz Attempts';

  try {
    const attempts = await fetchAPI(`/attempts/quiz/${quizId}`);
    container.innerHTML = `
      <button class="btn btn-outline mb-4" onclick="location.reload()" style="width: auto;">&larr; Back to My Quizzes</button>
      <table>
        <thead>
          <tr>
            <th>Student</th>
            <th>Email</th>
            <th>Score</th>
            <th>Passed</th>
            <th>Date</th>
            <th>Certificate</th>
          </tr>
        </thead>
        <tbody>
          ${attempts.map(a => `
            <tr>
              <td>${a.full_name}</td>
              <td>${a.email}</td>
              <td>${a.score}%</td>
              <td><span class="badge ${a.passed ? 'badge-success' : 'badge-danger'}">${a.passed ? 'YES' : 'NO'}</span></td>
              <td>${new Date(a.attempted_at).toLocaleDateString()}</td>
              <td>
                ${a.passed
        ? `<a href="/api/certificates/${a.id}" target="_blank" class="btn btn-outline" style="padding: 5px 10px; font-size: 0.8rem;"><i class="fa-solid fa-download"></i> PDF</a>`
        : '-'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) { }
}
