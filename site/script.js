const agent = document.querySelector('#agent');
const command = document.querySelector('#command');
const note = document.querySelector('#setup-note');
const foot = document.querySelector('#setup-foot');
const status = document.querySelector('#copy-status');
const button = document.querySelector('#copy');
const names = {codex:'Codex',gemini:'Gemini CLI',opencode:'OpenCode',cursor:'Cursor'};
agent.addEventListener('change', () => {
  status.textContent = ''; button.textContent = 'Copy';
  if (agent.value === 'claude') {
    note.textContent = 'After installing the Scopewright plugin, run this in your project:';
    command.textContent = '/scopewright:create [what the reviewer should evaluate]';
    foot.textContent = 'Creates a portable reviewer skill and a Claude Code subagent.';
  } else if (agent.value === 'pi') {
    note.textContent = 'Install the package, then invoke /skill:scopewright-create in Pi.';
    command.textContent = 'pi install git:github.com/jwmarshall/scopewright';
    foot.textContent = 'Pi runs the generated reviewer as an on-demand skill in the current session.';
  } else {
    note.textContent = 'Install or link the repository so its .agents/skills/ directory is available to your project, then invoke this skill:';
    command.textContent = 'scopewright-create';
    foot.textContent = 'Creates a portable reviewer skill and a native adapter for ' + names[agent.value] + '.';
  }
});
button.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(command.textContent); button.textContent = 'Copied'; status.textContent = 'Copied to clipboard.'; }
  catch { status.textContent = 'Select and copy the command above.'; const range = document.createRange(); range.selectNodeContents(command); const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range); }
});
