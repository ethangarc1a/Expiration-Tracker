import chokidar from 'chokidar';
import { execSync } from 'node:child_process';

const watcher = chokidar.watch('.', {
  ignored: [
    '**/node_modules/**',
    '**/.git/**',
    '**/.expo/**',
    '**/dist/**',
    '**/build/**',
  ],
  ignoreInitial: true,
});

const run = (command) => execSync(command, { stdio: 'ignore' });

const tryCommit = () => {
  try {
    run('git add -A');
    execSync('git diff --cached --quiet');
  } catch {
    const message = `Auto-commit: ${new Date().toISOString()}`;
    run(`git commit -m "${message}"`);
  }
};

watcher.on('all', () => {
  tryCommit();
});

console.log('Auto-commit watcher running...');
