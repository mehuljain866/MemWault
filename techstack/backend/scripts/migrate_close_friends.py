import sqlite3
from pathlib import Path

def migrate():
    db_path = Path("memwault.db")
    if not db_path.exists():
        print("memwault.db does not exist yet. Nothing to migrate.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Check columns on stories table
    cursor.execute("PRAGMA table_info(stories)")
    columns = [col[1] for col in cursor.fetchall()]

    if "is_close_friends" not in columns:
        print("Adding column 'is_close_friends' to stories table...")
        cursor.execute("ALTER TABLE stories ADD COLUMN is_close_friends BOOLEAN DEFAULT 0")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_stories_is_close_friends ON stories (is_close_friends)")
        print("Column 'is_close_friends' added successfully.")
    else:
        print("Column 'is_close_friends' already exists.")

    if "audience_snapshot" not in columns:
        print("Adding column 'audience_snapshot' to stories table...")
        cursor.execute("ALTER TABLE stories ADD COLUMN audience_snapshot JSON")
        print("Column 'audience_snapshot' added successfully.")
    else:
        print("Column 'audience_snapshot' already exists.")

    conn.commit()
    conn.close()
    print("Close Friends database migration complete.")

if __name__ == "__main__":
    migrate()
