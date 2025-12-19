import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

export interface ArchiveResult {
  archivePath: string;
  filesArchived: number;
  timestamp: string;
}

export async function archiveOutputs(
  outputDir: string,
  inputImagePath: string | null,
  archiveDir?: string
): Promise<ArchiveResult | null> {
  const resolvedOutputDir = path.resolve(outputDir);
  const resolvedArchiveDir = archiveDir 
    ? path.resolve(archiveDir) 
    : path.join(resolvedOutputDir, 'archive');

  if (!fs.existsSync(resolvedOutputDir)) {
    return null;
  }

  const hasOutputFiles = checkForOutputFiles(resolvedOutputDir);
  if (!hasOutputFiles) {
    return null;
  }

  if (!fs.existsSync(resolvedArchiveDir)) {
    fs.mkdirSync(resolvedArchiveDir, { recursive: true });
  }

  const timestamp = formatTimestamp(new Date());
  const imageName = inputImagePath 
    ? path.basename(inputImagePath, path.extname(inputImagePath))
    : 'output';
  const archiveName = `${sanitizeFilename(imageName)}_${timestamp}.zip`;
  const archivePath = path.join(resolvedArchiveDir, archiveName);

  const tempDir = path.join(resolvedOutputDir, '.archive_temp');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true });
  }
  fs.mkdirSync(tempDir, { recursive: true });

  let filesArchived = 0;

  const subDirs = ['data', 'dashboards', 'deploy', 'docs', 'powerbi', 'analytics'];
  for (const subDir of subDirs) {
    const srcDir = path.join(resolvedOutputDir, subDir);
    if (fs.existsSync(srcDir)) {
      const destDir = path.join(tempDir, subDir);
      fs.mkdirSync(destDir, { recursive: true });
      filesArchived += copyDirContents(srcDir, destDir);
    }
  }

  // Include inputs folder if it exists (contains source ER diagram)
  const inputsDir = path.join(path.dirname(resolvedOutputDir), 'inputs');
  if (fs.existsSync(inputsDir)) {
    const destDir = path.join(tempDir, 'inputs');
    fs.mkdirSync(destDir, { recursive: true });
    filesArchived += copyDirContents(inputsDir, destDir);
  }

  const rootFiles = ['schema.json', 'schema.sql', 'schema_processed.json', 'schema_postgresql.sql', 'schema_mysql.sql', 'views.sql'];
  for (const file of rootFiles) {
    const srcFile = path.join(resolvedOutputDir, file);
    if (fs.existsSync(srcFile)) {
      fs.copyFileSync(srcFile, path.join(tempDir, file));
      filesArchived++;
    }
  }

  if (inputImagePath && fs.existsSync(inputImagePath)) {
    const inputCopy = path.join(tempDir, 'input_' + path.basename(inputImagePath));
    fs.copyFileSync(inputImagePath, inputCopy);
    filesArchived++;
  }

  try {
    const cwd = tempDir;
    execSync(`zip -r "${archivePath}" .`, { cwd, stdio: 'pipe' });
  } catch {
    const tarPath = archivePath.replace('.zip', '.tar');
    execSync(`tar -cvf "${tarPath}" -C "${tempDir}" .`, { stdio: 'pipe' });
  }

  fs.rmSync(tempDir, { recursive: true });

  return {
    archivePath,
    filesArchived,
    timestamp,
  };
}

export function clearOutputDirectories(outputDir: string): void {
  const resolvedOutputDir = path.resolve(outputDir);
  
  const subDirs = ['data', 'dashboards', 'deploy', 'docs', 'powerbi', 'analytics'];
  for (const subDir of subDirs) {
    const dirPath = path.join(resolvedOutputDir, subDir);
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        if (file !== '.gitkeep') {
          const filePath = path.join(dirPath, file);
          fs.rmSync(filePath, { recursive: true });
        }
      }
    }
  }

  const rootFiles = ['schema.json', 'schema.sql', 'schema_processed.json', 'schema_postgresql.sql', 'schema_mysql.sql', 'views.sql'];
  for (const file of rootFiles) {
    const filePath = path.join(resolvedOutputDir, file);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

function checkForOutputFiles(outputDir: string): boolean {
  const rootFiles = ['schema.json', 'schema.sql', 'schema_processed.json'];
  for (const file of rootFiles) {
    if (fs.existsSync(path.join(outputDir, file))) {
      return true;
    }
  }

  const subDirs = ['data', 'dashboards', 'deploy', 'docs', 'powerbi', 'analytics'];
  for (const subDir of subDirs) {
    const dirPath = path.join(outputDir, subDir);
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath).filter(f => f !== '.gitkeep');
      if (files.length > 0) {
        return true;
      }
    }
  }

  return false;
}

function copyDirContents(src: string, dest: string): number {
  let count = 0;
  const files = fs.readdirSync(src);
  
  for (const file of files) {
    if (file === '.gitkeep') continue;
    
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    const stat = fs.statSync(srcPath);
    
    if (stat.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      count += copyDirContents(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      count++;
    }
  }
  
  return count;
}

function formatTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
}
