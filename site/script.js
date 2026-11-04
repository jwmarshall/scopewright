const agent = document.querySelector('#agent');
const command = document.querySelector('#command');
const note = document.querySelector('#setup-note');
const foot = document.querySelector('#setup-foot');
const status = document.querySelector('#copy-status');
const button = document.querySelector('#copy');
const names = {codex:'Codex',opencode:'OpenCode',cursor:'Cursor',omp:'OhMyPi',antigravity:'Antigravity CLI',gemini:'Gemini CLI'};
const details = {
  codex: 'Restart Codex, then use $scopewright-create. Read-only enforcement requires the parent sandbox.',
  opencode: 'Restart OpenCode, then use scopewright-create or invoke @root-prompt-reviewer. The native adapter retains deny-by-default permissions.',
  cursor: 'Restart Cursor, then ask it to use scopewright-create. Authenticated plugin discovery remains unverified; marketplace approval is not assumed.',
  omp: 'Restart OMP, then use /skill:scopewright-create. Do not use omp install npm:@jwmarshall/scopewright or omp install on the repository root: the root package’s agents/ contains Claude definitions. For native package installation, use the separate scopewright-omp.tar.gz archive and keep its linked directory.',
  antigravity: 'Ask Antigravity to use scopewright-create and select antigravity. Reviewers use .agents/agents/. A matching release archive is also available for native agy plugin install; inventory does not prove runtime enforcement or model behavior.',
  gemini: 'Ask Gemini to use scopewright-create. Enterprise and paid API-key access remain supported; use Antigravity for new individual Google installations. A separate release archive remains available for native gemini extensions install.'
};
agent.addEventListener('change', () => {
  status.textContent = ''; button.textContent = 'Copy';
  if (agent.value === 'claude') {
    note.textContent = 'Register the native marketplace and install its plugin:';
    command.textContent = 'claude plugin marketplace add jwmarshall/scopewright && claude plugin install scopewright@scopewright';
    foot.textContent = 'Invoke /scopewright:scopewright-create after installation. Use Claude’s plugin manager for updates. Managed project files are an alternative with --harness claude (Scopewright 0.3.0+). See full setup instructions.';
  } else if (agent.value === 'pi') {
    note.textContent = 'Install Pi’s scoped native npm skills package for this project:';
    command.textContent = 'pi install --local npm:@jwmarshall/scopewright';
    foot.textContent = 'For a user-level installation across projects, use pi install npm:@jwmarshall/scopewright without --local. Pi manages its package cache; --local records the declaration in this project. Direct Git also works: pi install --local git:github.com/jwmarshall/scopewright. Grant project trust and restart/reload Pi, then invoke /skill:scopewright-create. Use Pi’s package manager for updates. Reviewers run as skills in the current session; no native subagent or companion extension is installed.';
  } else {
    note.textContent = 'Install ' + names[agent.value] + ' files into this project only (@jwmarshall/scopewright 0.3.0+, Node.js 22+):';
    command.textContent = 'npx @jwmarshall/scopewright@latest install --harness ' + agent.value + ' --local --project /absolute/path/to/project';
    foot.textContent = 'Project-local only: omitting --local does not install into user/global harness configuration. Explicit update: npx @jwmarshall/scopewright@latest update --harness ' + agent.value + ' --local --project /absolute/path/to/project. Fetching @latest alone does not refresh files. Ownership/hashes live in .scopewright/install.json; shared .agents/skills/ updates refresh all owners without touching other adapters. Edited or unmanaged files and internal symlinks fail preflight without changes. No force, adoption, or global mode: back up and move conflicting files yourself. ' + details[agent.value];
  }
});
agent.dispatchEvent(new Event('change'));
button.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(command.textContent); button.textContent = 'Copied'; status.textContent = 'Copied to clipboard.'; }
  catch { status.textContent = 'Select and copy the command above.'; const range = document.createRange(); range.selectNodeContents(command); const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range); }
});
