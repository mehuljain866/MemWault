import sqlite3
from pathlib import Path

def migrate():
    # Adjust path assuming this script is in techstack/backend/scripts
    db_path = Path(__file__).parent.parent / "memwault.db"
    
    if not db_path.exists():
        print(f"Database not found at {db_path}, skipping migration.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Check if the column exists
        cursor.execute("PRAGMA table_info(stories)")
        columns = [info[1] for info in cursor.fetchall()]

        if "is_ai_generated" not in columns:
            print("Adding 'is_ai_generated' column to 'stories' table...")
            cursor.execute("ALTER TABLE stories ADD COLUMN is_ai_generated BOOLEAN DEFAULT 0")
            conn.commit()
            print("Migration successful.")
        else:
            print("Column 'is_ai_generated' already exists. Nothing to do.")

    except Exception as e:
        print(f"Migration failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
