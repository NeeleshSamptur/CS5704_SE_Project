import requests
import os

token = os.getenv('GITHUB_TOKEN')
headers = {'Authorization': f'token {token}'}

owner = "NeeleshSamptur"
repo = "CS5704_SE_Project"

# Get commits from your repo
url = f"https://api.github.com/repos/{owner}/{repo}/commits"
response = requests.get(url, headers=headers)

if response.status_code == 200:
    commits = response.json()
    print(f"Found {len(commits)} commits:")
    
    # Show first 3 commits
    for i, commit in enumerate(commits[:3]):
        print(f"\n--- Commit {i+1} ---")
        print(f"SHA: {commit['sha'][:8]}")
        print(f"Author: {commit['commit']['author']['name']}")
        print(f"Message: {commit['commit']['message'][:60]}...")
        print(f"Date: {commit['commit']['author']['date']}")
else:
    print(f"ERROR: {response.status_code}")
    print(response.text)