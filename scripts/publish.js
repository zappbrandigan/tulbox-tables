const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const ROOT_DIR = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const MANIFEST_PATH = path.join(ROOT_DIR, 'src', 'manifest.json');
const README_PATH = path.join(ROOT_DIR, 'README.md');

function toSafeName(name) {
  return name
    .toLowerCase()
    .replace('ū', 'u')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function runZip(cwd, outputZip, folderName) {
  return new Promise((resolve, reject) => {
    const zip = spawn('zip', ['-r', outputZip, folderName], { cwd });

    zip.on('error', (error) => {
      reject(
        new Error(
          `Failed to run zip. Make sure the 'zip' command is available: ${error.message}`
        )
      );
    });

    zip.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`zip exited with code ${code}`));
    });
  });
}

async function publish() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'publish-'));
  const manifestRaw = await fs.readFile(MANIFEST_PATH, 'utf8');
  const manifest = JSON.parse(manifestRaw);
  const appName =
    toSafeName(manifest.name || path.basename(ROOT_DIR)) || 'extension';
  const stagingDir = path.join(tempDir, appName);
  const outputZip = path.join(ROOT_DIR, `${appName}.zip`);

  try {
    await fs.access(PUBLIC_DIR);
    await fs.access(README_PATH);
    await fs.rm(outputZip, { force: true });
    await fs.mkdir(stagingDir, { recursive: true });
    await fs.copyFile(README_PATH, path.join(stagingDir, 'readme.md'));
    await fs.cp(PUBLIC_DIR, path.join(stagingDir, 'public'), {
      recursive: true,
    });
    await runZip(tempDir, outputZip, appName);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

publish().catch((error) => {
  console.error(error);
  process.exit(1);
});
