#!/usr/bin/env python3
"""
Upload CSV file to Kaggle as a dataset
Usage: python upload_dataset.py <csv_path> <dataset_title>
"""

import sys
import os
import json
import tempfile
import shutil
import subprocess
from pathlib import Path

def main():
    if len(sys.argv) < 3:
        print("Error: Missing arguments", file=sys.stderr)
        print("Usage: python upload_dataset.py <csv_path> <dataset_title>", file=sys.stderr)
        sys.exit(1)

    csv_path = sys.argv[1]
    dataset_title = sys.argv[2]

    # Get credentials from environment
    username = os.environ.get('KAGGLE_USERNAME', '')
    key = os.environ.get('KAGGLE_KEY', '')

    if not username or not key:
        print("Error: KAGGLE_USERNAME and KAGGLE_KEY environment variables must be set", file=sys.stderr)
        sys.exit(1)

    # Create a unique dataset slug from title
    dataset_slug = dataset_title.lower().replace(' ', '-').replace('_', '-')[:50]

    try:
        # Create kaggle.json for authentication
        kaggle_dir = Path.home() / '.kaggle'
        kaggle_dir.mkdir(exist_ok=True)

        kaggle_json = kaggle_dir / 'kaggle.json'
        with open(kaggle_json, 'w') as f:
            json.dump({"username": username, "key": key}, f)
        os.chmod(kaggle_json, 0o600)

        # Create folder structure for dataset
        temp_dir = tempfile.mkdtemp()
        dataset_folder = os.path.join(temp_dir, dataset_slug)
        os.makedirs(dataset_folder, exist_ok=True)

        # Copy CSV to dataset folder
        shutil.copy(csv_path, os.path.join(dataset_folder, 'my-keywords.csv'))

        # Create dataset metadata
        metadata = {
            "title": dataset_title,
            "id": f"{username}/{dataset_slug}",
            "licenses": [{"name": "CC0-1.0"}]
        }

        with open(os.path.join(dataset_folder, 'dataset-metadata.json'), 'w') as f:
            json.dump(metadata, f)

        # Use kaggle CLI to create dataset
        result = subprocess.run(
            ['kaggle', 'datasets', 'create', '-f', dataset_folder],
            capture_output=True,
            text=True
        )

        # Clean up
        shutil.rmtree(temp_dir)

        if result.returncode != 0:
            # Try alternative method using API directly
            print(f"Warning: CLI method failed, trying API...", file=sys.stderr)
            from kaggle.api.kaggle_api_extended import KaggleApi
            api = KaggleApi()
            api.authenticate()

            # Re-create for API method
            temp_dir = tempfile.mkdtemp()
            dataset_folder = os.path.join(temp_dir, dataset_slug)
            os.makedirs(dataset_folder, exist_ok=True)
            shutil.copy(csv_path, os.path.join(dataset_folder, 'my-keywords.csv'))

            with open(os.path.join(dataset_folder, 'dataset-metadata.json'), 'w') as f:
                json.dump(metadata, f)

            api.dataset_create_new(folder=dataset_folder, public=False, quiet=False)
            shutil.rmtree(temp_dir)

        dataset_url = f"https://www.kaggle.com/datasets/{username}/{dataset_slug}"
        print(f"Dataset URL: {dataset_url}")
        print(f"Dataset slug: {username}/{dataset_slug}")

    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
