const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const ROOT_DIR = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const PROJECT_NAME = path.basename(ROOT_DIR);
const OUTPUT_ZIP = path.join(ROOT_DIR, `${PROJECT_NAME}.zip`);

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
  const stagingDir = path.join(tempDir, PROJECT_NAME);

  try {
    await fs.access(PUBLIC_DIR);
    await fs.rm(OUTPUT_ZIP, { force: true });
    await fs.mkdir(stagingDir, { recursive: true });
    await fs.cp(PUBLIC_DIR, stagingDir, { recursive: true });
    await runZip(tempDir, OUTPUT_ZIP, PROJECT_NAME);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

publish().catch((error) => {
  console.error(error);
  process.exit(1);
});
