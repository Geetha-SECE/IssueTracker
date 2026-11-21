const projectInput = document.getElementById('project');
const loadBtn = document.getElementById('loadProject');
const projectSection = document.getElementById('projectSection');
const projectNameEl = document.getElementById('projectName');
const issueForm = document.getElementById('issueForm');
const issuesList = document.getElementById('issuesList');
const filterField = document.getElementById('filterField');
const filterValue = document.getElementById('filterValue');
const applyFilter = document.getElementById('applyFilter');
const clearFilter = document.getElementById('clearFilter');

let project = 'test';

async function api(path, options = {}) {
  const res = await fetch('/api' + path, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  return res.json();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text == null ? '' : text;
  return div.innerHTML;
}

function renderIssues(issues) {
  issuesList.innerHTML = '';
  if (!issues || issues.length === 0) {
    issuesList.innerHTML = '<div id="emptyMsg">No issues found.</div>';
    return;
  }
  issues.forEach(issue => {
    const el = document.createElement('div');
    el.className = 'issue';
    const openClass = issue.open ? 'open-true' : 'open-false';
    const openLabel = issue.open ? 'Open' : 'Closed';
    el.innerHTML = `
      <div class="title">${escapeHtml(issue.issue_title)} <span class="open-badge ${openClass}">${openLabel}</span></div>
      <div class="meta">
        ${escapeHtml(issue.issue_text)}<br/>
        by <b>${escapeHtml(issue.created_by)}</b> |
        assigned to <b>${escapeHtml(issue.assigned_to || '-')}</b> |
        status: <b>${escapeHtml(issue.status_text || '-')}</b><br/>
        created ${new Date(issue.created_on).toLocaleString()} |
        updated ${new Date(issue.updated_on).toLocaleString()}
      </div>
      <div class="actions">
        <button class="secondary" onclick="toggleOpen('${issue._id}', ${!issue.open})">${issue.open ? 'Close' : 'Reopen'}</button>
        <button class="danger" onclick="removeIssue('${issue._id}')">Delete</button>
      </div>
    `;
    issuesList.appendChild(el);
  });
}

async function loadIssues() {
  const qs = new URLSearchParams();
  if (filterField.value && filterValue.value) qs.set(filterField.value, filterValue.value);
  const res = await api(`/issues/${project}?${qs.toString()}`);
  renderIssues(res);
}

window.toggleOpen = async (_id, open) => {
  await api(`/issues/${project}`, { method: 'PUT', body: JSON.stringify({ _id, open }) });
  await loadIssues();
};

window.removeIssue = async _id => {
  if (!confirm('Delete this issue?')) return;
  await api(`/issues/${project}`, { method: 'DELETE', body: JSON.stringify({ _id }) });
  await loadIssues();
};

loadBtn.addEventListener('click', () => {
  project = projectInput.value.trim() || 'test';
  projectNameEl.textContent = project;
  projectSection.style.display = 'block';
  loadIssues();
});

issueForm.addEventListener('submit', async e => {
  e.preventDefault();
  const body = {
    issue_title: document.getElementById('i_title').value,
    issue_text: document.getElementById('i_text').value,
    created_by: document.getElementById('i_created_by').value,
    assigned_to: document.getElementById('i_assigned_to').value,
    status_text: document.getElementById('i_status_text').value
  };
  await api(`/issues/${project}`, { method: 'POST', body: JSON.stringify(body) });
  issueForm.reset();
  await loadIssues();
});

applyFilter.addEventListener('click', loadIssues);
clearFilter.addEventListener('click', () => {
  filterField.value = '';
  filterValue.value = '';
  loadIssues();
});
