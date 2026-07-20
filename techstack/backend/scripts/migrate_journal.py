import logging
from sqlalchemy import text, create_engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    # Use direct connection since memwault.db is in the same folder
    engine = create_engine("sqlite:///memwault.db")
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE stories ADD COLUMN journal_note TEXT;"))
            conn.commit()
            logger.info("Successfully added journal_note column to stories table.")
        except Exception as e:
            logger.error(f"Error (might already exist): {e}")

if __name__ == "__main__":
    migrate()
