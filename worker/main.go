package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"time"

	_ "github.com/lib/pq"

	kingpin "github.com/alecthomas/kingpin/v2"

	"github.com/IBM/sarama"
)

var (
	brokerList             = kingpin.Flag("brokerList", "List of brokers to connect").Default("kafka:9092").Strings()
	topic                  = kingpin.Flag("topic", "Topic name").Default("votes").String()
	messageCountStart      = kingpin.Flag("messageCountStart", "Message counter start from:").Int()
	retryMaxAttempts       = kingpin.Flag("retry-max-attempts", "Max retry attempts (0=infinite)").Default("0").Int()
	retryInitialBackoffMs  = kingpin.Flag("retry-initial-backoff-ms", "Initial backoff in milliseconds").Default("1000").Int()
)

const (
	host     = "postgresql"
	port     = 5432
	user     = "okteto"
	password = "okteto"
	dbname   = "votes"
)

func main() {
	kingpin.Parse()

	ctx := context.Background()

	// --- Postgres connection strategy ---
	psqlConn := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable", host, port, user, password, dbname)
	pgStrategy := NewPostgresStrategy(psqlConn)
	if err := RetryUntilConnected(ctx, pgStrategy, *retryMaxAttempts, time.Duration(*retryInitialBackoffMs)*time.Millisecond); err != nil {
		log.Panic(err)
	}
	db := pgStrategy.DB
	defer db.Close()

	dropTableStmt := `DROP TABLE IF EXISTS votes`
	if _, err := db.Exec(dropTableStmt); err != nil {
		log.Panic(err)
	}

	createTableStmt := `CREATE TABLE IF NOT EXISTS votes (id VARCHAR(255) NOT NULL UNIQUE, vote VARCHAR(255) NOT NULL)`
	if _, err := db.Exec(createTableStmt); err != nil {
		log.Panic(err)
	}

	// --- Kafka connection strategy ---
	kafkaStrategy := NewKafkaStrategy(*brokerList)
	if err := RetryUntilConnected(ctx, kafkaStrategy, *retryMaxAttempts, time.Duration(*retryInitialBackoffMs)*time.Millisecond); err != nil {
		log.Panic(err)
	}
	master := kafkaStrategy.Consumer
	defer master.Close()

	consumer, err := master.ConsumePartition(*topic, 0, sarama.OffsetOldest)
	if err != nil {
		log.Panic(err)
	}

	signals := make(chan os.Signal, 1)
	signal.Notify(signals, os.Interrupt)
	doneCh := make(chan struct{})
	go func() {
		for {
			select {
			case err := <-consumer.Errors():
				fmt.Println(err)
			case msg := <-consumer.Messages():
				*messageCountStart++
				fmt.Printf("Received message: user %s vote %s\n", string(msg.Key), string(msg.Value))

				insertDynStmt := `insert into "votes"("id", "vote") values($1, $2) on conflict(id) do update set vote = $2`
				if _, err := db.Exec(insertDynStmt, *messageCountStart, string(msg.Value)); err != nil {
					log.Panic(err)
				}
			case <-signals:
				fmt.Println("Interrupt is detected")
				doneCh <- struct{}{}
			}
		}
	}()
	<-doneCh
	log.Println("Processed", *messageCountStart, "messages")
}
