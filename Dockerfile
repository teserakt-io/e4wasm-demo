FROM golang:1.13-alpine as builder


COPY . /app

WORKDIR /app

RUN GOARCH=wasm GOOS=js go build -o ./public/e4.wasm bindings/e4wasm.go
RUN go build -o ./server server.go

FROM alpine

COPY --from=builder /app/public /app/public
COPY --from=builder /app/server /app/server

EXPOSE 8888

WORKDIR /app

CMD ["./server"]
