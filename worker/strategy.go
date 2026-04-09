package main

import (
    "context"
    "database/sql"
    "fmt"
    "math/rand"
    "time"

    "github.com/IBM/sarama"
)

// ConnectStrategy defines a pluggable connection behavior.
type ConnectStrategy interface {
    // Name returns a friendly name for the strategy (used in logs/errors)
    Name() string
    // Connect attempts to establish the resource; on success it should store
    // the resource on the strategy instance for retrieval by the caller.
    Connect(ctx context.Context) error
}

// PostgresStrategy implements ConnectStrategy for PostgreSQL.
type PostgresStrategy struct {
    ConnStr string
    DB      *sql.DB
}

func NewPostgresStrategy(connStr string) *PostgresStrategy {
    return &PostgresStrategy{ConnStr: connStr}
}

func (s *PostgresStrategy) Name() string { return "postgresql" }

func (s *PostgresStrategy) Connect(ctx context.Context) error {
    db, err := sql.Open("postgres", s.ConnStr)
    if err != nil {
        return err
    }
    // Ping with a short timeout derived from the parent context.
    pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()
    if err := db.PingContext(pingCtx); err != nil {
        _ = db.Close()
        return err
    }
    s.DB = db
    return nil
}

// KafkaStrategy implements ConnectStrategy for Kafka (sarama consumer).
type KafkaStrategy struct {
    Brokers  []string
    Config   *sarama.Config
    Consumer sarama.Consumer
}

func NewKafkaStrategy(brokers []string) *KafkaStrategy {
    cfg := sarama.NewConfig()
    cfg.Consumer.Return.Errors = true
    return &KafkaStrategy{Brokers: brokers, Config: cfg}
}

func (k *KafkaStrategy) Name() string { return "kafka" }

func (k *KafkaStrategy) Connect(ctx context.Context) error {
    // sarama does not accept context, so keep the call simple and rely on
    // the retry executor to re-attempt if it fails.
    master, err := sarama.NewConsumer(k.Brokers, k.Config)
    if err != nil {
        return err
    }
    k.Consumer = master
    return nil
}

func init() {
    rand.Seed(time.Now().UnixNano())
}

// RetryUntilConnected executes the provided strategy and retries using
// exponential backoff with jitter until it succeeds, the context is
// cancelled, or maxAttempts is reached (0 = infinite).
func RetryUntilConnected(ctx context.Context, strategy ConnectStrategy, maxAttempts int, initialBackoff time.Duration) error {
    if initialBackoff <= 0 {
        initialBackoff = 1 * time.Second
    }
    backoff := initialBackoff
    attempt := 0
    for {
        attempt++
        if err := strategy.Connect(ctx); err == nil {
            return nil
        } else {
            if maxAttempts > 0 && attempt >= maxAttempts {
                return fmt.Errorf("failed to connect %s after %d attempts: %w", strategy.Name(), attempt, err)
            }
            // jitter up to backoff/2
            jitter := time.Duration(rand.Int63n(int64(backoff / 2)))
            wait := backoff + jitter
            select {
            case <-time.After(wait):
                // continue and increase backoff
            case <-ctx.Done():
                return ctx.Err()
            }
            backoff = backoff * 2
            if backoff > 30*time.Second {
                backoff = 30 * time.Second
            }
        }
    }
}
