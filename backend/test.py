import asyncio
from agent import process_chat

async def test():
    reply = await process_chat([{'role': 'user', 'content': 'Where is my order ORD-101?'}])
    print("REPLY:", reply)

if __name__ == "__main__":
    asyncio.run(test())
