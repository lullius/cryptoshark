"use strict";

const Disassembler = require('./disassembler');
const ModuleMap = require('./module-map');
const ModuleMonitor = require('./module-monitor');
const ThreadMonitor = require('./thread-monitor');
const ThreadTracer = require('./thread-tracer');
const mixIn = require('mout/object/mixIn');

const services = {};
const stanzaHandlers = {};

ModuleMap.build().then(start);

function start(moduleMap) {
    services.moduleMonitor = new ModuleMonitor(moduleMap);
    services.threadMonitor = new ThreadMonitor();
    services.tracer = new ThreadTracer(moduleMap);
    services.disassembler = new Disassembler();

    mixIn(stanzaHandlers, collectHandlers(services));

    recv(onStanza);
}

function onStanza(stanza) {
    const handler = stanzaHandlers[stanza.name];
    if (handler) {
        handler(stanza.payload)
        .then(function (result) {
            send({id: stanza.id, payload: result});
        }, function (error) {
            throw new Error("Error processing " + stanza.name + ": " + error);
        });
    } else {
        throw new Error("Unknown stanza: " + stanza.name);
    }

    recv(onStanza);
}

function collectHandlers(services) {
    const result = {};
    for (let key in services) {
        if (services.hasOwnProperty(key)) {
            let service = services[key];
            let handlers = service.handlers;
            for (let name in handlers) {
                if (handlers.hasOwnProperty(name)) {
                    result[name] = handlers[name].bind(service);
                }
            }
        }
    }
    return result;
}
