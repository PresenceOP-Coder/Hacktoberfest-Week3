package config

import (
	"os"
)

type Config struct {
	ServerPort          string
	DBPath              string
	MigrationsDir       string
	FixturesFile        string
	GroundTruthFile     string
	OllamaURL           string
	OllamaModel         string
	DefaultAccountEmail string
	DefaultAccountID    string
}

func Load() *Config {
	getEnv := func(key, def string) string {
		if v := os.Getenv(key); v != "" {
			return v
		}
		return def
	}

	return &Config{
		ServerPort:          getEnv("PORT", "8080"),
		DBPath:              getEnv("QUIETOS_DB_PATH", "quietos.db"),
		MigrationsDir:       getEnv("QUIETOS_MIGRATIONS_DIR", "migrations"),
		FixturesFile:        getEnv("QUIETOS_FIXTURES_FILE", "testdata/emails/fixtures.json"),
		GroundTruthFile:     getEnv("QUIETOS_GROUND_TRUTH_FILE", "testdata/labels/ground_truth.json"),
		OllamaURL:           getEnv("OLLAMA_URL", "http://localhost:11434"),
		OllamaModel:         getEnv("OLLAMA_MODEL", "gemma2:2b"),
		DefaultAccountEmail: getEnv("DEFAULT_ACCOUNT_EMAIL", "alex.dev@techcorp.internal"),
		DefaultAccountID:    getEnv("DEFAULT_ACCOUNT_ID", "acc-primary-1"),
	}
}
