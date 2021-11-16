# Microservices Demo

A demo application with Go, Java, Javascript, Kafka and PostgresQL.

## Architecture

![Architecture diagram](architecture.png)

* A front-end web app in [Python](/vote) which lets you vote between two options
* A [Kafka](https://bitnami.com/stack/kafka/helm) queue which collects new votes
* A [Golang](/worker) or worker which consumes votes from Kafka and stores them in PostgresQL
* A [PostgresQL](https://bitnami.com/stack/postgresql/helm) database
* A [Node.js](/result) webapp which shows the results of the voting in real time

## Run the demo application in Okteto

```
$ okteto deploy
```

## Develop on the Result microservice

```
$ okteto up -f result/okteto.yml
```

## Develop on the Vote microservice

```
$ okteto up -f vote/okteto.yml
```

## Develop on the Worker microservice

```
$ okteto up -f worker/okteto.yml
```

## Notes

The voting application only accepts one vote per client. It does not register votes if a vote has already been submitted from a client.

This isn't an example of a properly architected perfectly designed distributed app... it's just a simple
example of the various types of pieces and languages you might see (queues, persistent data, etc), and how to
deal with them in Okteto.
