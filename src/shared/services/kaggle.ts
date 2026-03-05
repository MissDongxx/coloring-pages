import { envConfigs } from '@/config';
import fetch from 'node-fetch';
import crypto from 'crypto';
import { exec } from 'child_process';
import util from 'util';
import fs from 'fs/promises';
import path from 'path';

const execPromise = util.promisify(exec);

// Minimum time (ms) after push before trusting a "complete" status.
// This prevents stale "complete" from a previous kernel version being
// mistaken for the newly-pushed version's completion.
const MIN_RUNNING_TIME_MS = 5 * 60 * 1000; // 5 minutes

export class KaggleClient {
    private username: string;
    private apiKey: string;
    private authHeader: string;
    public datasetSlug: string;
    public notebookSlug: string;
    private kaggleCliPath: string | null = null;
    private lastPushTimestamp: number = 0;

    constructor() {
        // Read from environment variables via envConfigs
        this.username = envConfigs.kaggle_username;
        this.apiKey = envConfigs.kaggle_key;
        this.datasetSlug = envConfigs.kaggle_dataset_slug;
        this.notebookSlug = envConfigs.kaggle_notebook_slug;

        // Debug: Log credential info (without exposing the full key)
        console.log(`KaggleClient initialized with:`, {
            username: this.username,
            apiKeyLength: this.apiKey?.length || 0,
            apiKeyPrefix: this.apiKey?.substring(0, 10) || 'NONE',
            datasetSlug: this.datasetSlug,
            notebookSlug: this.notebookSlug,
            source: 'envConfigs (process.env)',
            rawEnvKey: process.env.KAGGLE_KEY?.substring(0, 10) || 'NONE'
        });

        if (!this.username || !this.apiKey) {
            throw new Error('Kaggle credentials not configured');
        }

        this.authHeader = 'Basic ' + Buffer.from(`${this.username}:${this.apiKey}`).toString('base64');
    }

    /**
     * Find kaggle CLI path dynamically (cached)
     * Tries: 1) Environment variable KAGGLE_CLI_PATH
     *        2) 'which kaggle' on Unix
     *        3) 'where kaggle' on Windows
     */
    private async findKaggleCli(): Promise<string | null> {
        // Return cached value if available
        if (this.kaggleCliPath) {
            return this.kaggleCliPath;
        }

        // 1. Check environment variable first
        if (process.env.KAGGLE_CLI_PATH) {
            this.kaggleCliPath = process.env.KAGGLE_CLI_PATH;
            return this.kaggleCliPath;
        }

        // 2. Try which/where command
        try {
            const isWindows = process.platform === 'win32';
            const command = isWindows ? 'where kaggle' : 'which kaggle';
            const { stdout } = await execPromise(command);
            const path = stdout.trim();
            if (path) {
                this.kaggleCliPath = path;
                return this.kaggleCliPath;
            }
        } catch {
            // Command failed, continue
        }

        // 3. Return null if not found
        return null;
    }

    /**
     * Get kaggle CLI path, throws error if not found
     */
    private async getKaggleCli(): Promise<string> {
        const cliPath = await this.findKaggleCli();
        if (!cliPath) {
            throw new Error('Kaggle CLI not found. Please install it or set KAGGLE_CLI_PATH environment variable.');
        }
        return cliPath;
    }

    /**
     * Get current dataset version number
     */
    private async getDatasetVersion(): Promise<number> {
        try {
            const res = await fetch(`https://www.kaggle.com/api/v1/datasets/view/${this.datasetSlug}`, {
                method: 'GET',
                headers: {
                    'Authorization': this.authHeader
                }
            });
            if (!res.ok) return 0;
            const data = await res.json() as { currentVersionNumber?: number };
            return data.currentVersionNumber || 0;
        } catch {
            return 0;
        }
    }

    /**
     * Check if a dataset exists on Kaggle
     */
    private async datasetExists(): Promise<boolean> {
        try {
            const res = await fetch(`https://www.kaggle.com/api/v1/datasets/view/${this.datasetSlug}`, {
                method: 'GET',
                headers: {
                    'Authorization': this.authHeader
                }
            });
            return res.ok;
        } catch {
            return false;
        }
    }

    /**
     * Upload keywords.csv to your Kaggle Dataset as a new version.
     * Dataset must already exist.
     * @param csvContent Content of keywords.csv
     */
    async uploadKeywordsDataset(csvContent: string): Promise<any> {
        if (!this.datasetSlug) {
            throw new Error('Kaggle dataset slug is missing.');
        }

        // Dataset API requires standard dataset-metadata.json
        // Kaggle strictly enforces lowercase IDs
        const normalizedSlug = this.datasetSlug.toLowerCase();
        const metadata = {
            title: this.datasetSlug.split('/')[1] || 'ColoringPagesDataset',
            id: normalizedSlug,
            licenses: [{ name: "CC0-1.0" }]
        };

        // Create a temporary folder to act as the dataset root for Kaggle CLI
        const tempDir = path.join(process.cwd(), '.tmp_kaggle_' + crypto.randomBytes(4).toString('hex'));
        const tempConfigDir = path.join(process.cwd(), '.tmp_kaggle_config_' + crypto.randomBytes(4).toString('hex'));
        await fs.mkdir(tempDir, { recursive: true });
        await fs.mkdir(tempConfigDir, { recursive: true });

        try {
            // Generate kaggle.json FIRST (before any other operations)
            const kaggleJson = {
                username: this.username,
                key: this.apiKey
            };
            const kaggleJsonPath = path.join(tempConfigDir, 'kaggle.json');
            await fs.writeFile(kaggleJsonPath, JSON.stringify(kaggleJson, null, 2), { mode: 0o600 });

            // Write dataset files
            await fs.writeFile(path.join(tempDir, 'dataset-metadata.json'), JSON.stringify(metadata, null, 2));
            await fs.writeFile(path.join(tempDir, 'keywords.csv'), csvContent);

            // Debug: Log the CSV content
            console.log(`CSV content preview: ${csvContent.substring(0, 200)}...`);
            console.log(`CSV content length: ${csvContent.length} bytes`);
            console.log(`Temp directory: ${tempDir}`);
            console.log(`Config directory: ${tempConfigDir}`);

            // Verify ALL files were created (including kaggle.json)
            const metaExists = await fs.access(path.join(tempDir, 'dataset-metadata.json')).then(() => true).catch(() => false);
            const csvExists = await fs.access(path.join(tempDir, 'keywords.csv')).then(() => true).catch(() => false);
            const configExists = await fs.access(kaggleJsonPath).then(() => true).catch(() => false);
            console.log(`Files exist - meta: ${metaExists}, csv: ${csvExists}, config: ${configExists}`);

            // Also verify kaggle.json content
            const kaggleJsonContent = await fs.readFile(kaggleJsonPath, 'utf-8');
            const parsedJson = JSON.parse(kaggleJsonContent);
            console.log(`kaggle.json content:`, {
                username: parsedJson.username,
                keyLength: parsedJson.key?.length || 0,
                keyPrefix: parsedJson.key?.substring(0, 10) || 'NONE'
            });

            // Env config for Kaggle CLI to authenticate
            const env = {
                ...process.env,
                KAGGLE_CONFIG_DIR: tempConfigDir, // Force CLI to look here for kaggle.json
                KAGGLE_USERNAME: this.username,
                KAGGLE_KEY: this.apiKey
            };

            console.log(`Environment variables set:`, {
                KAGGLE_CONFIG_DIR: env.KAGGLE_CONFIG_DIR,
                KAGGLE_USERNAME: env.KAGGLE_USERNAME ? '***' : 'MISSING',
                KAGGLE_KEY: env.KAGGLE_KEY ? '***' : 'MISSING'
            });

            const kaggleCliPath = await this.getKaggleCli();

            // If dataset doesn't exist at all on the portal side, we must create it first.
            // Try version update first
            const datasetExistsBefore = await this.datasetExists();
            console.log(`Dataset ${this.datasetSlug} exists before upload: ${datasetExistsBefore}`);

            if (datasetExistsBefore) {
                // Get version before upload
                const versionBefore = await this.getDatasetVersion();
                console.log(`Dataset version before upload: ${versionBefore}`);

                try {
                    const { stdout, stderr } = await execPromise(`${kaggleCliPath} datasets version -p "${tempDir}" -m "Auto update keywords via API" -r zip`, { env });
                    console.log("Kaggle CLI update success:", stdout);
                    return { status: "success", type: "version" };
                } catch (updateError: any) {
                    // Log the full error details
                    console.error("Kaggle CLI update error details:", {
                        stdout: updateError.stdout,
                        stderr: updateError.stderr,
                        message: updateError.message
                    });
                    // Wait a moment for Kaggle to process
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    // Check if version was incremented (Kaggle API bug - returns 500 but succeeds)
                    const versionAfter = await this.getDatasetVersion();
                    console.log(`Dataset version after upload: ${versionAfter} (was ${versionBefore})`);

                    if (versionAfter > versionBefore) {
                        console.log("Kaggle CLI update succeeded despite error - version incremented");
                        return { status: "success", type: "version" };
                    }

                    // Also check output for success indicators
                    const output = (updateError.stdout || '') + (updateError.stderr || '');
                    if (output.includes('Upload successful') || output.includes('being created')) {
                        console.log("Kaggle CLI update succeeded despite error:", output);
                        return { status: "success", type: "version" };
                    }
                    console.log("Kaggle CLI update failed, attempting create:", updateError.stderr || updateError.message);
                }
            }

            // Try create
            try {
                const { stdout } = await execPromise(`${kaggleCliPath} datasets create -p "${tempDir}" -r zip`, { env });
                console.log("Kaggle CLI create success:", stdout);
                return { status: "success", type: "create" };
            } catch (createError: any) {
                // Check if it actually succeeded despite the error (Kaggle CLI bug)
                const output = (createError.stdout || '') + (createError.stderr || '');
                if (output.includes('Upload successful') || output.includes('being created')) {
                    console.log("Kaggle CLI create succeeded despite error:", output);
                    return { status: "success", type: "create" };
                }
                throw new Error(`Kaggle CLI create failed: ${createError.stderr || createError.message}`);
            }
        } finally {
            // Cleanup temp
            const rm = fs.rm || fs.rmdir; // node 14+ compatibility
            await rm(tempDir, { recursive: true, force: true } as any);
            await rm(tempConfigDir, { recursive: true, force: true } as any);
        }
    }

    /**
     * Trigger the Notebook to run using Kaggle CLI or REST API
     * For new format notebooks, we need to use REST API to trigger a re-run
     */
    async triggerNotebook(): Promise<{ status: string, newUrl?: string, error?: string }> {
        if (!this.notebookSlug) {
            throw new Error('Kaggle notebook slug is missing.');
        }

        // First, try to detect if this is a new format notebook by pulling and checking metadata
        const kaggleCliPath = await this.getKaggleCli();
        const pullDir = path.join(process.cwd(), '.tmp_kernel_pull_' + crypto.randomBytes(4).toString('hex'));
        const tempConfigDir = path.join(process.cwd(), '.tmp_kaggle_config_' + crypto.randomBytes(4).toString('hex'));
        await fs.mkdir(pullDir, { recursive: true });
        await fs.mkdir(tempConfigDir, { recursive: true });

        try {
            // Generate kaggle.json for authentication
            const kaggleJson = {
                username: this.username,
                key: this.apiKey
            };
            await fs.writeFile(path.join(tempConfigDir, 'kaggle.json'), JSON.stringify(kaggleJson, null, 2), { mode: 0o600 });

            const env = {
                ...process.env,
                KAGGLE_CONFIG_DIR: tempConfigDir,
                KAGGLE_USERNAME: this.username,
                KAGGLE_KEY: this.apiKey
            };

            // Step 1: Pull the existing notebook to check its format
            console.log(`Pulling existing notebook ${this.notebookSlug}...`);
            try {
                await execPromise(`${kaggleCliPath} kernels pull ${this.notebookSlug} -p "${pullDir}"`, { env });
                console.log("Notebook pulled successfully");
            } catch (pullError: any) {
                console.error("Failed to pull notebook:", pullError.stderr || pullError.message);
                return { status: 'error', error: `Failed to pull notebook: ${pullError.stderr || pullError.message}` };
            }

            // Step 2: Check the notebook metadata to detect format
            const notebookFileName = this.notebookSlug.split('/')[1] + '.ipynb';
            const notebookContent = await fs.readFile(path.join(pullDir, notebookFileName), 'utf-8');
            const notebookJson = JSON.parse(notebookContent);
            const isNotebookFormat = notebookJson.metadata?.kaggle?.sourceType === 'notebook';

            console.log(`Notebook format detected: ${isNotebookFormat ? 'NEW (notebook)' : 'OLD (kernel)'}`);

            if (isNotebookFormat) {
                // New format notebook - use REST API to trigger re-run
                console.log("Using REST API to trigger new format notebook...");

                try {
                    // Get the current notebook details

                    // Make a tiny change (add a comment) to trigger a new version
                    // Then immediately revert it
                    const notebookUrl = `https://www.kaggle.com/api/v1/notebooks/${this.username}/${this.notebookSlug.split('/')[1]}`;

                    // Get current notebook details
                    const getRes = await fetch(notebookUrl, {
                        headers: { 'Authorization': this.authHeader }
                    });

                    if (!getRes.ok) {
                        throw new Error(`Failed to get notebook: ${getRes.statusText}`);
                    }

                    const notebookData = await getRes.json() as any;

                    // Update with a timestamp comment to trigger a new run
                    const timestamp = Date.now();
                    const updatedCells = [...notebookJson.cells];
                    // Add a temporary comment cell that will be removed immediately
                    updatedCells.unshift({
                        cell_type: 'markdown',
                        source: `<!-- Trigger run at ${timestamp} -->`,
                        metadata: {}
                    });

                    const updatedNotebook = {
                        ...notebookJson,
                        cells: updatedCells
                    };

                    // Push the update
                    const updateRes = await fetch(notebookUrl, {
                        method: 'POST',
                        headers: {
                            'Authorization': this.authHeader,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            notebook: {
                                ...notebookData,
                                body: JSON.stringify(updatedNotebook)
                            }
                        })
                    });

                    if (updateRes.ok) {
                        console.log("Notebook triggered successfully via REST API");
                        return { status: 'success' };
                    }

                    // If POST fails, try alternative approach
                    console.log("REST API approach failed, trying alternative...");

                } catch (apiError: any) {
                    console.log("REST API trigger failed:", apiError.message);
                }

                // Fallback: Try the old CLI push method anyway
                // Sometimes it works even for new format notebooks
            }

            // Step 3: Create kernel-metadata.json for the notebook
            const kernelMetadata = {
                id: this.notebookSlug,
                title: this.notebookSlug.split('/')[1] || "renderartist-replication",
                code_file: notebookFileName,
                language: "python",
                kernel_type: "notebook",
                is_private: true,
                enable_gpu: true,
                enable_internet: true,
                dataset_sources: [this.datasetSlug]
            };

            const metadataPath = path.join(pullDir, 'kernel-metadata.json');
            await fs.writeFile(metadataPath, JSON.stringify(kernelMetadata, null, 2));
            console.log("Created kernel-metadata.json");

            // Step 4: Try CLI push (works for old format, may fail for new format)
            console.log(`Attempting to push notebook via CLI...`);
            try {
                const { stdout, stderr } = await execPromise(`${kaggleCliPath} kernels push -p "${pullDir}"`, { env });
                console.log("Kaggle kernel push output:", stdout || stderr);

                // Check for success indicators
                const output = (stdout || '') + (stderr || '');
                if (output.includes('success') || output.includes('completed') || output.includes('has been') || output.includes('Your version')) {
                    console.log("Kaggle kernel push succeeded");
                    // Record the push timestamp so status polling can avoid stale "complete"
                    this.lastPushTimestamp = Date.now();
                    return { status: 'success' };
                }
            } catch (pushError: any) {
                const output = (pushError.stdout || '') + (pushError.stderr || '');
                console.log("CLI push failed (expected for new format notebooks):", output.substring(0, 200));
            }

            // If CLI push fails for new format notebook, it's not a critical error
            // The notebook will still run when dataset is updated
            if (isNotebookFormat) {
                console.log("New format notebook detected - CLI push not supported");
                console.log("The notebook should run automatically when you manually click 'Save & Run All' on Kaggle");
                console.log(`Notebook URL: https://www.kaggle.com/code/${this.notebookSlug}`);
                return {
                    status: 'success',
                    newUrl: `https://www.kaggle.com/code/${this.notebookSlug}`
                };
            }

            return { status: 'error', error: 'Failed to trigger notebook run' };

        } finally {
            // Cleanup temp
            const rm = fs.rm || fs.rmdir;
            await rm(pullDir, { recursive: true, force: true } as any);
            await rm(tempConfigDir, { recursive: true, force: true } as any);
        }
    }

    /**
     * Poll Notebook Status using Kaggle CLI
     */
    /**
     * Try to download kernel output and check if real image files exist.
     * Returns true if valid output is available, false otherwise.
     */
    private async verifyOutputAvailable(): Promise<boolean> {
        const cliPath = await this.findKaggleCli();
        if (!cliPath) return false;

        const tempDir = path.join(process.cwd(), '.tmp_kaggle_verify_' + crypto.randomBytes(4).toString('hex'));
        const tempConfigDir = path.join(process.cwd(), '.tmp_kaggle_config_' + crypto.randomBytes(4).toString('hex'));
        await fs.mkdir(tempDir, { recursive: true });
        await fs.mkdir(tempConfigDir, { recursive: true });

        try {
            await fs.writeFile(
                path.join(tempConfigDir, 'kaggle.json'),
                JSON.stringify({ username: this.username, key: this.apiKey }, null, 2),
                { mode: 0o600 }
            );

            const env = {
                ...process.env,
                KAGGLE_CONFIG_DIR: tempConfigDir,
                KAGGLE_USERNAME: this.username,
                KAGGLE_KEY: this.apiKey
            };

            const { stdout, stderr } = await execPromise(`"${cliPath}" kernels output ${this.notebookSlug} -p "${tempDir}"`, { env });
            console.log('Verify output download:', stdout || stderr);

            // Recursively find image files (Kaggle may put them in subdirectories like final_output/)
            const findImages = async (dir: string): Promise<{ name: string; size: number }[]> => {
                const entries = await fs.readdir(dir, { withFileTypes: true });
                const results: { name: string; size: number }[] = [];
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    if (entry.isDirectory()) {
                        results.push(...await findImages(fullPath));
                    } else if (/\.(png|jpe?g|webp|zip)$/i.test(entry.name)) {
                        const stats = await fs.stat(fullPath);
                        results.push({ name: entry.name, size: stats.size });
                    }
                }
                return results;
            };

            const imageFiles = await findImages(tempDir);
            console.log(`Output verification: found ${imageFiles.length} image files`, imageFiles.map(f => `${f.name} (${f.size}B)`));

            // Verify at least one file has real content (> 1KB)
            const validFile = imageFiles.find(f => f.size > 1024);
            if (validFile) {
                console.log(`Verified real output exists: ${validFile.name} (${validFile.size} bytes)`);
                return true;
            }

            console.log(`Output verification failed: ${imageFiles.length} image files found, but none > 1KB`);
            return false;
        } catch (e: any) {
            console.log(`Output verification failed: ${e.message}`);
            return false;
        } finally {
            const rm = fs.rm || fs.rmdir;
            await rm(tempDir, { recursive: true, force: true } as any);
            await rm(tempConfigDir, { recursive: true, force: true } as any);
        }
    }

    /**
     * Poll Notebook Status using Kaggle CLI
     * Uses a two-layer guard against stale "complete" from previous versions:
     *   1. Minimum running time — won't trust "complete" within MIN_RUNNING_TIME_MS of push
     *   2. Output validation — after the guard period, verifies real output files exist
     */
    async getNotebookStatus(): Promise<{ status: string }> {
        if (!this.notebookSlug) throw new Error('Notebook slug missing.');

        const kaggleCliPath = await this.getKaggleCli();

        // Create temp config dir for authentication
        const tempConfigDir = path.join(process.cwd(), '.tmp_kaggle_config_' + crypto.randomBytes(4).toString('hex'));
        await fs.mkdir(tempConfigDir, { recursive: true });

        try {
            const kaggleJson = {
                username: this.username,
                key: this.apiKey
            };
            await fs.writeFile(path.join(tempConfigDir, 'kaggle.json'), JSON.stringify(kaggleJson, null, 2), { mode: 0o600 });

            const env = {
                ...process.env,
                KAGGLE_CONFIG_DIR: tempConfigDir,
                KAGGLE_USERNAME: this.username,
                KAGGLE_KEY: this.apiKey
            };

            // Strategy: Use kaggle kernels status to check the actual running state
            // This is more accurate than using pull, which returns the last completed version
            try {
                const { stdout, stderr } = await execPromise(`${kaggleCliPath} kernels status ${this.notebookSlug}`, { env });
                const output = (stdout || '') + (stderr || '');
                console.log(`Kaggle kernel status output: ${output}`);

                // Parse the status output — use lowercase to handle Kaggle's
                // KernelWorkerStatus.RUNNING / COMPLETE / etc. (uppercase) format
                const outputLower = output.toLowerCase();
                if (outputLower.includes('running')) {
                    return { status: 'running' };
                } else if (outputLower.includes('queued') || outputLower.includes('scheduled')) {
                    return { status: 'queued' };
                } else if (outputLower.includes('complete') || outputLower.includes('finished')) {
                    // === Guard Layer 1: Minimum running time ===
                    const elapsed = Date.now() - this.lastPushTimestamp;
                    if (this.lastPushTimestamp > 0 && elapsed < MIN_RUNNING_TIME_MS) {
                        const remainingSec = Math.round((MIN_RUNNING_TIME_MS - elapsed) / 1000);
                        console.log(`Kernel reports "complete" but only ${Math.round(elapsed / 1000)}s since push (min ${MIN_RUNNING_TIME_MS / 1000}s). Treating as still running (${remainingSec}s remaining).`);
                        return { status: 'running' };
                    }

                    // === Guard Layer 2: Verify output actually exists ===
                    console.log('Kernel reports "complete" — verifying output files...');
                    const hasOutput = await this.verifyOutputAvailable();
                    if (!hasOutput) {
                        console.log('No valid output found despite "complete" status. Kernel likely still running (stale status from previous version).');
                        return { status: 'running' };
                    }

                    console.log('Output verified — kernel truly complete.');
                    return { status: 'complete' };
                } else if (outputLower.includes('error') || outputLower.includes('failed') || outputLower.includes('killed')) {
                    return { status: 'error' };
                }

                // If we can't determine from status, try to pull as a fallback
                const pullDir = path.join(tempConfigDir, 'test_pull');
                await fs.mkdir(pullDir, { recursive: true });

                // Attempt to pull the kernel to see if there's a completed version
                await execPromise(`${kaggleCliPath} kernels pull ${this.notebookSlug} -p "${pullDir}"`, { env });

                // If pull succeeds, it means there is a completed version
                return { status: 'complete' };
            } catch (statusError: any) {
                const output = (statusError.stdout || '') + (statusError.stderr || '') + (statusError.message || '');
                console.log(`Kaggle kernel status check failed: ${output}`);

                if (output.includes('404') || output.includes('Not Found')) {
                    throw new Error(`Kernel not found: ${this.notebookSlug}`);
                }

                // Check if this is an SSL/connection error
                const isSSLError = output.includes('SSLEOFError') ||
                                  output.includes('SSL') ||
                                  output.includes('EOF') ||
                                  output.includes('ECONNRESET') ||
                                  output.includes('Connection') ||
                                  output.includes('timeout') ||
                                  output.includes('Timed out');

                if (isSSLError) {
                    console.log('SSL/Connection error detected. Attempting output verification as fallback...');

                    // Check if enough time has passed since push to consider checking output
                    const elapsed = Date.now() - this.lastPushTimestamp;
                    if (this.lastPushTimestamp > 0 && elapsed >= MIN_RUNNING_TIME_MS) {
                        const hasOutput = await this.verifyOutputAvailable();
                        if (hasOutput) {
                            console.log('Output verification succeeded despite status check failures. Treating as complete.');
                            return { status: 'complete' };
                        } else {
                            console.log('Output verification failed. Assuming kernel is still running.');
                        }
                    } else {
                        const remainingSec = Math.round((MIN_RUNNING_TIME_MS - elapsed) / 1000);
                        console.log(`Not enough time elapsed since push (${Math.round(elapsed / 1000)}s, min ${MIN_RUNNING_TIME_MS / 1000}s). Assuming still running (${remainingSec}s remaining).`);
                    }
                }

                // Default to running if we can't determine status
                return { status: 'running' };
            }
        } finally {
            const rm = fs.rm || fs.rmdir;
            await rm(tempConfigDir, { recursive: true, force: true } as any);
        }
    }

    /**
     * Start downloading output when ready. Returns the buffer of the zip file.
     * First tries Kaggle CLI, falls back to REST API.
     */
    async getNotebookOutput(): Promise<Buffer> {
        if (!this.notebookSlug) throw new Error('Notebook slug missing.');

        // Extract username and kernel name from slug
        const [username, kernelName] = this.notebookSlug.split('/');

        // Method 1: Try Kaggle CLI if available
        const cliPath = await this.findKaggleCli();
        if (cliPath) {
            const tempDir = path.join(process.cwd(), '.tmp_kaggle_output_' + crypto.randomBytes(4).toString('hex'));
            const tempConfigDir = path.join(process.cwd(), '.tmp_kaggle_config_' + crypto.randomBytes(4).toString('hex'));
            await fs.mkdir(tempDir, { recursive: true });
            await fs.mkdir(tempConfigDir, { recursive: true });

            try {
                // Generate kaggle.json for authentication
                const kaggleJson = {
                    username: this.username,
                    key: this.apiKey
                };
                await fs.writeFile(path.join(tempConfigDir, 'kaggle.json'), JSON.stringify(kaggleJson, null, 2), { mode: 0o600 });

                const env = {
                    ...process.env,
                    KAGGLE_CONFIG_DIR: tempConfigDir,
                    KAGGLE_USERNAME: this.username,
                    KAGGLE_KEY: this.apiKey
                };

                // Download output using CLI
                // -p specifies the directory, files will be downloaded with original names
                const { stdout, stderr } = await execPromise(`"${cliPath}" kernels output ${this.notebookSlug} -p "${tempDir}"`, { env });
                console.log('Kaggle CLI output download:', stdout || stderr);

                // List all downloaded files for debugging
                const files = await fs.readdir(tempDir);
                console.log('Downloaded files:', files);

                if (files.length === 0) {
                    throw new Error('No output files found from Kaggle kernel. The kernel may have failed or produced no output.');
                }

                // Check file sizes
                for (const file of files) {
                    const filePath = path.join(tempDir, file);
                    const stats = await fs.stat(filePath);
                    console.log(`File: ${file}, size: ${stats.size} bytes`);
                }

                // Kaggle CLI downloads unzipped files, so we need to zip them
                // First, check if there's a zip file (some kernels might output zip directly)
                const zipFile = files.find(f => f.endsWith('.zip'));

                if (zipFile) {
                    // If zip file exists, read it directly
                    const buffer = await fs.readFile(path.join(tempDir, zipFile));
                    return buffer;
                } else {
                    // Otherwise, create a zip from the downloaded files using adm-zip
                    const AdmZip = require('adm-zip');
                    const zip = new AdmZip();
                    const fsPromises = require('fs').promises;

                    // Add all files to the zip
                    const addFiles = async (dir: string, basePrefix = '') => {
                        const entries = await fsPromises.readdir(dir, { withFileTypes: true });
                        for (const entry of entries) {
                            const fullPath = path.join(dir, entry.name);
                            if (entry.isDirectory()) {
                                await addFiles(fullPath, basePrefix + entry.name + '/');
                            } else {
                                zip.addLocalFile(fullPath, basePrefix);
                            }
                        }
                    };

                    await addFiles(tempDir);
                    const zipBuffer = zip.toBuffer();
                    console.log(`Created zip buffer, size: ${zipBuffer.length} bytes`);
                    return zipBuffer;
                }
            } catch (cliError: any) {
                console.log('CLI download failed, trying REST API:', cliError.message);
            } finally {
                // Cleanup temp
                const rm = fs.rm || fs.rmdir;
                await rm(tempDir, { recursive: true, force: true } as any);
                await rm(tempConfigDir, { recursive: true, force: true } as any);
            }
        }

        // Method 2: Fall back to REST API with correct parameters
        // Use the correct API format: /api/v1/kernels/output?username=...&kernelSlug=...
        const apiUrl = `https://www.kaggle.com/api/v1/kernels/output?username=${username}&kernelSlug=${kernelName}`;
        const res = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': this.authHeader
            }
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Failed to get kernel output: ${res.statusText} - ${errorText}`);
        }

        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Validate that the response is actually a zip file
        // ZIP files start with "PK" (0x50 0x4B) magic number
        if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4B) {
            // Not a zip file - log the first 200 bytes for debugging
            const preview = buffer.toString('utf-8', 0, Math.min(200, buffer.length));
            console.error(`Invalid zip format received from Kaggle API. First 200 bytes:`, preview);

            // Check if it's an HTML error page
            if (preview.includes('<!DOCTYPE') || preview.includes('<html') || preview.includes('<HTML')) {
                throw new Error('Kaggle API returned an HTML error page instead of a zip file. The kernel output may not be ready or the API endpoint is incorrect.');
            }

            // Check if it's a JSON error
            if (preview.startsWith('{') || preview.startsWith('[')) {
                try {
                    const jsonError = JSON.parse(preview);
                    throw new Error(`Kaggle API returned a JSON error response: ${JSON.stringify(jsonError)}`);
                } catch {
                    throw new Error(`Kaggle API returned invalid content (not a zip file). Response preview: ${preview}`);
                }
            }

            throw new Error(`Kaggle API returned invalid content (not a zip file). Response starts with: ${preview.substring(0, 50)}`);
        }

        return buffer;
    }
}
