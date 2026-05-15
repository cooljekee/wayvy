.PHONY: up down logs migrate ps

up:
	docker compose up --build -d

down:
	docker compose down

logs:
	docker compose logs -f $(svc)

migrate:
	docker compose exec user-service /app/migrate up

ps:
	docker compose ps
