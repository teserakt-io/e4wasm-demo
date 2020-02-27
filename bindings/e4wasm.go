// Copyright 2020 Teserakt AG
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package main

import (
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"syscall/js"

	e4 "github.com/teserakt-io/e4go"
	e4crypto "github.com/teserakt-io/e4go/crypto"
)

var errLocalStorageNotFound = errors.New("localStorage: not found")

type localStorage struct {
	key string
}

func newLocalStorage(key string) io.ReadWriteSeeker {
	return &localStorage{
		key: key,
	}
}

func (s *localStorage) Write(p []byte) (n int, err error) {
	dst := hex.EncodeToString(p)
	js.Global().Get("localStorage").Call("setItem", s.key, dst)

	return len(p), nil
}

func (s *localStorage) Read(b []byte) (n int, err error) {
	src := js.Global().Get("localStorage").Call("getItem", s.key)
	if src.Type() == js.TypeNull {
		return 0, errLocalStorageNotFound
	}

	decoded, err := hex.DecodeString(src.String())
	if err != nil {
		return 0, err
	}
	copy(b, decoded)

	return len(b), nil
}

func (s *localStorage) Seek(offset int64, whence int) (idx int64, err error) {
	return 0, nil
}

func newClient(this js.Value, args []js.Value) interface{} {
	name := args[0].String()

	store := newLocalStorage(name)
	var err error

	client, err = e4.LoadClient(store)
	if err != nil {
		if err == errLocalStorageNotFound {
			password := args[1].String()

			client, err = e4.NewClient(&e4.SymNameAndPassword{Name: name, Password: password}, store)
			if err != nil {
				fmt.Printf("failed to create client: %v\n", err)
				return js.ValueOf(false)
			}

			key, err := e4crypto.DeriveSymKey(password)
			if err != nil {
				fmt.Printf("failed to derive key: %v\n", err)
				return js.ValueOf(false)
			}

			fmt.Printf("created client: %s. Key: %x\n", name, key)
			fmt.Println("use this key to create a client on https://console.demo.teserakt.io, it won't be printed again.")
			return js.ValueOf(true)

		}
		fmt.Printf("failed to load client: %v\n", err)
		return js.ValueOf(false)

	}

	fmt.Printf("loaded client %s from store\n", name)

	return js.ValueOf(true)
}

func protect(this js.Value, args []js.Value) interface{} {
	payload := make([]byte, args[0].Length())
	js.CopyBytesToGo(payload, args[0])
	topic := args[1].String()

	protected, err := client.ProtectMessage(payload, topic)
	if err != nil {
		fmt.Printf("failed to protect message: %v\n", err)
		return js.ValueOf(false)
	}

	jsProtected := js.Global().Get("Uint8Array").New(len(protected))
	js.CopyBytesToJS(jsProtected, protected)
	return js.ValueOf(jsProtected)
}

func unprotect(this js.Value, args []js.Value) interface{} {
	payload := make([]byte, args[0].Length())
	js.CopyBytesToGo(payload, args[0])
	topic := args[1].String()

	clear, err := client.Unprotect(payload, topic)
	if err != nil {
		fmt.Printf("failed to unprotect message: %v\n", err)
		return js.ValueOf(false)
	}

	return js.ValueOf(string(clear))
}

func getControlTopic(this js.Value, args []js.Value) interface{} {
	return js.ValueOf(client.GetReceivingTopic())
}

var client e4.Client

func main() {
	c := make(chan struct{}, 0)

	js.Global().Set("e4js_newClient", js.FuncOf(newClient))
	js.Global().Set("e4js_protect", js.FuncOf(protect))
	js.Global().Set("e4js_unprotect", js.FuncOf(unprotect))
	js.Global().Set("e4js_getControlTopic", js.FuncOf(getControlTopic))
	fmt.Println("WASM Go Initialized")

	<-c
}
