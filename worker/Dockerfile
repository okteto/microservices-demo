FROM golang:1.24.1-bookworm AS dev

COPY bashrc /root/.bashrc

WORKDIR /app

RUN go install github.com/codegangsta/gin@v0.0.0-20230218063734-2c98d96c9244 && \
    go install github.com/go-delve/delve/cmd/dlv@v1.24.0 && \
    go install golang.org/x/tools/gopls@v0.17.1 && \
    go install github.com/air-verse/air@v1.61.5

ADD go.mod ./
RUN go mod download

ADD . .
RUN go mod tidy

RUN --mount=type=cache,target=/root/.cache/go-build CGO_ENABLED=0 GOOS=linux go build -v -o /usr/local/bin/worker main.go

FROM scratch

COPY --from=dev /usr/local/bin/worker /usr/local/bin/worker

ENTRYPOINT ["/usr/local/bin/worker"]