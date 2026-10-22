# QuietOS — Local-First Email Attention Manager

QuietOS is an open-source, local-first email attention manager. It organizes unresolved responsibilities across emails into **Attention Debt**, detects explicit deadlines with quoted evidence, and delivers a quiet daily digest.

## Architecture

- **Backend:** Go modular monolith
- **Persistence:** SQLite (`modernc.org/sqlite` pure-Go driver, WAL mode, foreign keys enabled)
- **Local AI:** Ollama running open-weights models (e.g. `gemma3:4b`), local inference with structured JSON output
- **Frontend:** React + TypeScript dashboard

## Project Layout

- `cmd/quietos`: Executable entry point and graceful shutdown
- `internal/domain`: Core domain models (`Account`, `Message`, `Analysis`, `Task`, `Notification`, `Preferences`)
- `internal/store`: SQLite repository, migration runner, idempotent fixture importer
- `internal/api`: REST API endpoints and CORS middleware
- `internal/config`: Environment and configuration loader
- `internal/app`: Lifecycle wiring and initialization
- `migrations`: Numbered SQL schema migrations
- `testdata/emails`: Synthetic labeled email fixtures (30 test messages)
- `testdata/labels`: Ground truth annotations for urgent recall, deadlines, and task linking

## Quickstart

### 1. Run Tests

```powershell
go test -v ./...
```

### 2. Start the Backend

```powershell
go run ./cmd/quietos
```

The server automatically initializes `quietos.db`, runs migrations, seeds 30 synthetic email fixtures, and listens on `http://127.0.0.1:8080`.

### 3. Verify Endpoints

- Health: `http://127.0.0.1:8080/api/v1/health`
- Runtime: `http://127.0.0.1:8080/api/v1/runtime`
- Inbox Messages: `http://127.0.0.1:8080/api/v1/messages`
