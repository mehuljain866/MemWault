import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text

async def run():
    engine = create_async_engine('sqlite+aiosqlite:///memwault.db')
    async with AsyncSession(engine) as session:
        result = await session.execute(text('SELECT id, is_downloaded, s3_key_compressed, media_type, cdn_url FROM stories ORDER BY taken_at DESC LIMIT 20'))
        for r in result.fetchall():
            print(r)

asyncio.run(run())
