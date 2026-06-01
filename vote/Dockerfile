# Build stage
FROM maven:3.9.9-eclipse-temurin-22 AS builder

WORKDIR /app

# Copy only pom.xml first to leverage Docker layer caching
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 mvn dependency:go-offline -B

# Copy source code and build
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:22-jre-jammy

RUN addgroup --system --gid 1001 spring && \
    adduser --system --uid 1001 --gid 1001 spring

WORKDIR /app

# Copy the JAR file from builder stage
COPY --chown=spring:spring --from=builder /app/target/*.jar app.jar

USER spring:spring

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
