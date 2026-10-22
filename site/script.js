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
    note.textContent = 'After installing the Scopewright plugin, run this in your project:';
    command.textContent = '/scopewright:scopewright-create [what the reviewer should evaluate]';
    foot.textContent = 'Creates a portable reviewer skill and a Claude Code subagent.';
  } else if (agent.value === 'pi') {
    note.textContent = 'Install the package, then invoke /skill:scopewright-create in Pi.';
    command.textContent = 'pi install git:github.com/jwmarshall/scopewright';
    foot.textContent = 'Pi runs the generated reviewer as an on-demand skill in the current session.';
  } else if (agent.value === 'omp') {
    note.textContent = 'From a Scopewright checkout, install the native OhMyPi resources:';
    command.textContent = 'mkdir -p ~/.omp/agent/skills ~/.omp/agent/agents && cp -R skills/scopewright-create skills/root-prompt-reviewer ~/.omp/agent/skills/ && cp .omp/agents/root-prompt-reviewer.md ~/.omp/agent/agents/';
    foot.textContent = 'Preserve existing customizations first. Do not load the Claude plugin agents as an OMP extension.';
  } else if (agent.value === 'antigravity') {
    note.textContent = 'Recommended Google harness: clone, build, and install the native plugin:';
    command.textContent = 'git clone https://github.com/jwmarshall/scopewright.git && cd scopewright && npm run package:antigravity && agy plugin install ./dist/antigravity';
    foot.textContent = 'Ask Antigravity to use scopewright-create and select antigravity; native reviewers use .agents/agents/. Inspect inventory with agy plugin list --json; inventory does not prove runtime tool enforcement or model behavior.';
  } else if (agent.value === 'gemini') {
    note.textContent = 'Legacy / enterprise / paid API-key: install the separate Gemini extension:';
    command.textContent = 'git clone https://github.com/jwmarshall/scopewright.git && cd scopewright && npm run package:gemini && gemini extensions install ./dist/gemini';
    foot.textContent = 'Ask Gemini to use scopewright-create. Google ended individual free/Pro/Ultra Gemini CLI requests June 18, 2026; enterprise and paid API-key access remain supported. Use Antigravity for new Google installations.';
  } else {
    note.textContent = 'Run in your project, then ask the harness to use scopewright-create:';
    command.textContent = 'npx skills@1.7.4 add jwmarshall/scopewright --skill scopewright-create root-prompt-reviewer -a ' + agent.value + ' -y';
    foot.textContent = 'Installs portable skills for ' + names[agent.value] + '; native reviewer installation is documented separately.';
  }
});
button.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(command.textContent); button.textContent = 'Copied'; status.textContent = 'Copied to clipboard.'; }
  catch { status.textContent = 'Select and copy the command above.'; const range = document.createRange(); range.selectNodeContents(command); const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range); }
});
