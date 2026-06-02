# Build stage
FROM maven:3.9.9-eclipse-temurin-22 AS builder

WORKDIR /app

# Copy only pom.xml first to leverage Docker layer caching
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 mvn dependency:go-offline -B

# Copy source code and build
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn clean package -DskipTests

# Dev stage: full Maven + JDK so `okteto up` can run `mvn spring-boot:run`.
# Dependencies are baked into the image (no cache mount) so startup is fast
# even without a persistent volume.
FROM maven:3.9.9-eclipse-temurin-22 AS dev

WORKDIR /app

COPY pom.xml .
RUN mvn dependency:go-offline -B

# Runtime stage
FROM eclipse-temurin:22-jre-jammy

RUN addgroup --system --gid 1001 spring && \
    adduser --system --uid 1001 --gid 1001 spring

WORKDIR /app

# Ensure the non-root user owns the working directory so Okteto file sync
# (which writes a .stignore file into /app) works during `okteto up`.
RUN chown spring:spring /app

# Copy the JAR file from builder stage
COPY --chown=spring:spring --from=builder /app/target/*.jar app.jar

USER spring:spring

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
