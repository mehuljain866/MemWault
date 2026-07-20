import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text
import json

async def run():
    engine = create_async_engine('sqlite+aiosqlite:///memwault.db')
    async with AsyncSession(engine) as session:
        result = await session.execute(text('SELECT id, is_reel, raw_api_response FROM stories ORDER BY taken_at DESC LIMIT 1'))
        row = result.fetchone()
        if row:
            print(f"ID: {row.id}, is_reel: {row.is_reel}")
            with open("latest_story_raw.json", "w") as f:
                if row.raw_api_response:
                    json.dump(json.loads(row.raw_api_response), f, indent=2)
                else:
                    f.write("No raw API response")
        else:
            print("No stories found")

asyncio.run(run())
