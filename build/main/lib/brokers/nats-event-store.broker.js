"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const assert_1 = __importDefault(require("assert"));
const uuid = __importStar(require("uuid"));
const node_nats_streaming_1 = require("node-nats-streaming");
class NatsEventStoreBroker {
    constructor() {
        this.logger = new common_1.Logger(this.constructor.name);
        this.type = 'nats';
        this.clientId = uuid.v4();
    }
    connect(clusterId, clientId, options) {
        try {
            if (clientId) {
                this.clientId = clientId;
            }
            this.client = node_nats_streaming_1.connect(clusterId, this.clientId, options);
            this.client.on('connect', () => {
                this.isConnected = true;
                this.logger.log('Nats Streaming EventStore connected!');
            });
            this.client.on('disconnect:', () => {
                this.isConnected = false;
                this.logger.error('Nats Streaming EventStore disconnected!');
                this.connect(clusterId, this.clientId, options);
            });
            this.client.on('close:', () => {
                this.isConnected = false;
                this.logger.error('Nats Streaming EventStore closed!');
                this.connect(clusterId, this.clientId, options);
            });
            return this;
        }
        catch (e) {
            this.logger.error(e);
            throw new Error(e);
        }
    }
    getClient() {
        return this.client;
    }
    newEvent(name, payload) {
        return this.newEventBuilder(name, payload);
    }
    newEventBuilder(eventType, data, metadata, eventId) {
        assert_1.default(eventType);
        assert_1.default(data);
        const event = {
            eventId: eventId || uuid.v4(),
            eventType,
            data
        };
        if (metadata !== undefined) {
            event.metadata = metadata;
        }
        return event;
    }
    close() {
        this.client.close();
        return this;
    }
}
exports.NatsEventStoreBroker = NatsEventStoreBroker;
//# sourceMappingURL=nats-event-store.broker.js.map