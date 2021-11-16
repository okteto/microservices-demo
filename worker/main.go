package main

import (
	"log"
	"os"
	"os/signal"

	"database/sql"
	"fmt"

	"github.com/gofrs/uuid"
	_ "github.com/lib/pq"

	kingpin "gopkg.in/alecthomas/kingpin.v2"

	"github.com/Shopify/sarama"
)

var (
	brokerList        = kingpin.Flag("brokerList", "List of brokers to connect").Default("kafka:9092").Strings()
	topic             = kingpin.Flag("topic", "Topic name").Default("votes").String()
	partition         = kingpin.Flag("partition", "Partition number").Default("0").String()
	offsetType        = kingpin.Flag("offsetType", "Offset Type (OffsetNewest | OffsetOldest)").Default("-1").Int()
	messageCountStart = kingpin.Flag("messageCountStart", "Message counter start from:").Int()
)

const (
	host     = "postgresql"
	port     = 5432
	user     = "okteto"
	password = "okteto"
	dbname   = "votes"
)

func main() {
	db := openDatabase()
	defer db.Close()

	pingDatabase(db)

	createTableStmt := `CREATE TABLE IF NOT EXISTS votes (id VARCHAR(255) NOT NULL UNIQUE, vote VARCHAR(255) NOT NULL)`
	if _, err := db.Exec(createTableStmt); err != nil {
		log.Panic(err)
	}

	master := getKafkaMaster()
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
				log.Println(err)
			case msg := <-consumer.Messages():
				*messageCountStart++
				log.Println("Received messages", string(msg.Key), string(msg.Value))

				u, err := uuid.NewV4()
				if err != nil {
					log.Panic(err)
				}
				insertDynStmt := `insert into "votes"("id", "vote") values($1, $2) on conflict(id) do update set vote = $2`
				if _, err := db.Exec(insertDynStmt, u.String(), string(msg.Value)); err != nil {
					log.Panic(err)
				}
			case <-signals:
				log.Println("Interrupt is detected")
				doneCh <- struct{}{}
			}
		}
	}()
	<-doneCh
	log.Println("Processed", *messageCountStart, "messages")
}

func openDatabase() *sql.DB {
	psqlconn := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable", host, port, user, password, dbname)
	for {
		db, err := sql.Open("postgres", psqlconn)
		if err == nil {
			return db
		}
	}
}

func pingDatabase(db *sql.DB) {
	fmt.Println("Waiting for postgresql...")
	for {
		if err := db.Ping(); err == nil {
			fmt.Println("Postgresql connected!")
			return
		}
	}
}

func getKafkaMaster() sarama.Consumer {
	kingpin.Parse()
	config := sarama.NewConfig()
	config.Consumer.Return.Errors = true
	brokers := *brokerList
	fmt.Println("Waiting for kafka...")
	for {
		master, err := sarama.NewConsumer(brokers, config)
		if err == nil {
			fmt.Println("Kafka connected!")
			return master
		}
	}
}
