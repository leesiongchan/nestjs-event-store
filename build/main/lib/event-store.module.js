"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var EventStoreModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const event_store_core_module_1 = require("./event-store-core.module");
const cqrs_1 = require("@nestjs/cqrs");
let EventStoreModule = EventStoreModule_1 = class EventStoreModule {
    static register(option) {
        return {
            module: EventStoreModule_1,
            imports: [event_store_core_module_1.EventStoreCoreModule.register(option)]
        };
    }
    static registerAsync(option) {
        return {
            module: EventStoreModule_1,
            imports: [event_store_core_module_1.EventStoreCoreModule.registerAsync(option)]
        };
    }
    static registerFeature(config) {
        return {
            module: EventStoreModule_1,
            imports: [event_store_core_module_1.EventStoreCoreModule.registerFeature(config)]
        };
    }
    static registerFeatureAsync(options) {
        return {
            module: EventStoreModule_1,
            imports: [event_store_core_module_1.EventStoreCoreModule.registerFeatureAsync(options)]
        };
    }
};
EventStoreModule = EventStoreModule_1 = __decorate([
    common_1.Module({
        imports: [cqrs_1.CqrsModule]
    })
], EventStoreModule);
exports.EventStoreModule = EventStoreModule;
//# sourceMappingURL=event-store.module.js.map