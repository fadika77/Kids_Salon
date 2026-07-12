"""
Simple load test for the Kids Barbershop API.
Run it FROM YOUR OWN PC (not from the server):

    pip install httpx --break-system-packages
    python load_test.py

It simulates many customers using the app at the same time and reports
how fast the server answers. Adjust USERS / REQUESTS_PER_USER below.
"""
import asyncio
import statistics
import time

import httpx

BASE_URL = "https://kids-salon-api.onrender.com"
USERS = 30                # simulated customers at the SAME time
REQUESTS_PER_USER = 5     # requests each one makes

# Read-only endpoints (safe to hammer — they create no data)
ENDPOINTS = [
    "/health",
    "/appointment-types",
    "/slots/available?date=2026-07-20",
    "/gallery",
]

results = []   # (endpoint, status, seconds)


async def one_user(client: httpx.AsyncClient, user_id: int):
    for i in range(REQUESTS_PER_USER):
        ep = ENDPOINTS[(user_id + i) % len(ENDPOINTS)]
        t0 = time.perf_counter()
        try:
            r = await client.get(BASE_URL + ep, timeout=30)
            results.append((ep, r.status_code, time.perf_counter() - t0))
        except Exception as e:
            results.append((ep, f"ERROR {type(e).__name__}", time.perf_counter() - t0))


async def main():
    print(f"Warming up the server (free tier may be asleep)...")
    async with httpx.AsyncClient() as client:
        await client.get(BASE_URL + "/health", timeout=120)

        print(f"Running: {USERS} users x {REQUESTS_PER_USER} requests each "
              f"= {USERS * REQUESTS_PER_USER} total requests, all in parallel\n")
        t0 = time.perf_counter()
        await asyncio.gather(*(one_user(client, u) for u in range(USERS)))
        total = time.perf_counter() - t0

    times = [t for (_, s, t) in results if s == 200]
    errors = [(ep, s) for (ep, s, _) in results if s != 200]

    print(f"Total wall time      : {total:.1f}s")
    print(f"Requests OK          : {len(times)}/{len(results)}")
    print(f"Requests failed      : {len(errors)}")
    if times:
        print(f"Average response     : {statistics.mean(times)*1000:.0f} ms")
        print(f"Median response      : {statistics.median(times)*1000:.0f} ms")
        print(f"Slowest response     : {max(times)*1000:.0f} ms")
        print(f"Requests per second  : {len(times)/total:.1f}")
    if errors:
        print("\nFailures:")
        for ep, s in errors[:10]:
            print(f"  {ep} -> {s}")

    print("\nHow to read this:")
    print("  - Median under ~500 ms and 0 failures = comfortably handles this load.")
    print("  - Many timeouts/errors = raise the Render plan or investigate.")
    print("  - Try USERS = 50, 100... to find the limit.")


if __name__ == "__main__":
    asyncio.run(main())
