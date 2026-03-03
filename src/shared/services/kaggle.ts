import { envConfigs } from '@/config';
import JSZip from 'jszip';
import fetch from 'node-fetch';
import crypto from 'crypto';

export class KaggleClient {
    private username: string;
    private apiKey: string;
    private authHeader: string;
    public datasetSlug: string;
    public notebookSlug: string;

    constructor() {
        this.username = envConfigs.kaggle_username;
        this.apiKey = envConfigs.kaggle_key;
        this.datasetSlug = envConfigs.kaggle_dataset_slug;
        this.notebookSlug = envConfigs.kaggle_notebook_slug;

        if (!this.username || !this.apiKey) {
            throw new Error('Kaggle credentials not configured in environment variables');
        }

        this.authHeader = 'Basic ' + Buffer.from(`${this.username}:${this.apiKey}`).toString('base64');
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
        const metadata = {
            title: this.datasetSlug.split('/')[1] || 'Coloring Pages Prompts',
            id: this.datasetSlug,
            licenses: [{ name: "CC0-1.0" }]
        };

        // Creating zip internally using JSZip since Kaggle requires zip upload
        const zip = new JSZip();
        zip.file('dataset-metadata.json', JSON.stringify(metadata, null, 2));
        zip.file('keywords.csv', csvContent);

        // Get zip stream/buffer
        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

        // Boundary for multipart form
        const boundary = `----KaggleFormBoundary${Date.now()}`;

        // Construct multipart form data body manually since native fetch FormData with Buffers can be tricky
        const crlf = '\r\n';
        let body = Buffer.from('--' + boundary + crlf);
        body = Buffer.concat([
            body,
            Buffer.from(`Content-Disposition: form-data; name="file"; filename="dataset.zip"${crlf}`),
            Buffer.from(`Content-Type: application/zip${crlf}${crlf}`),
            zipBuffer,
            Buffer.from(`${crlf}--${boundary}--${crlf}`)
        ]);

        const res = await fetch(`https://www.kaggle.com/api/v1/datasets/version/new`, {
            method: 'POST',
            headers: {
                'Authorization': this.authHeader,
                'Content-Type': `multipart/form-data; boundary=${boundary}`
            },
            body
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Failed to upload Dataset Version: ${res.statusText} - ${errorText}`);
        }

        return await res.json();
    }

    /**
   * Trigger the Notebook to run by pushing a lightweight metadata configuration.
   * This simply instructs Kaggle to run the existing kernel without overriding the code
   * (if it's already set up via the UI) OR creates a new version if code_file matches nothing.
   * Actually Kaggle `kernels/push` requires a source file if we modify it.
   */
    async triggerNotebook(): Promise<{ status: string, newUrl?: string, error?: string }> {
        if (!this.notebookSlug) {
            throw new Error('Kaggle notebook slug is missing.');
        }

        const payload = {
            id: this.notebookSlug,
            title: this.notebookSlug.split('/')[1] || "renderartist_replication",
            code_file: "script.py",
            language: "python",
            kernel_type: "script",
            is_private: true,
            enable_gpu: true,
            enable_internet: true,
            dataset_sources: [this.datasetSlug]
        };

        // Note: Kaggle requires multipart/form-data for kernels/push as well if you include code.
        // However, if we only send metadata, we need to send the metadata json and a dummy script.
        const boundary = `----KaggleFormBoundary${crypto.randomBytes(8).toString('hex')}`;
        const crlf = '\r\n';

        // We must provide a minimal dummy script to pass the kernels/push requirement, 
        // OR we rely on the user manually setting up a notebook and extracting the exact push format.
        // For pure REST, kaggle push requires: a metadata.json file and the source code file.
        let body = Buffer.from('--' + boundary + crlf);
        body = Buffer.concat([
            body,
            Buffer.from(`Content-Disposition: form-data; name="kernel-metadata.json"; filename="kernel-metadata.json"${crlf}`),
            Buffer.from(`Content-Type: application/json${crlf}${crlf}`),
            Buffer.from(JSON.stringify(payload)),
            Buffer.from(`${crlf}--${boundary}${crlf}`),
            Buffer.from(`Content-Disposition: form-data; name="script.py"; filename="script.py"${crlf}`),
            Buffer.from(`Content-Type: text/x-python${crlf}${crlf}`),
            // Here usually we push the REAL code. If it's pure trigger, we can't easily avoid pushing code.
            // But we will just try pushing the required metadata and a dummy pass if Kaggle permits 'trigger only' API calls. 
            // Unofficial trigger often uses /api/v1/kernels/push
            Buffer.from(`# Triggering notebook`),
            Buffer.from(`${crlf}--${boundary}--${crlf}`)
        ]);

        const res = await fetch(`https://www.kaggle.com/api/v1/kernels/push`, {
            method: 'POST',
            headers: {
                'Authorization': this.authHeader,
                'Content-Type': `multipart/form-data; boundary=${boundary}`
            },
            body
        });

        if (!res.ok) {
            const errorText = await res.text();
            return { status: 'error', error: `Kernel push failed: ${res.statusText} - ${errorText}` };
        }

        const data = await res.json();
        return data as { status: string, newUrl?: string, error?: string };
    }

    /**
     * Poll Notebook Status
     */
    async getNotebookStatus(): Promise<{ status: string }> {
        if (!this.notebookSlug) throw new Error('Notebook slug missing.');

        const res = await fetch(`https://www.kaggle.com/api/v1/kernels/status?kernel=${this.notebookSlug}`, {
            method: 'GET',
            headers: {
                'Authorization': this.authHeader
            }
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Failed to get kernel status: ${res.statusText} - ${errorText}`);
        }

        const data = await res.json();
        return data as { status: string };
    }

    /**
     * Start downloading output when ready. Returns the buffer of the zip file.
     */
    async getNotebookOutput(): Promise<Buffer> {
        if (!this.notebookSlug) throw new Error('Notebook slug missing.');

        const res = await fetch(`https://www.kaggle.com/api/v1/kernels/output?kernel=${this.notebookSlug}`, {
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
        return Buffer.from(arrayBuffer);
    }
}
