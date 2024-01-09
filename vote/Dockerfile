FROM maven:3-openjdk-17

WORKDIR /app
COPY . .
RUN mvn clean package
RUN cp ./target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
