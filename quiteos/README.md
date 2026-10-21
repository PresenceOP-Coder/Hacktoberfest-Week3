# QuietOS

QuietOS is a Go service organized into separate application, API, configuration,
domain, and storage layers.

## Project layout

- `cmd/quietos`: executable entry point
- `internal/api`: transport and request handlers
- `internal/config`: application configuration
- `internal/domain`: core business types and rules
- `internal/store`: persistence implementations
- `internal/app`: application wiring and lifecycle
- `migrations`: database migrations
- `testdata`: fixtures used by tests
- `docs`: project documentation

## Run

From this directory:

```powershell
go run ./cmd/quietos
```

## Test

```powershell
go test ./...
```
