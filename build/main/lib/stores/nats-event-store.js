"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const cqrs_1 = require("@nestjs/cqrs");
const explorer_service_1 = require("@nestjs/cqrs/dist/services/explorer.service");
const contract_1 = require("../contract");
let NatsEventStore = class NatsEventStore {
    constructor(eventStore, configService, esStreamConfig, explorerService, eventsBus) {
        this.configService = configService;
        this.esStreamConfig = esStreamConfig;
        this.explorerService = explorerService;
        this.eventsBus = eventsBus;
        this.logger = new common_1.Logger(this.constructor.name);
        this.persistentSubscriptions = [];
        this.volatileSubscriptions = [];
        this.eventStore = eventStore;
        this.featureStream = esStreamConfig.featureStreamName;
        this.addEventHandlers(esStreamConfig.eventHandlers);
        if (configService.type === 'nats') {
            if (!this.eventStore.getClient()) {
                this.eventStore.connect(configService.clusterId, configService.clientId, configService.options);
            }
        }
        else {
            throw new Error('Event store type is not supported  - (nats-event-store.ts)');
        }
        this.initSubs();
        this.eventStore.getClient().on('connect', () => {
            this.initSubs();
        });
    }
    initSubs() {
        if (this.esStreamConfig.type === 'nats') {
            const persistentSubscriptions = this.esStreamConfig.subscriptions.filter(sub => {
                return sub.type === contract_1.EventStoreSubscriptionType.Persistent;
            });
            const volatileSubscriptions = this.esStreamConfig.subscriptions.filter(sub => {
                return sub.type === contract_1.EventStoreSubscriptionType.Volatile;
            });
            this.subscribeToPersistentSubscriptions(persistentSubscriptions);
            this.subscribeToVolatileSubscriptions(volatileSubscriptions);
        }
        else {
            throw new Error('Event store type is not supported for feature - nats-event-store.ts');
        }
    }
    async publish(event, stream) {
        var _a;
        if (event === undefined) {
            return;
        }
        if (event === null) {
            return;
        }
        event.handlerType = (_a = event === null || event === void 0 ? void 0 : event.constructor) === null || _a === void 0 ? void 0 : _a.name;
        const payload = Buffer.from(JSON.stringify(event));
        const streamId = this.getStreamId(stream ? stream : this.featureStream);
        try {
            await this.eventStore.getClient().publish(streamId, payload);
        }
        catch (err) {
            this.logger.error(err);
        }
    }
    getStreamId(stream) {
        return `nest-event-store-${stream}`;
    }
    async subscribeToPersistentSubscriptions(subscriptions) {
        if (!this.eventStore.isConnected) {
            return;
        }
        this.persistentSubscriptionsCount = subscriptions.length;
        this.persistentSubscriptions = await Promise.all(subscriptions.map(async (subscription) => {
            return await this.subscribeToPersistentSubscription(this.getStreamId(subscription.stream), subscription.durableName, subscription === null || subscription === void 0 ? void 0 : subscription.startAt, subscription.maxInflight, subscription === null || subscription === void 0 ? void 0 : subscription.ackWait, subscription === null || subscription === void 0 ? void 0 : subscription.manualAcks);
        }));
    }
    async subscribeToVolatileSubscriptions(subscriptions) {
        this.volatileSubscriptionsCount = subscriptions.length;
        this.volatileSubscriptions = await Promise.all(subscriptions.map(async (subscription) => {
            return await this.subscribeToVolatileSubscription(this.getStreamId(subscription.stream), subscription.startAt, subscription.maxInflight, subscription === null || subscription === void 0 ? void 0 : subscription.ackWait, subscription === null || subscription === void 0 ? void 0 : subscription.manualAcks);
        }));
    }
    async subscribeToVolatileSubscription(stream, startAt, maxInFlight, ackWait, manualAcks) {
        this.logger.log(`Volatile and subscribing to stream ${stream}!`);
        try {
            const opts = this.eventStore.getClient().subscriptionOptions();
            opts.setAckWait(ackWait);
            opts.setMaxInFlight(maxInFlight);
            opts.setManualAckMode(manualAcks);
            if (startAt) {
                opts.setStartAtSequence(startAt);
            }
            if (this.configService.type === 'event-store') {
                return;
            }
            const resolved = (await this.eventStore
                .getClient()
                .subscribe(stream, this.configService.groupId, opts));
            resolved.on('message', (msg) => this.onEvent(msg));
            resolved.on('error', (err) => this.onDropped(err));
            this.logger.log('Volatile processing of EventStore events started!');
            resolved.isLive = true;
            return resolved;
        }
        catch (err) {
            this.logger.error(err);
        }
    }
    get allVolatileSubscriptionsLive() {
        const initialized = this.volatileSubscriptions.length === this.volatileSubscriptionsCount;
        return (initialized &&
            this.volatileSubscriptions.every(subscription => {
                return !!subscription && subscription.isLive;
            }));
    }
    get allPersistentSubscriptionsLive() {
        const initialized = this.persistentSubscriptions.length === this.persistentSubscriptionsCount;
        return (initialized &&
            this.persistentSubscriptions.every(subscription => {
                return !!subscription && subscription.isLive;
            }));
    }
    async subscribeToPersistentSubscription(stream, durableName, startAt, maxInFlight, ackWait, manualAcks) {
        try {
            this.logger.log(`
       Connecting to persistent subscription ${durableName} on stream ${stream}!
      `);
            const opts = this.eventStore.getClient().subscriptionOptions();
            opts.setDurableName(durableName);
            if (ackWait) {
                opts.setAckWait(ackWait);
            }
            if (maxInFlight) {
                opts.setMaxInFlight(maxInFlight);
            }
            if (manualAcks) {
                opts.setManualAckMode(manualAcks);
            }
            if (startAt) {
                opts.setStartAtSequence(startAt);
            }
            else {
                opts.setStartWithLastReceived();
            }
            if (this.configService.type === 'event-store') {
                return;
            }
            const resolved = (await this.eventStore
                .getClient()
                .subscribe(stream, this.configService.groupId, opts));
            resolved.isLive = true;
            resolved.on('message', (msg) => this.onEvent(msg));
            resolved.on('error', (err) => this.onDropped(err));
            return resolved;
        }
        catch (err) {
            this.logger.error(err);
        }
    }
    async onEvent(payload) {
        const data = JSON.parse(payload.getRawData().toString());
        const handlerType = data.handlerType;
        delete data.handlerType;
        const handler = this.eventHandlers[handlerType];
        if (!handler) {
            this.logger.error('Received event that could not be handled!');
            return;
        }
        const eventType = payload.getSubject();
        if (this.eventHandlers && this.eventHandlers[handlerType]) {
            this.subject$.next(this.eventHandlers[handlerType](...data));
        }
        else {
            common_1.Logger.warn(`Event of type ${eventType} not handled`, this.constructor.name);
        }
    }
    onDropped(error) {
        this.logger.error('onDropped => ' + error.message);
    }
    get isLive() {
        return false;
    }
    addEventHandlers(eventHandlers) {
        this.eventHandlers = Object.assign(Object.assign({}, this.eventHandlers), eventHandlers);
    }
    onModuleInit() {
        this.subject$ = this.eventsBus.subject$;
        this.bridgeEventsTo(this.eventsBus.subject$);
        this.eventsBus.publisher = this;
    }
    onModuleDestroy() {
        this.eventStore.close();
    }
    async bridgeEventsTo(subject) {
        this.subject$ = subject;
    }
};
NatsEventStore = __decorate([
    common_1.Injectable(),
    __param(0, common_1.Inject(contract_1.ProvidersConstants.EVENT_STORE_PROVIDER)),
    __param(1, common_1.Inject(contract_1.ProvidersConstants.EVENT_STORE_CONNECTION_CONFIG_PROVIDER)),
    __param(2, common_1.Inject(contract_1.ProvidersConstants.EVENT_STORE_STREAM_CONFIG_PROVIDER)),
    __metadata("design:paramtypes", [Object, Object, Object, explorer_service_1.ExplorerService,
        cqrs_1.EventBus])
], NatsEventStore);
exports.NatsEventStore = NatsEventStore;
//# sourceMappingURL=nats-event-store.js.map