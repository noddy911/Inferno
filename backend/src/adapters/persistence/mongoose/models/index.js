/**
 * Registers all persistence models. Importing this guarantees every model is compiled
 * before queries run (seed scripts, orchestration services, future Phase 2 CRUD).
 */
export { Client, default as ClientModel } from './client.model.js';
export { Project, default as ProjectModel } from './project.model.js';
export { Room, default as RoomModel } from './room.model.js';
export { Furniture, default as FurnitureModel } from './furniture.model.js';
export { Material, default as MaterialModel } from './material.model.js';
export { Boq, default as BoqModel } from './boq.model.js';
export { Counter, default as CounterModel } from './counter.model.js';
export { Quotation, default as QuotationModel } from './quotation.model.js';
export { Settings, DEFAULT_SETTINGS, default as SettingsModel } from './settings.model.js';
