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

$(document).ready(() => {
    var baseLogFunction = console.log;
    console.log = (...arguments) => {
        baseLogFunction.apply(console, arguments);

        var args = Array.prototype.slice.call(arguments);
        for (var i = 0; i < args.length; i++) {
            msgElt = document.createElement("p");
            msgElt.appendChild(document.createTextNode(args[i]));
            $("#messages").append(msgElt);
            $("#messages").scrollTop($('#messages').prop("scrollHeight"));

        }
    };

    var brokerEndpoint = 'wss://mqtt.demo.teserakt.io:8083/mqtt';
    var mqttClient = mqtt.connect(brokerEndpoint);
    mqttClient.on('error', (e) => {
        console.log(e);
    })
    mqttClient.on('connect', (e) => {
        console.log("connected to MQTT broker " + brokerEndpoint);
    })

    var subscribedTopics = [];

    var newClientContainer = $("#newClientContainer").show();
    var messagesContainer = $("#messagesContainer").hide();
    var currentClientName = $("#currentClient");

    var e4ControlTopic = "";

    $("#newClient").submit((e) => {
        e.preventDefault();
        var name = $("#name").val();
        var password = $("#password").val();

        if (e4js_newClient(name, password) === false) {
            return;
        }
        setCurrentClient(name);

        $("#name").val("");
        $("#password").val("")
    });

    $("#savedClients").on("click", ".loadClient", (e) => {
        e.preventDefault();
        var name = $(e.target).text();

        if (e4js_newClient(name, "") === false) {
            return;
        }
        setCurrentClient(name);
    });

    // Delete saved client
    $("#savedClients").on("click", ".deleteClient", (e) => {
        e.preventDefault();
        var name = $(e.target).data('client');
        if (confirm("Delete client " + name + " from storage ?")) {
            localStorage.removeItem(name);
            console.log("deleted client " + name);
            initSavedClientList();
        }
    });


    function setCurrentClient(name) {
        currentClientName.text(name);
        if (name.length === 0) {
            newClientContainer.show();
            messagesContainer.hide();

            for (i in subscribedTopics) {
                mqttClient.unsubscribe(subscribedTopics);
                mqttClient.unsubscribe(e4ControlTopic);
            }

            e4ControlTopic = "";
            subscribedTopics = [];
            console.log("logged out");
            return
        }

        newClientContainer.hide();
        messagesContainer.show();

        e4ControlTopic = e4js_getControlTopic();


        mqttClient.on('message', (topic, message) => {
            console.log("[Received][" + topic + "] " + message)

            msg = e4js_unprotect(message, topic);
            if (msg === false) {
                return;
            }

            if (topic === e4ControlTopic && msg === "") {
                msg = "control message";
            }

            console.log("[Unprotected][" + topic + "] " + msg);
        });

        mqttClient.subscribe(e4ControlTopic, function (err) {
            if (err) {
                console.log("failed to subscribe to control topic");
                return
            }
            console.log("subscribed to E4 control topic " + e4ControlTopic);
        });
    }

    $("#logout").click((e) => {
        e.preventDefault();
        setCurrentClient("");
        initSavedClientList();
    });

    $("#sendMessageForm").submit((e) => {
        e.preventDefault();
        var msg = $("#sendMessage").val();
        var msgBytes = new TextEncoder("utf-8").encode(msg);
        var topic = $("#sendMessageTopic").val();

        var protectedLabel = "";
        if ($("#sendMessageProtect").is(":checked")) {
            msgBytes = e4js_protect(msgBytes, topic);
            if (msgBytes === false) {
                return;
            }
            protectedLabel = "[Protected]";
        }
        mqttClient.publish(topic, msgBytes);
        console.log(protectedLabel + " published message on " + topic);

        $("#sendMessage").val("");
    });

    $("#subscribeTopicForm").submit((e) => {
        e.preventDefault();
        var topic = $("#subscribeTopic").val();
        if (subscribedTopics.includes(topic)) {
            console.log("already subscribed to " + topic);
            return
        }

        mqttClient.subscribe(topic, (err) => {
            if (err) {
                console.log("failed to subscribe to topic: " + err);
                return;
            }
            subscribedTopics.push(topic);
            $("#sendMessageTopic").append(new Option(topic, topic));
            console.log("subscribed to topic: " + topic);
        });


        $("#subscribeTopic").val("");
    });


    // Display saved clients from local storage
    function initSavedClientList() {
        $("#savedClients").html("");
        if (localStorage.length === 0) {
            $("#savedClients").append('<p>no saved clients yet, start by creating one using the above form, and it will be saved automatically!</p>');
        } else {
            for (var i = 0; i < localStorage.length; i++) {
                $("#savedClients").append(
                    `<div class="savedClient">
                        <a class="col-10 btn btn-lg loadClient" href="#">${localStorage.key(i)}</a>
                        <a href="#" data-client="${localStorage.key(i)}" class="btn btn-lg deleteClient">
                            X
                        </a>
                    </div> `
                );
            }
        }
    }

    initSavedClientList();
});
