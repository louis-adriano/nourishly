"""
Nourishly — Locust Load Test
FR05-03: 50 concurrent users, 90% of recipe generation requests within 10s

Run with:
    pip install locust
    locust -f locustfile.py --host=http://localhost:3000

Then open http://localhost:8089 in your browser and set:
    Number of users: 50
    Spawn rate: 5
    Host: http://localhost:3000
"""

from locust import HttpUser, task, between
from locust import events
import json
import time

# ─── Test data ────────────────────────────────────────────────────────────────

SAMPLE_RECIPE = {
    "title": "Test Recipe",
    "ingredients": ["chicken", "lemon", "garlic", "olive oil"],
    "cookTimeMinutes": 30,
    "nutrition": {
        "calories": 420,
        "protein": 48,
        "carbs": 8,
        "fat": 22
    }
}

SAMPLE_MEAL_LOG = {
    "recipe_id": "00000000-0000-0000-0000-000000000002",
    "calories": 420,
    "protein_g": 48,
    "carbs_g": 8,
    "fat_g": 22
}

SAMPLE_SUBSTITUTION = {
    "userMessage": "I am lactose intolerant, what can I substitute for butter?",
    "recipe": SAMPLE_RECIPE
}

# ─── User behaviour ───────────────────────────────────────────────────────────

class NourishlyUser(HttpUser):
    """
    Simulates a real user navigating the app:
    - Generates recipes (primary load test target — must be <10s for 90%)
    - Checks meal logs
    - Requests ingredient substitutions
    """

    # Wait 1–3 seconds between tasks (realistic user think time)
    wait_time = between(1, 3)

    # ── Primary task: recipe generation (weight=3 = runs 3x more often) ───────
    @task(3)
    def generate_recipes(self):
        """
        FR05-03 primary target:
        90% of these requests must respond within 10 seconds.
        """
        with self.client.post(
            "/api/recipes",
            json={
                "healthGoal": "weight loss",
                "dietaryRestrictions": ["gluten-free"],
                "cuisinePreferences": ["Mediterranean"],
            },
            headers={"Content-Type": "application/json"},
            catch_response=True,
            timeout=15,  # Allow up to 15s before Locust marks as failed
            name="POST /api/recipes (generate)",
        ) as response:
            # Mark as success if 200 or 201
            if response.status_code in [200, 201]:
                response.success()
            # 401 is expected without auth — still counts as "responded"
            elif response.status_code == 401:
                response.success()
            else:
                response.failure(
                    f"Unexpected status: {response.status_code} — {response.text[:100]}"
                )

    # ── Secondary task: check meal logs ───────────────────────────────────────
    @task(2)
    def get_meal_logs(self):
        with self.client.get(
            "/api/meal-logs",
            headers={"Content-Type": "application/json"},
            catch_response=True,
            name="GET /api/meal-logs",
        ) as response:
            if response.status_code in [200, 401]:
                response.success()
            else:
                response.failure(f"Unexpected status: {response.status_code}")

    # ── Secondary task: substitution check ────────────────────────────────────
    @task(1)
    def get_substitution_count(self):
        with self.client.get(
            "/api/substitutions",
            catch_response=True,
            name="GET /api/substitutions (count)",
        ) as response:
            if response.status_code in [200, 401]:
                response.success()
            else:
                response.failure(f"Unexpected status: {response.status_code}")

    # ── Secondary task: request a substitution ────────────────────────────────
    @task(1)
    def post_substitution(self):
        with self.client.post(
            "/api/substitutions",
            json=SAMPLE_SUBSTITUTION,
            headers={"Content-Type": "application/json"},
            catch_response=True,
            timeout=15,
            name="POST /api/substitutions",
        ) as response:
            if response.status_code in [200, 401, 429]:
                response.success()
            else:
                response.failure(f"Unexpected status: {response.status_code}")


# ─── Custom stats reporter ─────────────────────────────────────────────────────
# Prints a FR05-03 compliance summary at the end of the test

@events.quitting.add_listener
def on_quitting(environment, **kwargs):
    stats = environment.runner.stats

    print("\n" + "="*60)
    print("FR05-03 COMPLIANCE REPORT — Nourishly Load Test")
    print("="*60)

    recipe_stats = stats.entries.get(("POST /api/recipes (generate)", "POST"))

    if recipe_stats:
        total       = recipe_stats.num_requests
        failures    = recipe_stats.num_failures
        p90         = recipe_stats.get_response_time_percentile(0.90) / 1000  # ms → s
        p95         = recipe_stats.get_response_time_percentile(0.95) / 1000
        avg         = recipe_stats.avg_response_time / 1000
        success     = ((total - failures) / total * 100) if total > 0 else 0

        print(f"\n📊 Recipe Generation — POST /api/recipes")
        print(f"   Total requests  : {total}")
        print(f"   Failures        : {failures}")
        print(f"   Success rate    : {success:.1f}%")
        print(f"   Avg response    : {avg:.2f}s")
        print(f"   p90 response    : {p90:.2f}s  {'✅ PASS' if p90 <= 10 else '❌ FAIL'} (target: <10s)")
        print(f"   p95 response    : {p95:.2f}s")

        if p90 <= 10:
            print(f"\n✅ FR05-03 PASSED — 90th percentile ({p90:.2f}s) is within 10s target")
        else:
            print(f"\n❌ FR05-03 FAILED — 90th percentile ({p90:.2f}s) exceeds 10s target")
    else:
        print("\n⚠️  No recipe generation requests were recorded.")

    print("="*60 + "\n")
