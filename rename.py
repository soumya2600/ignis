import os

root_dir = r"c:\Users\soumy\OneDrive\Desktop\projects\fire\forest-fire-ai"

extensions = ('.md', '.env', '.env.example', '.sql', '.py', '.js', '.jsx', '.ts', '.tsx', '.html', '.json')
exclude_dirs = ('node_modules', '.git', '.gemini')

def replace_in_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        if 'AGNIDRISHTI' in content or 'agnidrishti' in content or 'Agnidrishti' in content:
            new_content = content.replace('AGNIDRISHTI', 'AGNIDRISHTI')
            new_content = new_content.replace('AGNIDRISHTI', 'AGNIDRISHTI')
            new_content = new_content.replace('agnidrishti', 'agnidrishti')
            new_content = new_content.replace('Agnidrishti', 'Agnidrishti')
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated {filepath}")
    except Exception as e:
        print(f"Could not process {filepath}: {e}")

for root, dirs, files in os.walk(root_dir):
    dirs[:] = [d for d in dirs if d not in exclude_dirs]
    for file in files:
        if file.endswith(extensions):
            replace_in_file(os.path.join(root, file))
