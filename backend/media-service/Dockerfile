FROM golang:1.22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache git
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go mod tidy && go build -o /app/server ./main.go

FROM alpine:3.19
RUN apk add --no-cache ca-certificates wget
WORKDIR /app
COPY --from=builder /app/server .
EXPOSE 8084
CMD ["./server"]
