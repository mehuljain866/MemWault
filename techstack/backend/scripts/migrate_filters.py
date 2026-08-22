import sqlite3
import json
from pathlib import Path

FILTER_MAP = {
    0: 'Normal',
    1: 'Clarendon',
    24: 'Gingham',
    25: 'Moon',
    605: 'Jakarta',
    606: 'New York',
    607: 'Buenos Aires',
    608: 'Abu Dhabi',
    609: 'Melbourne',
    610: 'Lagos',
    611: 'Oslo',
    612: 'Tokyo',
    613: 'Cairo',
    614: 'Jaipur',
    615: 'Paris',
    616: 'Los Angeles',
    617: 'Rio de Janeiro',
}

def migrate():
    db_path = Path('memwault.db')
    if not db_path.exists():
        print('memwault.db does not exist yet.')
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute('PRAGMA table_info(stories)')
    cols = [col[1] for col in cursor.fetchall()]

    new_cols = [
        ('filter_name', 'VARCHAR(128)'),
        ('filter_type', 'INTEGER'),
        ('filter_creator', 'VARCHAR(128)'),
        ('filter_icon_url', 'TEXT'),
        ('effect_id', 'VARCHAR(64)'),
    ]

    for col_name, col_type in new_cols:
        if col_name not in cols:
            print(f'Adding column {col_name} to stories table...')
            cursor.execute(f'ALTER TABLE stories ADD COLUMN {col_name} {col_type}')

    # Try backfilling from raw_api_response or manifest if available
    cursor.execute('SELECT id, raw_api_response, manifest FROM stories')
    rows = cursor.fetchall()
    updated_count = 0

    for row_id, raw_json, manifest_json in rows:
        raw = {}
        if raw_json:
            try:
                raw = json.loads(raw_json) if isinstance(raw_json, str) else raw_json
            except Exception:
                pass

        filter_name = None
        filter_type = None
        filter_creator = None
        filter_icon_url = None
        effect_id = None

        if raw:
            creative_config = raw.get('creative_config') or {}
            effect_configs = creative_config.get('effect_configs') or raw.get('effect_configs') or []
            if effect_configs and isinstance(effect_configs, list) and len(effect_configs) > 0:
                eff = effect_configs[0]
                if isinstance(eff, dict):
                    filter_name = eff.get('name') or eff.get('title')
                    effect_id = str(eff.get('id') or eff.get('effect_id', '')) or None
                    att_user = eff.get('attribution_user') or eff.get('author') or {}
                    if isinstance(att_user, dict):
                        filter_creator = att_user.get('username')
                    elif isinstance(att_user, str):
                        filter_creator = att_user
                    icon_url = eff.get('icon_url') or eff.get('thumbnail_url')
                    if icon_url and isinstance(icon_url, dict):
                        filter_icon_url = icon_url.get('uri') or icon_url.get('url')
                    elif isinstance(icon_url, str):
                        filter_icon_url = icon_url

            f_type = raw.get('filter_type')
            if f_type is not None:
                try:
                    filter_type = int(f_type)
                    if not filter_name and filter_type in FILTER_MAP:
                        filter_name = FILTER_MAP[filter_type]
                        filter_creator = 'instagram'
                except Exception:
                    pass

            if not filter_name and raw.get('filter_name'):
                filter_name = raw.get('filter_name')

        if filter_name or filter_type or effect_id:
            cursor.execute(
                'UPDATE stories SET filter_name = ?, filter_type = ?, filter_creator = ?, filter_icon_url = ?, effect_id = ? WHERE id = ?',
                (filter_name, filter_type, filter_creator, filter_icon_url, effect_id, row_id)
            )
            updated_count += 1

    conn.commit()
    conn.close()
    print(f'Filter migration complete. {updated_count} stories updated.')

if __name__ == '__main__':
    migrate()
