from locust import HttpUser, between, task


class TatarEduUser(HttpUser):
    """Читает публичный API так же, как страница мероприятий."""

    wait_time = between(0.5, 1.5)

    @task
    def list_events(self):
        with self.client.get(
            "/api/v1/events/",
            name="GET /api/v1/events/",
            headers={"Host": "tataredu.test"},
            timeout=10,
            catch_response=True,
        ) as response:
            # Locust uses status 0 when no HTTP response was received. Keep its
            # original connection/timeout exception instead of replacing it.
            if response.status_code == 0:
                return
            if response.status_code != 200:
                response.failure(f"HTTP {response.status_code}")
                return
            try:
                payload = response.json()
            except ValueError:
                response.failure("Ответ API не является JSON")
                return
            if not isinstance(payload, (list, dict)):
                response.failure("Неожиданный формат ответа API")
