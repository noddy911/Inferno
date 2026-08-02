/**
 * AI apply repository — persists a validated suggestion as Room + Furniture documents
 * (design §4.5 models). Input is already Zod-validated (`aiSuggestionSchema`) before this
 * layer runs; here we only map to the persistence shape. Returns persisted ids so the
 * caller (and Phase 2 CRUD) can address the created entities.
 */

import { Room } from '../mongoose/models/room.model.js';
import { Furniture } from '../mongoose/models/furniture.model.js';

/**
 * @param {{ projectId: string, rooms: Array<import('../../../domain/ai/dto.js').RoomSuggestion> }} input
 * @returns {Promise<{ rooms: Array<{ roomId: string, name: string, furniture: object[] }>, totalRooms: number, totalFurniture: number }>}
 */
export async function createRoomsWithFurniture({ projectId, rooms }) {
  const persistedRooms = [];
  let totalFurniture = 0;

  for (const room of rooms) {
    const roomDoc = await Room.create({
      projectId,
      name: room.name,
      width: room.width,
      length: room.length,
      height: room.height,
    });

    const furniture = [];
    for (const item of room.furniture) {
      const doc = await Furniture.create({
        roomId: roomDoc._id,
        category: item.category,
        name: item.name,
        width: item.width,
        height: item.height,
        depth: item.depth,
        shelves: item.shelves,
        drawers: item.drawers,
        shutters: item.shutters,
        quantity: item.quantity,
      });
      furniture.push({ furnitureId: doc._id.toString(), ...item });
      totalFurniture += 1;
    }

    persistedRooms.push({ roomId: roomDoc._id.toString(), name: room.name, furniture });
  }

  return { rooms: persistedRooms, totalRooms: persistedRooms.length, totalFurniture };
}
