.PHONY: help
help: ## This help.
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

.PHONY: build
build: ## Build the webassembly sources and demo webserver
	GOARCH=wasm GOOS=js go build -o ./public/e4.wasm bindings/e4wasm.go
	go build -o ./server server.go

.PHONY: serve
serve: build ## Launch local webserver
	./server
