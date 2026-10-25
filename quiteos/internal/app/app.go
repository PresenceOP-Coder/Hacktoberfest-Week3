package app

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/quiteos/internal/ai"
	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/quiteos/internal/analysis"
	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/quiteos/internal/api"
	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/quiteos/internal/attention"
	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/quiteos/internal/config"
	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/quiteos/internal/digest"
	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/quiteos/internal/domain"
	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/quiteos/internal/scheduler"
	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/quiteos/internal/store"
)

type App struct {
	cfg          *config.Config
	store        *store.Store
	analysisSvc  *analysis.Service
	attentionEng *attention.Engine
	digestGen    *digest.Generator
	scheduler    *scheduler.Scheduler
	server       *http.Server
}

func New(ctx context.Context, cfg *config.Config) (*App, error) {
	st, err := store.New(ctx, cfg.DBPath)
	if err != nil {
		return nil, fmt.Errorf("initializing store: %w", err)
	}

	// Apply migrations
	if err := st.RunMigrations(ctx, cfg.MigrationsDir); err != nil {
		return nil, fmt.Errorf("running migrations: %w", err)
	}

	// Ensure default account exists
	defaultAcc := &domain.Account{
		ID:           cfg.DefaultAccountID,
		Provider:     "google",
		EmailAddress: cfg.DefaultAccountEmail,
		Timezone:     "UTC",
		Status:       "connected",
	}
	if err := st.UpsertAccount(ctx, defaultAcc); err != nil {
		return nil, fmt.Errorf("upserting default account: %w", err)
	}

	// Initialize AI analyzer, analysis service, attention engine, digest generator & scheduler
	analyzer := ai.NewSmartAnalyzer(cfg.OllamaURL, cfg.OllamaModel)
	analysisSvc := analysis.NewService(st, analyzer)
	attentionEng := attention.NewEngine(st)
	digestGen := digest.NewGenerator(st)
	sched := scheduler.NewScheduler(st)

	// Auto-seed fixtures ONLY if explicitly requested via SEED_FIXTURES=true
	msgs, err := st.ListMessages(ctx, cfg.DefaultAccountID, 1, 0)
	if err == nil && len(msgs) == 0 && cfg.FixturesFile != "" && os.Getenv("SEED_FIXTURES") == "true" {
		if _, err := os.Stat(cfg.FixturesFile); err == nil {
			log.Printf("[QuietOS] Seeding initial test fixtures from %s...", cfg.FixturesFile)
			count, err := st.ImportFixtures(ctx, cfg.DefaultAccountID, cfg.FixturesFile)
			if err != nil {
				log.Printf("[QuietOS] Warning: failed seeding fixtures: %v", err)
			} else {
				log.Printf("[QuietOS] Seeded %d test emails successfully.", count)
				// Pre-analyze seeded fixtures & sync attention debt
				go func() {
					bgCtx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
					defer cancel()
					log.Printf("[QuietOS] Performing initial AI analysis on test fixtures...")
					analyzed, err := analysisSvc.AnalyzeAllMessages(bgCtx, cfg.DefaultAccountID, defaultAcc.Timezone)
					if err != nil {
						log.Printf("[QuietOS] Initial analysis error: %v", err)
					} else {
						log.Printf("[QuietOS] Initial analysis completed: %d messages analyzed.", analyzed)
						// Sync into Attention Debt
						synced, err := attentionEng.SyncAttentionDebt(bgCtx, cfg.DefaultAccountID)
						if err != nil {
							log.Printf("[QuietOS] Attention debt sync error: %v", err)
						} else {
							log.Printf("[QuietOS] Attention debt initialized: %d active responsibilities mapped.", synced)
							// Schedule initial reminders
							_, _ = sched.SyncTaskReminders(bgCtx, cfg.DefaultAccountID)
						}
					}
				}()
			}
		}
	}

	// Start background scheduler loop
	sched.Start(cfg.DefaultAccountID)

	apiServer := api.NewServer(cfg, st, analysisSvc, attentionEng, digestGen, sched)

	srv := &http.Server{
		Addr:         "127.0.0.1:" + cfg.ServerPort,
		Handler:      apiServer.Handler(),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	return &App{
		cfg:          cfg,
		store:        st,
		analysisSvc:  analysisSvc,
		attentionEng: attentionEng,
		digestGen:    digestGen,
		scheduler:    sched,
		server:       srv,
	}, nil
}

func (a *App) Store() *store.Store {
	return a.store
}

func (a *App) AnalysisService() *analysis.Service {
	return a.analysisSvc
}

func (a *App) AttentionEngine() *attention.Engine {
	return a.attentionEng
}

func (a *App) DigestGenerator() *digest.Generator {
	return a.digestGen
}

func (a *App) Scheduler() *scheduler.Scheduler {
	return a.scheduler
}

func (a *App) Run() error {
	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, os.Interrupt, syscall.SIGTERM)

	serverErr := make(chan error, 1)
	go func() {
		log.Printf("[QuietOS] Starting local server at http://%s", a.server.Addr)
		if err := a.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			serverErr <- err
		}
	}()

	select {
	case err := <-serverErr:
		return fmt.Errorf("server error: %w", err)
	case sig := <-shutdown:
		log.Printf("[QuietOS] Received shutdown signal: %v", sig)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	a.scheduler.Stop()

	if err := a.server.Shutdown(ctx); err != nil {
		return fmt.Errorf("graceful shutdown failed: %w", err)
	}

	if err := a.store.Close(); err != nil {
		return fmt.Errorf("closing database: %w", err)
	}

	log.Printf("[QuietOS] Server gracefully stopped.")
	return nil
}
