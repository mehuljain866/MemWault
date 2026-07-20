import json
from datetime import datetime
from collections import defaultdict
import re
import glob

def process():
    log_paths = [
        r"C:\Users\mehul\.gemini\antigravity\brain\51a9816e-0d7a-4bf6-9141-3011b4b2cf71\.system_generated\logs\transcript.jsonl",
        r"C:\Users\mehul\.gemini\antigravity\brain\d361e167-d80a-4e38-b9ce-c1031145f47a\.system_generated\logs\transcript.jsonl",
        r"C:\Users\mehul\.gemini\antigravity\brain\53da24b4-61e7-4ba4-a603-cdff2b238108\.system_generated\logs\transcript.jsonl"
    ]
    
    events = []
    
    for log_path in log_paths:
        try:
            with open(log_path, 'r', encoding='utf-8') as f:
                for line in f:
                    if not line.strip(): continue
                    try:
                        data = json.loads(line)
                    except:
                        continue
                        
                    timestamp = data.get("created_at", "")
                    if not timestamp: continue
                    
                    try:
                        dt = datetime.strptime(timestamp[:19], "%Y-%m-%dT%H:%M:%S")
                    except:
                        continue
                        
                    step_type = data.get("type", "")
                    content = data.get("content", "")
                    
                    if step_type == "USER_INPUT":
                        content = re.sub(r'<[^>]+>', '', content).strip()
                        if len(content) > 150:
                            content = content[:150] + "..."
                        if content:
                            events.append((dt, f"User Request: {content}"))
                    
                    elif step_type == "PLANNER_RESPONSE":
                        tools = data.get("tool_calls", [])
                        for t in tools:
                            summary = t.get("toolSummary", "")
                            if summary:
                                events.append((dt, f"System Action: {summary}"))
        except Exception as e:
            print(f"Skipping {log_path}: {e}")
            
    events.sort(key=lambda x: x[0])
    
    events_by_date = defaultdict(list)
    for dt, text in events:
        date_str = dt.strftime("%B %d, %Y")
        time_str = dt.strftime("%I:%M %p")
        events_by_date[date_str].append(f"* **{time_str}** - {text}")

    with open("timeline_draft.md", "w", encoding="utf-8") as f:
        f.write("# 📅 MemWault Project Timeline (Detailed History)\n\n")
        f.write("This document tracks the day-by-day, minute-by-minute evolution of MemWault based on raw project logs.\n\n")
        
        for date_str, daily_events in events_by_date.items():
            f.write(f"## {date_str}\n")
            
            last_event = ""
            count = 1
            deduped = []
            
            for ev in daily_events:
                # Strip out time for deduplication check so identical tasks in the same minute condense
                base_ev = ev.split(" - ", 1)[-1]
                if base_ev == last_event:
                    count += 1
                else:
                    if count > 1:
                        deduped[-1] += f" (x{count})"
                    deduped.append(ev)
                    last_event = base_ev
                    count = 1
            if count > 1:
                deduped[-1] += f" (x{count})"
                
            for ev in deduped:
                f.write(ev + "\n")
            f.write("\n---\n\n")
            
        f.write("*(End of automated log)*\n")

if __name__ == '__main__':
    process()
