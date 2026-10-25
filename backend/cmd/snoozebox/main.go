// Command snoozebox is the main entry point for the SnoozeBox service.
package main

import (
	"context"
	"fmt"
	"os"

	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/backend/internal/app"
	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/backend/internal/config"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	ctx := context.Background()
	cfg := config.Load()

	application, err := app.New(ctx, cfg)
	if err != nil {
		return fmt.Errorf("failed to initialize SnoozeBox: %w", err)
	}

	return application.Run()
}
