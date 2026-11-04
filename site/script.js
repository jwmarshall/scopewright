const agent = document.querySelector('#agent');
const command = document.querySelector('#command');
const note = document.querySelector('#setup-note');
const foot = document.querySelector('#setup-foot');
const status = document.querySelector('#copy-status');
const button = document.querySelector('#copy');
const names = {codex:'Codex',opencode:'OpenCode',cursor:'Cursor'};
agent.addEventListener('change', () => {
  status.textContent = ''; button.textContent = 'Copy';
  if (agent.value === 'claude') {
    note.textContent = 'From a checkout, build the Claude-only plugin and load it for this session:';
    command.textContent = 'npm run package:claude && claude --plugin-dir ./dist/claude';
    foot.textContent = 'Keep the package directory. Invoke /scopewright:scopewright-create after launch. Persistent marketplace installation is also available; see the full setup instructions.';
  } else if (agent.value === 'pi') {
    note.textContent = 'From a checkout, build and install the skills-only Pi package:';
    command.textContent = 'npm run package:pi && pi install ./dist/pi';
    foot.textContent = 'Keep dist/pi and restart Pi, then invoke /skill:scopewright-create. Reviewers run as skills in the current session; no native subagent or companion extension is installed.';
  } else if (agent.value === 'omp') {
    note.textContent = 'From a Scopewright checkout, build and install the OMP-only package:';
    command.textContent = 'npm run package:omp && omp install ./dist/omp';
    foot.textContent = 'Restart OMP, then use /skill:scopewright-create. Keep dist/omp: installation links it. Stage updates at a new path; preserve customized agents, which take precedence. Do not install the repository root.';
  } else if (agent.value === 'antigravity') {
    note.textContent = 'Recommended Google harness: clone, build, and install the native plugin:';
    command.textContent = 'npm run package:antigravity && agy plugin install ./dist/antigravity';
    foot.textContent = 'Ask Antigravity to use scopewright-create and select antigravity; native reviewers use .agents/agents/. Inspect inventory with agy plugin list --json; inventory does not prove runtime tool enforcement or model behavior.';
  } else if (agent.value === 'gemini') {
    note.textContent = 'Legacy / enterprise / paid API-key: install the separate Gemini extension:';
    command.textContent = 'npm run package:gemini && gemini extensions install ./dist/gemini';
    foot.textContent = 'Ask Gemini to use scopewright-create. Google ended individual free/Pro/Ultra Gemini CLI requests June 18, 2026; enterprise and paid API-key access remain supported. Use Antigravity for new Google installations.';
  } else {
    note.textContent = 'From a checkout, build the ' + names[agent.value] + ' bundle and install into your existing project:';
    command.textContent = 'npm run package:' + agent.value + ' && node ./dist/' + agent.value + '/install.mjs /absolute/path/to/your-project';
    foot.textContent = 'Installs both complete skills and the native reviewer. Refuses existing destinations and symlinked destination ancestors; preserve customizations before updating. Restart ' + names[agent.value] + '. Version-tag releases provide the same self-contained bundle.'
      + (agent.value === 'codex' ? ' Read-only enforcement requires the parent sandbox.' : '')
      + (agent.value === 'cursor' ? ' Authenticated plugin discovery remains unverified; marketplace approval is not assumed.' : '');
  }
});
agent.dispatchEvent(new Event('change'));
button.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(command.textContent); button.textContent = 'Copied'; status.textContent = 'Copied to clipboard.'; }
  catch { status.textContent = 'Select and copy the command above.'; const range = document.createRange(); range.selectNodeContents(command); const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range); }
});
