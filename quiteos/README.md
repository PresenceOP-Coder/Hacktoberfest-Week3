# SnoozeBox Core — Local-First Email Backend

SnoozeBox Core is the Go-powered backend engine for **SnoozeBox: Your inbox, asleep on the job. Mostly.** It organizes unresolved responsibilities across emails into **Attention Debt**, extracts explicit deadlines with quoted evidence, and delivers a quiet, calm daily digest.

## Architecture

- **Backend:** Go modular monolith with standard library `net/http` router
- **Persistence:** SQLite (`modernc.org/sqlite` pure-Go driver, WAL mode, foreign keys enabled)
- **Local AI:** Ollama running open-weights Google Gemma 2 (`gemma2:2b` / `gemma2:9b`), local GPU/CPU inference with structured JSON output
- **Frontend Serving:** Single-binary static assets embedding (`frontend/dist`) or standalone Vite dev server
- **Integrations:** Real-time Gmail OAuth2 sync with incremental history sync & 30 synthetic fixtures

## Project Layout

- `cmd/snoozebox`: Primary executable entry point and graceful shutdown
- `cmd/quietos`: Compatibility alias entry point
- `internal/domain`: Core domain models (`Account`, `Message`, `Analysis`, `Task`, `Notification`, `Preferences`)
- `internal/store`: SQLite repository, migration runner, idempotent fixture importer
- `internal/api`: REST API endpoints and CORS middleware
- `internal/config`: Environment and configuration loader
- `internal/app`: Lifecycle wiring and initialization
- `migrations`: Numbered SQL schema migrations
- `testdata/emails`: Synthetic labeled email fixtures (30 test messages)
- `testdata/labels`: Ground truth annotations for evaluation benchmarks

## Quickstart

### 1. Run Tests

```powershell
go test -v ./...
```

### 2. Start the Backend

```powershell
go run ./cmd/snoozebox
```

The server automatically initializes `quietos.db`, runs migrations, seeds 30 synthetic email fixtures, and listens on `http://127.0.0.1:8080`.

### 3. Verify Endpoints

- Health: `http://127.0.0.1:8080/api/v1/health`
- Runtime: `http://127.0.0.1:8080/api/v1/runtime`
- Messages: `http://127.0.0.1:8080/api/v1/messages`
- Attention Debt: `http://127.0.0.1:8080/api/v1/attention`
- Morning Digest: `http://127.0.0.1:8080/api/v1/digest`
