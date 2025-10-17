import requests
import os

token = os.getenv('GITHUB_TOKEN')
headers = {'Authorization': f'token {token}'}

owner = "NeeleshSamptur"
repo = "CS5704_SE_Project"

# Get commits
url = f"https://api.github.com/repos/{owner}/{repo}/commits"
response = requests.get(url, headers=headers)

if response.status_code == 200:
    commits = response.json()
    print(f"Found {len(commits)} commits\n")
    
    # Get detailed info for the first commit (most recent)
    commit_sha = commits[0]['sha']
    print(f"Getting details for commit: {commit_sha[:8]}")
    
    # Get commit details with file changes
    detail_url = f"https://api.github.com/repos/{owner}/{repo}/commits/{commit_sha}"
    detail_response = requests.get(detail_url, headers=headers)
    
    if detail_response.status_code == 200:
        commit_detail = detail_response.json()
        
        print(f"Message: {commit_detail['commit']['message']}")
        print(f"Files changed: {len(commit_detail['files'])}")
        print(f"Total additions: +{commit_detail['stats']['additions']}")
        print(f"Total deletions: -{commit_detail['stats']['deletions']}\n")
        
        # Show each file that changed
        for i, file in enumerate(commit_detail['files']):
            print(f"--- File {i+1}: {file['filename']} ---")
            print(f"Status: {file['status']}")
            print(f"Changes: +{file['additions']} -{file['deletions']}")
            if 'patch' in file:
                print("FULL DIFF:")
                print(file['patch'])  # Show the complete diff, not just preview
                print("\n" + "="*50 + "\n")  # Separator between files
    
else:
    print(f"ERROR: {response.status_code}")