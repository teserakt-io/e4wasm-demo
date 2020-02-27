# E4Wasm demo

This repository is used to build a demonstration application for the [E4 Go client library](https://github.com/teserakt-io/e4go), in WebAssembly, allowing to exposes the E4 endpoints to JavaScript in a web browser.

It contains:
- WebAssembly bindings to the E4 Go client library (under [./bindings/e4wasm.go](./bindings/e4wasm.go))
- An HTML / CSS / JavaScript application (under [./public/](./public/))
- A basic web server (in [./server.go](./server.go) )

## WebAssembly bindings

The WebAssembly bindings exposes `e4js_*` methods, directly bound to their respective E4 Go counterparts:

- `e4js_newClient` to create a new E4 client
- `e4js_protect` to protect MQTT messages
- `e4js_unprotect` to protect MQTT messages
- `e4js_getControlTopic` to retrieve the client control topic

It also embed a custom storage implementation, interfacing directly with the browser `localStorage`, that will be used by the E4 clients to persist their state and keys.

## Demo application

The demonstration application aims to simulate IoT devices connected over a MQTT broker, giving to the user the opportunity to publish and receive messages, either in clear text or protected with E4. It also provides a platform to further test the E4 commercial features from our [public demo](https://console.demo.teserakt.io), such as key rotation, and so without any installation prerequisite.

## Usage

A Makefile is provided allowing to `make build` the WASM bindings as well as the demo webserver, and also start a local server for development with `make serve`.

A dockerfile is also available and can be built with
```
docker build -t e4wasm:latest .
docker run --rm -p 8888:8888 e4wasm:latest
```

Note that this image is copying all resources inside the container on build, and does not rely on a mounted volume, so it's not aimed to be used for development.
