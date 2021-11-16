FROM openjdk:11

WORKDIR /app
COPY . .
RUN ./mvnw clean package -Dmaven.test.skip=true
RUN cp ./target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]