FROM golang:1.27.2-bookworm AS deps

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

FROM deps AS dev

COPY bashrc /root/.bashrc

RUN go install github.com/codegangsta/gin@v0.0.0-20230218063734-2c98d96c9244 && \
    go install github.com/go-delve/delve/cmd/dlv@v1.27.2 && \
    go install golang.org/x/tools/gopls@v0.23.0 && \
    go install github.com/air-verse/air@v1.67.4

COPY . .

FROM deps AS build

COPY . .
RUN --mount=type=cache,target=/root/.cache/go-build CGO_ENABLED=0 GOOS=linux go build -v -o /usr/local/bin/worker main.go

FROM scratch

COPY --from=build /usr/local/bin/worker /usr/local/bin/worker

ENTRYPOINT ["/usr/local/bin/worker"]