.PHONY: up down build logs shell-backend shell-frontend db-migrate db-studio db-seed

# Khởi động toàn bộ stack (build nếu chưa có image)
up:
	docker compose up --build

# Chạy ngầm
up-d:
	docker compose up --build -d

# Tắt tất cả
down:
	docker compose down

# Tắt và xoá volumes (reset data)
down-v:
	docker compose down -v

# Build lại images
build:
	docker compose build

# Xem logs
logs:
	docker compose logs -f

logs-backend:
	docker compose logs -f backend

logs-frontend:
	docker compose logs -f frontend

# Vào shell của container
shell-backend:
	docker compose exec backend sh

shell-frontend:
	docker compose exec frontend sh

# Prisma commands (chạy trong container backend)
db-migrate:
	docker compose exec backend pnpm db:migrate

db-studio:
	docker compose exec backend pnpm db:studio

db-seed:
	docker compose exec backend pnpm db:seed

db-generate:
	docker compose exec backend pnpm db:generate

# Chạy test
test-backend:
	docker compose exec backend pnpm test

test-backend-watch:
	docker compose exec backend pnpm test:watch

test-backend-coverage:
	docker compose exec backend pnpm test -- --coverage

test-frontend:
	docker compose exec frontend pnpm test

test-frontend-coverage:
	docker compose exec frontend pnpm test:coverage

test:
	docker compose exec backend pnpm test
	docker compose exec frontend pnpm test

# Chạy lint
lint-backend:
	docker compose exec backend pnpm lint

lint-frontend:
	docker compose exec frontend pnpm lint
