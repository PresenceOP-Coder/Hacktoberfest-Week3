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

	getEnvCascade := func(primary, fallback, def string) string {
		if v := os.Getenv(primary); v != "" {
			return v
		}
		if v := os.Getenv(fallback); v != "" {
			return v
		}
		return def
	}

	return &Config{
		ServerPort:          getEnv("PORT", "8080"),
		DBPath:              getEnvCascade("SNOOZEBOX_DB_PATH", "QUIETOS_DB_PATH", "quietos.db"),
		MigrationsDir:       getEnvCascade("SNOOZEBOX_MIGRATIONS_DIR", "QUIETOS_MIGRATIONS_DIR", "migrations"),
		FixturesFile:        getEnvCascade("SNOOZEBOX_FIXTURES_FILE", "QUIETOS_FIXTURES_FILE", "testdata/emails/fixtures.json"),
		GroundTruthFile:     getEnvCascade("SNOOZEBOX_GROUND_TRUTH_FILE", "QUIETOS_GROUND_TRUTH_FILE", "testdata/labels/ground_truth.json"),
		OllamaURL:           getEnv("OLLAMA_URL", "http://localhost:11434"),
		OllamaModel:         getEnv("OLLAMA_MODEL", "gemma2:2b"),
		DefaultAccountEmail: getEnv("DEFAULT_ACCOUNT_EMAIL", "alex.dev@techcorp.internal"),
		DefaultAccountID:    getEnv("DEFAULT_ACCOUNT_ID", "acc-primary-1"),
	}
}
