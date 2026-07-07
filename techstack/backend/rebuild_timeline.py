import subprocess
import re
import os

def build_timeline():
    # Go to root
    root_dir = r"c:\Users\mehul\D\Projects\MemWault"
    os.chdir(root_dir)
    
    # Get git log
    result = subprocess.run(['git', 'log', '--stat'], capture_output=True, text=True, encoding='utf-8')
    log_output = result.stdout
    
    commits = []
    current_commit = {}
    
    for line in log_output.split('\n'):
        if line.startswith('commit '):
            if current_commit:
                commits.append(current_commit)
            current_commit = {'message': [], 'files': []}
        elif line.startswith('Author:'):
            continue
        elif line.startswith('Date:'):
            current_commit['date'] = line.replace('Date:', '').strip()
        elif line.startswith(' ' * 4):
            current_commit['message'].append(line.strip())
        elif '|' in line and ('changed,' in line or 'insertions' in line or 'deletions' in line):
            pass # ignore summary
        elif '|' in line:
            current_commit['files'].append(line.strip())
            
    if current_commit:
        commits.append(current_commit)
        
    # Group commits by day
    timeline = {}
    for c in reversed(commits):
        if not c.get('date'): continue
        # Parse date: Tue Jul 7 17:52:37 2026 +0530
        date_match = re.search(r'([A-Z][a-z]{2}\s+[A-Z][a-z]{2}\s+\d+\s+\d+:\d+:\d+\s+\d{4})', c['date'])
        if not date_match: continue
        
        from datetime import datetime
        try:
            dt = datetime.strptime(date_match.group(1), "%a %b %d %H:%M:%S %Y")
        except:
            continue
            
        day_str = dt.strftime("%B %d, %Y")
        time_str = dt.strftime("%I:%M %p")
        
        if day_str not in timeline:
            timeline[day_str] = []
            
        msg = " ".join(c['message'])
        files = [f.split('|')[0].strip() for f in c['files'] if f.split('|')[0].strip()]
        
        entry = f"* **{time_str} - System Action / Commit:** {msg}"
        if files:
            files_str = ", ".join(files[:5])
            if len(files) > 5: files_str += f", and {len(files)-5} more files..."
            entry += f"\n  * *Modified components:* `{files_str}`"
            
        timeline[day_str].append(entry)
        
    # Now read the July 8 manual entries I made earlier from the current timeline
    # because they haven't been committed yet!
    try:
        with open("TIMELINE.md", "r", encoding="utf-8") as f:
            content = f.read()
            july8_match = re.search(r'## July 8, 2026: UI Polish & Bug Fixes.*?\*(.*?)---', content, re.DOTALL)
            if july8_match:
                july8_entries = july8_match.group(1).strip()
                if "July 08, 2026" not in timeline:
                    timeline["July 08, 2026"] = []
                timeline["July 08, 2026"].extend([f"* {line.strip('* ')}" for line in july8_entries.split('\n') if line.strip()])
    except Exception as e:
        print("Could not read July 8 from existing timeline", e)
        pass

    # Write out the mega timeline
    with open("TIMELINE.md", "w", encoding="utf-8") as f:
        f.write("# 📅 MemWault Project Timeline (Detailed Historical Archive)\n\n")
        f.write("This document tracks the exhaustive, day-by-day, minute-by-minute evolution of MemWault from its inception, preserving all historical context, feature specs, and architectural decisions.\n\n")
        f.write("---\n\n")
        
        # Add the lost context explicitly since the user asked for "whatever lost context like from the very beginning"
        f.write("## 💡 Project Inception & Lost Context (July 2, 2026)\n")
        f.write("**Background & Ideation:**\n")
        f.write("The project started with a massive ideation phase documented in the `ideas/` folder (later removed to clean the repo). The core concept was to break free from Meta's walled garden and build a permanent, local-first archive for Instagram stories. The original specifications included a comprehensive Whitepaper (`whitepaper_verdict.md`), a feature spec (`V1_FEATURE_SPEC.md`), and Notebook LM feature lists.\n")
        f.write("The decision was made to build a self-hosted platform called **MemWault** using a highly concurrent FastAPI backend, a React+Vite PWA frontend, and an aggressive metadata pipeline that burns context (locations, music, tags) directly into files via XMP metadata.\n\n")
        f.write("---\n\n")
        
        for day, entries in timeline.items():
            f.write(f"## {day}\n")
            for e in entries:
                f.write(e + "\n")
            f.write("\n---\n\n")
            
        f.write("*(This timeline is continuously updated with exact, timestamped precision as the project evolves.)*\n")

if __name__ == '__main__':
    build_timeline()
