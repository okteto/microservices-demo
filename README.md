# Microservices Demo

A demo application with Java, Javascript, Lambda and MongoDB.

## Architecture

![Architecture diagram](architecture.png)

* A front-end web app in [Java](/vote) which lets you vote between Tacos and Burritos
* A [Python](https://bitnami.com/stack/kafka/helm) which collects votes and stores them in MongoDB
* A [MongoDB Atlas](https://www.mongodb.com/atlas) database
* A [Node.js](/result) webapp which shows the results of the voting in real time
