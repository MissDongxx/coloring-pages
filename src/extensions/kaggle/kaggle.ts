/**
 * Kaggle API provider
 * Uses Python scripts via child_process to interact with Kaggle API
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { envConfigs } from '@/config';
import type {
  KaggleConfigs,
  KaggleCSVData,
  KaggleDownloadResult,
  KaggleRunResult,
  KaggleStatusResult,
  KaggleUploadResult,
} from './types';

/**
 * Kaggle provider for interacting with Kaggle API and notebooks
 */
export class KaggleProvider {
  readonly name = 'kaggle';
  configs: KaggleConfigs;

  // Path to Python scripts directory
  private readonly scriptsPath = path.join(process.cwd(), 'scripts', 'kaggle');

  constructor(configs: KaggleConfigs) {
    this.configs = configs;
  }

  /**
   * Run a Python script and return its output
   */
  private async runPythonScript(
    scriptName: string,
    args: string[] = []
  ): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(this.scriptsPath, scriptName);

      const pythonProcess = spawn('python3', [scriptPath, ...args], {
        env: {
          ...process.env,
          KAGGLE_USERNAME: this.configs.username,
          KAGGLE_KEY: this.configs.apiKey,
        },
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (exitCode) => {
        resolve({ stdout, stderr, exitCode });
      });

      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });
    });
  }

  /**
   * Create Kaggle credentials file for Python kaggle package
   */
  async ensureCredentials(): Promise<void> {
    const kaggleDir = path.join(process.env.HOME || '', '.kaggle');
    const kaggleJsonPath = path.join(kaggleDir, 'kaggle.json');

    try {
      // Create .kaggle directory if it doesn't exist
      await fs.mkdir(kaggleDir, { recursive: true });

      // Write kaggle.json with credentials
      const credentials = {
        username: this.configs.username,
        key: this.configs.apiKey,
      };

      await fs.writeFile(
        kaggleJsonPath,
        JSON.stringify(credentials, null, 2),
        { mode: 0o600 } // Secure file permissions
      );
    } catch (error) {
      throw new Error(
        `Failed to create Kaggle credentials: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Upload CSV file to Kaggle as a dataset
   */
  async uploadCSV(csvPath: string): Promise<KaggleUploadResult> {
    try {
      await this.ensureCredentials();

      const timestamp = Date.now();
      const datasetTitle = `coloring-keywords-${timestamp}`;
      const datasetSlug = `coloring-keywords-${timestamp}`;

      const { stdout, stderr, exitCode } = await this.runPythonScript(
        'upload_dataset.py',
        [csvPath, datasetTitle, this.configs.organization || '']
      );

      if (exitCode !== 0) {
        return {
          success: false,
          error: `Upload failed: ${stderr}`,
        };
      }

      // Parse output to get dataset URL
      const datasetUrlMatch = stdout.match(/Dataset URL: (.+)/);
      const datasetUrl = datasetUrlMatch ? datasetUrlMatch[1] : '';

      return {
        success: true,
        datasetSlug,
        datasetUrl,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Execute a Kaggle notebook with the uploaded dataset
   */
  async runNotebook(datasetSlug: string): Promise<KaggleRunResult> {
    try {
      await this.ensureCredentials();

      const { stdout, stderr, exitCode } = await this.runPythonScript(
        'run_notebook.py',
        [
          this.configs.notebookSlug,
          this.configs.notebookVersion || '',
          datasetSlug,
        ]
      );

      if (exitCode !== 0) {
        return {
          success: false,
          error: `Notebook execution failed: ${stderr}`,
        };
      }

      // Parse output to get run ID and URL
      const runIdMatch = stdout.match(/Run ID: (.+)/);
      const runId = runIdMatch ? runIdMatch[1].trim() : '';

      const runUrlMatch = stdout.match(/Run URL: (.+)/);
      const runUrl = runUrlMatch ? runUrlMatch[1] : '';

      return {
        success: true,
        runId,
        runUrl,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get the status of a Kaggle notebook run
   */
  async getRunStatus(runId: string): Promise<KaggleStatusResult> {
    try {
      await this.ensureCredentials();

      const { stdout, stderr, exitCode } = await this.runPythonScript(
        'check_status.py',
        [runId]
      );

      if (exitCode !== 0) {
        return {
          status: 'failed',
          error: `Status check failed: ${stderr}`,
        };
      }

      // Parse status from output
      const statusMatch = stdout.match(/Status: (.+)/);
      const status = (statusMatch ? statusMatch[1].trim() : 'pending')
        .toLowerCase() as KaggleStatusResult['status'];

      const outputUrlMatch = stdout.match(/Output URL: (.+)/);
      const outputUrl = outputUrlMatch ? outputUrlMatch[1] : '';

      const progressMatch = stdout.match(/Progress: (\d+)/);
      const progress = progressMatch ? parseInt(progressMatch[1], 10) : 0;

      return {
        status,
        outputUrl,
        progress,
      };
    } catch (error) {
      return {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Download generated images from Kaggle notebook output
   */
  async downloadOutput(
    runId: string,
    destPath: string
  ): Promise<KaggleDownloadResult> {
    try {
      await this.ensureCredentials();

      // Create destination directory if it doesn't exist
      await fs.mkdir(destPath, { recursive: true });

      const { stdout, stderr, exitCode } = await this.runPythonScript(
        'download_output.py',
        [runId, destPath]
      );

      if (exitCode !== 0) {
        return {
          success: false,
          error: `Download failed: ${stderr}`,
        };
      }

      // Parse output to get list of downloaded files
      const images: KaggleDownloadResult['images'] = [];
      const lines = stdout.split('\n');

      for (const line of lines) {
        const match = line.match(/Downloaded: (.+) \((.+)\|(.+)\)/);
        if (match) {
          const [, filename, category, keyword] = match;
          images.push({
            filename,
            localPath: path.join(destPath, filename),
            category,
            keyword,
          });
        }
      }

      return {
        success: true,
        images,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Poll for notebook completion
   */
  async pollForCompletion(
    runId: string,
    maxAttempts = 60,
    intervalMs = 10000
  ): Promise<KaggleStatusResult> {
    for (let i = 0; i < maxAttempts; i++) {
      const result = await this.getRunStatus(runId);

      if (result.status === 'completed') {
        return result;
      }

      if (result.status === 'failed') {
        return result;
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    return {
      status: 'failed',
      error: 'Timeout: Notebook did not complete within the expected time',
    };
  }

  /**
   * Execute the full workflow: upload CSV, run notebook, wait for completion
   */
  async executeWorkflow(csvData: KaggleCSVData): Promise<{
    success: boolean;
    runId?: string;
    outputUrl?: string;
    error?: string;
  }> {
    try {
      // Step 1: Upload CSV
      const uploadResult = await this.uploadCSV(csvData.csvPath);
      if (!uploadResult.success) {
        return {
          success: false,
          error: `Upload failed: ${uploadResult.error}`,
        };
      }

      // Step 2: Run notebook
      const runResult = await this.runNotebook(uploadResult.datasetSlug!);
      if (!runResult.success) {
        return {
          success: false,
          error: `Notebook execution failed: ${runResult.error}`,
        };
      }

      // Step 3: Poll for completion
      const statusResult = await this.pollForCompletion(runResult.runId!);
      if (statusResult.status !== 'completed') {
        return {
          success: false,
          error: `Notebook did not complete: ${statusResult.error}`,
        };
      }

      return {
        success: true,
        runId: runResult.runId,
        outputUrl: statusResult.outputUrl,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Create Kaggle provider with configs
 */
export function createKaggleProvider(configs: KaggleConfigs): KaggleProvider {
  return new KaggleProvider(configs);
}
