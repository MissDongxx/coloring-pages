#!/usr/bin/env python3
"""
Prepare Kaggle notebook execution information
Usage: python run_notebook.py <notebook_slug> <dataset_slug>
Note: This script prepares the notebook run information. Actual execution requires manual intervention
or using the Kaggle CLI: kaggle kernels push
"""

import sys
import os
import time
import subprocess
from pathlib import Path

def main():
    if len(sys.argv) < 2:
        print("Error: Missing arguments", file=sys.stderr)
        print("Usage: python run_notebook.py <notebook_slug> <dataset_slug>", file=sys.stderr)
        sys.exit(1)

    notebook_slug = sys.argv[1]
    dataset_slug = sys.argv[2] if len(sys.argv) > 2 else None

    # Get credentials from environment
    username = os.environ.get('KAGGLE_USERNAME', '')
    key = os.environ.get('KAGGLE_KEY', '')

    if not username or not key:
        print("Error: KAGGLE_USERNAME and KAGGLE_KEY environment variables must be set", file=sys.stderr)
        sys.exit(1)

    # Create kaggle.json for authentication
    kaggle_dir = Path.home() / '.kaggle'
    kaggle_dir.mkdir(exist_ok=True)

    import json
    kaggle_json = kaggle_dir / 'kaggle.json'
    with open(kaggle_json, 'w') as f:
        json.dump({"username": username, "key": key}, f)
    os.chmod(kaggle_json, 0o600)

    try:
        # Generate a unique run ID
        run_id = f"{notebook_slug}-{int(time.time())}"

        # Kaggle notebook URL format
        notebook_url = f"https://www.kaggle.com/code/{username}/{notebook_slug}"

        # Note: Automatic notebook execution via API is deprecated
        # Users should run the notebook manually via Kaggle CLI or web interface
        # To run manually: kaggle kernels pull {username}/{notebook_slug}
        # Then: kaggle kernels push -p {notebook_folder}

        print(f"Run ID: {run_id}")
        print(f"Run URL: {notebook_url}")
        print(f"Dataset: {dataset_slug}")
        print(f"STATUS: manual_execution_required")

        # Return success with a note that manual execution is needed
        sys.exit(0)

    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
