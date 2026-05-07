const input   = document.getElementById('input');
const btn     = document.getElementById('btn');
const errorEl = document.getElementById('errorMsg');
const loading = document.getElementById('loading');
const content = document.getElementById('content');

// Chart colors matching the theme
const CHART_COLORS = [
  '#c8f060', '#60c8f0', '#f0c860', '#f06060', '#a060f0',
  '#60f0a0', '#f09060', '#6090f0'
];

let chartInstance = null;

// ── Events ──

btn.addEventListener('click', loadUser);
input.addEventListener('keydown', e => { if (e.key === 'Enter') loadUser(); });

// ── Main function ──

async function loadUser() {
  const name = input.value.trim();

  if (!name) {
    showError('Please enter a GitHub username.');
    return;
  }

  showError('');
  setLoading(true);

  try {
    const [userRes, repoRes] = await Promise.all([
      fetch(`https://api.github.com/users/${name}`),
      fetch(`https://api.github.com/users/${name}/repos?per_page=100`)
    ]);

    if (userRes.status === 404) throw new Error('User not found.');
    if (userRes.status === 403) throw new Error('API rate limit reached. Try again later.');
    if (!userRes.ok) throw new Error('Failed to load user.');
    if (!repoRes.ok) throw new Error('Failed to load repositories.');

    const user  = await userRes.json();
    const repos = await repoRes.json();

    renderProfile(user);
    renderChart(repos);
    renderRepos(repos);

    setLoading(false);
    content.classList.remove('hidden');

  } catch (err) {
    setLoading(false);
    showError(err.message);
  }
}

// ── Render Profile ──

function renderProfile(user) {
  document.getElementById('avatar').src       = user.avatar_url;
  document.getElementById('name').textContent = user.name || user.login;
  document.getElementById('login').textContent = '@' + user.login;
  document.getElementById('bio').textContent  = user.bio || 'No bio available.';
  document.getElementById('reposCount').textContent = formatNum(user.public_repos);
  document.getElementById('followers').textContent  = formatNum(user.followers);
  document.getElementById('following').textContent  = formatNum(user.following);
  document.getElementById('profileLink').href = user.html_url;
}

// ── Render Chart ──

function renderChart(repos) {
  const languages = {};

  repos.forEach(repo => {
    if (!repo.language) return;
    languages[repo.language] = (languages[repo.language] || 0) + 1;
  });

  const sorted = Object.entries(languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const labels = sorted.map(i => i[0]);
  const data   = sorted.map(i => i[1]);
  const colors = CHART_COLORS.slice(0, labels.length);

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(document.getElementById('chart'), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderColor: '#0a0a0f',
        borderWidth: 3,
        hoverBorderWidth: 3
      }]
    },
    options: {
      cutout: '70%',
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      animation: { animateRotate: true, duration: 800 }
    }
  });

  // Custom legend
  const legend = document.getElementById('chartLegend');
  legend.innerHTML = '';
  sorted.forEach(([lang, count], i) => {
    legend.innerHTML += `
      <div class="legend-item">
        <div class="legend-dot" style="background:${colors[i]}"></div>
        <span class="legend-name">${lang}</span>
        <span class="legend-count">${count} repo${count !== 1 ? 's' : ''}</span>
      </div>
    `;
  });
}

// ── Render Repos ──

function renderRepos(repos) {
  const box = document.getElementById('repos');
  box.innerHTML = '';

  repos
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 6)
    .forEach(repo => {
      box.innerHTML += `
        <div class="repo-card">
          <a class="repo-name" href="${repo.html_url}" target="_blank">${repo.name}</a>
          <p class="repo-desc">${repo.description || 'No description.'}</p>
          <div class="repo-meta">
            <span class="repo-lang">
              <span class="repo-lang-dot"></span>
              ${repo.language || 'Unknown'}
            </span>
            <span class="repo-stars">★ ${repo.stargazers_count}</span>
          </div>
        </div>
      `;
    });
}

// ── Helpers ──

function showError(msg) {
  errorEl.textContent = msg;
}

function setLoading(state) {
  if (state) {
    loading.classList.remove('hidden');
    content.classList.add('hidden');
  } else {
    loading.classList.add('hidden');
  }
}

function formatNum(n) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n;
}