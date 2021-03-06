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
const node_eventstore_client_1 = require("node-eventstore-client");
class EventStoreBroker {
    constructor() {
        this.logger = new common_1.Logger(this.constructor.name);
        this.type = 'event-store';
    }
    connect(options, endpoint) {
        try {
            this.client = node_eventstore_client_1.createConnection(options, endpoint);
            this.client.connect();
            this.client.on('connected', () => {
                this.isConnected = true;
                this.logger.log('EventStore connected!');
            });
            this.client.on('closed', () => {
                this.isConnected = false;
                this.logger.error('EventStore closed!');
                this.connect(options, endpoint);
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
exports.EventStoreBroker = EventStoreBroker;
//# sourceMappingURL=event-store.broker.js.map