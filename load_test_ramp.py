"""
Capacity ramp test for the Kids Salon API (Render free plan).

Run it FROM YOUR OWN PC (not from the server):

    pip install httpx --break-system-packages
    python load_test_ramp.py

What it does:
  - Wakes the server up first (free tier sleeps after ~15 min idle).
  - Runs several rounds automatically: 5, 10, 20, 30, 50, 75, 100 concurrent
    "users", each firing a few real read-only requests at the same time.
  - Prints one summary line per round.
  - STOPS automatically once a round shows real trouble (many failures or
    responses so slow they'd feel broken to a real customer), so you don't
    have to babysit it or guess how far to push it.

At the end it prints a plain-English verdict: the highest user count that
stayed clean, and the point where things started to degrade.
"""
import asyncio
import statistics
import time

import httpx

BASE_URL = "https://kids-salon-api.onrender.com"

# How many concurrent users to try, in order. The test stops early if a
# round looks bad, so it won't necessarily run all of these.
USER_LEVELS = [5, 10, 20, 30, 50, 75, 100]
REQUESTS_PER_USER = 4

# Read-only endpoints only — safe to hammer, they never create/change data.
ENDPOINTS = [
    "/health",
    "/appointment-types",
    "/slots/available?date=2026-07-20",
    "/gallery",
]

# Thresholds for calling a round "degraded" / "broken"
SLOW_MS = 3000        # a response taking longer than this feels broken to a user
DEGRADED_FAIL_RATE = 0.05   # >5% failing = degraded
BROKEN_FAIL_RATE = 0.20     # >20% failing = broken, stop the ramp


async def run_round(client: httpx.AsyncClient, users: int):
    results = []

    async def one_user(user_id: int):
        for i in range(REQUESTS_PER_USER):
            ep = ENDPOINTS[(user_id + i) % len(ENDPOINTS)]
            t0 = time.perf_counter()
            try:
                r = await client.get(BASE_URL + ep, timeout=30)
                results.append((ep, r.status_code, time.perf_counter() - t0))
            except Exception as e:
                results.append((ep, f"ERROR {type(e).__name__}", time.perf_counter() - t0))

    t0 = time.perf_counter()
    await asyncio.gather(*(one_user(u) for u in range(users)))
    wall = time.perf_counter() - t0

    times = [t for (_, s, t) in results if s == 200]
    errors = [(ep, s) for (ep, s, _) in results if s != 200]
    total = len(results)
    fail_rate = len(errors) / total if total else 1.0

    summary = {
        "users": users,
        "total_requests": total,
        "ok": len(times),
        "failed": len(errors),
        "fail_rate": fail_rate,
        "wall_s": wall,
        "avg_ms": statistics.mean(times) * 1000 if times else None,
        "median_ms": statistics.median(times) * 1000 if times else None,
        "max_ms": max(times) * 1000 if times else None,
        "req_per_s": len(times) / wall if wall > 0 else 0,
        "errors_sample": errors[:5],
    }
    return summary


def verdict(summary):
    if summary["fail_rate"] > BROKEN_FAIL_RATE:
        return "BROKEN"
    if summary["fail_rate"] > DEGRADED_FAIL_RATE:
        return "DEGRADED (failures)"
    if summary["max_ms"] and summary["max_ms"] > SLOW_MS:
        return "DEGRADED (slow)"
    return "CLEAN"


async def main():
    print("Waking up the server (free tier may be asleep — can take up to a minute)...")
    async with httpx.AsyncClient() as client:
        t0 = time.perf_counter()
        try:
            await client.get(BASE_URL + "/health", timeout=120)
            print(f"Server is awake ({time.perf_counter() - t0:.1f}s to respond).\n")
        except Exception as e:
            print(f"Could not reach the server at all: {e}")
            return

        print(f"{'Users':>6} | {'Reqs':>5} | {'OK':>5} | {'Fail':>5} | "
              f"{'Median':>8} | {'Slowest':>8} | {'Req/s':>6} | Verdict")
        print("-" * 80)

        all_summaries = []
        for users in USER_LEVELS:
            s = await run_round(client, users)
            all_summaries.append(s)
            v = verdict(s)
            median_str = f"{s['median_ms']:.0f}ms" if s["median_ms"] is not None else "n/a"
            max_str = f"{s['max_ms']:.0f}ms" if s["max_ms"] is not None else "n/a"
            print(f"{s['users']:>6} | {s['total_requests']:>5} | {s['ok']:>5} | "
                  f"{s['failed']:>5} | {median_str:>8} | {max_str:>8} | "
                  f"{s['req_per_s']:>6.1f} | {v}")
            if s["errors_sample"]:
                for ep, err in s["errors_sample"]:
                    print(f"         -> sample failure: {ep} = {err}")

            # Pause briefly between rounds so one round's queue doesn't bleed
            # into the next round's timing.
            await asyncio.sleep(2)

            if v == "BROKEN":
                print(f"\nStopping the ramp — {users} concurrent users pushed the free plan "
                      f"past a broken threshold ({s['fail_rate']*100:.0f}% failed).")
                break

    print("\n" + "=" * 80)
    print("VERDICT")
    print("=" * 80)
    clean_levels = [s["users"] for s in all_summaries if verdict(s) == "CLEAN"]
    degraded_levels = [s["users"] for s in all_summaries if verdict(s).startswith("DEGRADED")]
    broken_levels = [s["users"] for s in all_summaries if verdict(s) == "BROKEN"]

    if clean_levels:
        print(f"- Comfortably handled (fast, zero failures): up to {max(clean_levels)} concurrent users.")
    if degraded_levels:
        print(f"- Still worked but slowed down / had some failures at: {degraded_levels} concurrent users.")
    if broken_levels:
        print(f"- Broke down (many failures) starting at: {min(broken_levels)} concurrent users.")
    if not degraded_levels and not broken_levels:
        print("- No degradation seen at any tested level — the free plan handled everything tried.")
        print("  Consider re-running with higher USER_LEVELS to find the real ceiling.")

    print("\nHow to read this:")
    print("  - CLEAN     = fast (under 3s) and 0 meaningful failures at that concurrency.")
    print("  - DEGRADED  = still answered almost everything, but slower or with occasional errors.")
    print("  - BROKEN    = more than 20% of requests failed outright — real capacity limit.")


if __name__ == "__main__":
    asyncio.run(main())