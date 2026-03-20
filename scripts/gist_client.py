#!/usr/bin/env python3
"""
GitHub Gist client for storing and retrieving keywords.csv
"""

import os
import requests
import csv
import json
from io import StringIO


class GistClient:
    """Client for interacting with GitHub Gist API"""

    def __init__(self, gist_id=None, token=None):
        """
        Initialize Gist client

        Args:
            gist_id: Gist ID (can be set via GIST_ID env var)
            token: GitHub personal access token (can be set via GIST_COLORING_TOKEN env var)
        """
        self.gist_id = gist_id or os.getenv('GIST_ID')
        self.token = token or os.getenv('GIST_COLORING_TOKEN')

        if not self.gist_id:
            raise ValueError("GIST_ID is required. Set it via environment variable or pass as argument.")

        if not self.token:
            raise ValueError("GIST_COLORING_TOKEN is required. Set it via environment variable or pass as argument.")

        self.api_base = "https://api.github.com"
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/vnd.github.v3+json",
            "X-GitHub-Api-Version": "2022-11-28"
        }

    def get_gist(self):
        """Fetch gist details"""
        url = f"{self.api_base}/gists/{self.gist_id}"
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()
        return response.json()

    def get_keywords_csv(self):
        """
        Fetch keywords.csv from gist

        Returns:
            list: List of keyword dictionaries
        """
        try:
            gist = self.get_gist()
            files = gist.get('files', {})

            # Look for keywords.csv file
            csv_content = None
            for filename, file_info in files.items():
                if filename.lower() == 'keywords.csv':
                    csv_content = file_info.get('content')
                    break

            if not csv_content:
                print(f"[GistClient] No keywords.csv found in gist {self.gist_id}")
                print(f"[GistClient] Available files: {list(files.keys())}")
                return []

            # Parse CSV content
            keywords = []
            reader = csv.DictReader(StringIO(csv_content))
            for row in reader:
                keywords.append({
                    'root_keyword': row.get('root-keyword', ''),
                    'root_num': int(row.get('root-num', 0)),
                    'keyword_raw': row.get('keyword-raw', ''),
                    'keyword': row.get('keyword', ''),
                    'index': int(row.get('index', 0)),
                    'created': int(row.get('created', 0))
                })

            print(f"[GistClient] Successfully loaded {len(keywords)} keywords from gist")
            return keywords

        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 404:
                print(f"[GistClient] Gist {self.gist_id} not found")
            else:
                print(f"[GistClient] HTTP Error: {e}")
            return []
        except Exception as e:
            print(f"[GistClient] Error fetching keywords: {e}")
            return []

    def update_keywords_csv(self, keywords):
        """
        Update keywords.csv in gist

        Args:
            keywords: List of keyword dictionaries

        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Convert keywords to CSV
            output = StringIO()
            fieldnames = ['root-keyword', 'root-num', 'keyword-raw', 'keyword', 'index', 'created']
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()

            for kw in keywords:
                writer.writerow({
                    'root-keyword': kw.get('root_keyword', ''),
                    'root-num': kw.get('root_num', 0),
                    'keyword-raw': kw.get('keyword_raw', ''),
                    'keyword': kw.get('keyword', ''),
                    'index': kw.get('index', 0),
                    'created': kw.get('created', 0)
                })

            csv_content = output.getvalue()

            # Get current gist to check if file exists
            gist = self.get_gist()
            files = gist.get('files', {})

            # Prepare update payload
            files_payload = {}

            # Update keywords.csv (or create it)
            files_payload['keywords.csv'] = {
                'content': csv_content
            }

            # Keep other files unchanged
            for filename, file_info in files.items():
                if filename.lower() != 'keywords.csv':
                    files_payload[filename] = {
                        'content': file_info.get('content', ''),
                        'filename': filename
                    }

            # Update gist
            url = f"{self.api_base}/gists/{self.gist_id}"
            payload = {
                'files': files_payload,
                'description': 'Coloring pages keywords - auto-updated'
            }

            response = requests.patch(url, headers=self.headers, json=payload)
            response.raise_for_status()

            print(f"[GistClient] Successfully updated {len(keywords)} keywords in gist")
            return True

        except requests.exceptions.HTTPError as e:
            print(f"[GistClient] HTTP Error updating gist: {e}")
            print(f"[GistClient] Response: {e.response.text if e.response else 'No response'}")
            return False
        except Exception as e:
            print(f"[GistClient] Error updating keywords: {e}")
            return False

    def create_keywords_in_gist(self, keywords, gist_id=None):
        """
        Create a new gist with keywords.csv

        Args:
            keywords: List of keyword dictionaries
            gist_id: Optional gist ID (if not provided, creates new gist)

        Returns:
            str: Gist ID if successful, None otherwise
        """
        try:
            # Convert keywords to CSV
            output = StringIO()
            fieldnames = ['root-keyword', 'root-num', 'keyword-raw', 'keyword', 'index', 'created']
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()

            for kw in keywords:
                writer.writerow({
                    'root-keyword': kw.get('root_keyword', ''),
                    'root-num': kw.get('root_num', 0),
                    'keyword-raw': kw.get('keyword_raw', ''),
                    'keyword': kw.get('keyword', ''),
                    'index': kw.get('index', 0),
                    'created': kw.get('created', 0)
                })

            csv_content = output.getvalue()

            # Create new gist
            url = f"{self.api_base}/gists"
            payload = {
                'description': 'Coloring pages keywords - auto-updated',
                'public': False,
                'files': {
                    'keywords.csv': {
                        'content': csv_content
                    }
                }
            }

            response = requests.post(url, headers=self.headers, json=payload)
            response.raise_for_status()

            result = response.json()
            new_gist_id = result['id'].split('/')[-1]

            print(f"[GistClient] Successfully created new gist: {new_gist_id}")
            return new_gist_id

        except Exception as e:
            print(f"[GistClient] Error creating gist: {e}")
            return None


def load_keywords_from_file(filename='keywords.csv'):
    """Load keywords from local CSV file (fallback)"""
    if not os.path.exists(filename):
        return []

    keywords = []
    with open(filename, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            keywords.append({
                'root_keyword': row.get('root-keyword', ''),
                'root_num': int(row.get('root-num', 0)),
                'keyword_raw': row.get('keyword-raw', ''),
                'keyword': row.get('keyword', ''),
                'index': int(row.get('index', 0)),
                'created': int(row.get('created', 0))
            })
    return keywords


def save_keywords_to_file(keywords, filename='keywords.csv'):
    """Save keywords to local CSV file (fallback)"""
    with open(filename, 'w', encoding='utf-8', newline='') as f:
        fieldnames = ['root-keyword', 'root-num', 'keyword-raw', 'keyword', 'index', 'created']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()

        for kw in keywords:
            writer.writerow({
                'root-keyword': kw.get('root_keyword', ''),
                'root-num': kw.get('root_num', 0),
                'keyword-raw': kw.get('keyword_raw', ''),
                'keyword': kw.get('keyword', ''),
                'index': kw.get('index', 0),
                'created': kw.get('created', 0)
            })


def load_keywords(use_gist=True):
    """
    Load keywords from gist or local file

    Args:
        use_gist: If True, try to load from gist first, fallback to local file

    Returns:
        list: List of keyword dictionaries
    """
    if use_gist and os.getenv('GIST_ID'):
        try:
            client = GistClient()
            keywords = client.get_keywords_csv()
            if keywords:
                # Also save to local file as backup
                save_keywords_to_file(keywords)
                return keywords
        except Exception as e:
            print(f"[Keywords] Failed to load from gist: {e}")

    # Fallback to local file
    return load_keywords_from_file()


def save_keywords(keywords, use_gist=True):
    """
    Save keywords to gist and local file

    Args:
        keywords: List of keyword dictionaries
        use_gist: If True, try to save to gist

    Returns:
        bool: True if successful
    """
    # Always save to local file
    save_keywords_to_file(keywords)

    if use_gist and os.getenv('GIST_ID'):
        try:
            client = GistClient()
            return client.update_keywords_csv(keywords)
        except Exception as e:
            print(f"[Keywords] Failed to save to gist: {e}")
            return False

    return True


if __name__ == '__main__':
    # Test script
    import sys

    if len(sys.argv) > 1:
        command = sys.argv[1]

        if command == 'test':
            # Test gist connection
            try:
                client = GistClient()
                keywords = client.get_keywords_csv()
                print(f"✓ Successfully connected to gist")
                print(f"✓ Found {len(keywords)} keywords")
            except Exception as e:
                print(f"✗ Error: {e}")

        elif command == 'upload':
            # Upload local keywords.csv to gist
            keywords = load_keywords_from_file()
            if keywords:
                client = GistClient()
                success = client.update_keywords_csv(keywords)
                if success:
                    print(f"✓ Uploaded {len(keywords)} keywords to gist")
                else:
                    print(f"✗ Failed to upload")
            else:
                print(f"✗ No keywords found in local file")

        elif command == 'download':
            # Download keywords from gist to local file
            client = GistClient()
            keywords = client.get_keywords_csv()
            if keywords:
                save_keywords_to_file(keywords)
                print(f"✓ Downloaded {len(keywords)} keywords to local file")
            else:
                print(f"✗ No keywords found in gist")

        elif command == 'create':
            # Create new gist from local file
            keywords = load_keywords_from_file()
            if keywords:
                client = GistClient(token=os.getenv('GIST_COLORING_TOKEN'))
                gist_id = client.create_keywords_in_gist(keywords)
                if gist_id:
                    print(f"✓ Created new gist: {gist_id}")
                    print(f"  Add this to your .env: GIST_ID={gist_id}")
                else:
                    print(f"✗ Failed to create gist")
            else:
                print(f"✗ No keywords found in local file")

        else:
            print("Usage:")
            print("  python gist_client.py test        - Test gist connection")
            print("  python gist_client.py upload      - Upload local keywords.csv to gist")
            print("  python gist_client.py download    - Download keywords from gist to local file")
            print("  python gist_client.py create      - Create new gist from local keywords.csv")
    else:
        print("Usage:")
        print("  python gist_client.py test        - Test gist connection")
        print("  python gist_client.py upload      - Upload local keywords.csv to gist")
        print("  python gist_client.py download    - Download keywords from gist to local file")
        print("  python gist_client.py create      - Create new gist from local keywords.csv")
