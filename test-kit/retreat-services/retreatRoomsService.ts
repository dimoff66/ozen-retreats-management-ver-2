import retreatRoomsService from "@/services/retreatRoomsService";
import type { RetreatRoomSetting } from "@/services/retreatRoomsService";
import { assertTest, runServiceTest } from "./types";
import type { ServiceTestResult } from "./types";

export async function testSaveRetreatRooms(
  retreatId: number,
  settings: RetreatRoomSetting[]
): Promise<ServiceTestResult> {
  return runServiceTest(async () => {
    await retreatRoomsService.saveRetreatRooms(retreatId, settings);
    const saved = await retreatRoomsService.getRetreatRooms(retreatId);

    settings.forEach((setting) => {
      const row = saved.find((item) => item.room_id === setting.roomId);

      if (!setting.isAvailable) {
        assertTest(!row, `Room ${setting.roomId} is still available for the retreat.`);
        return;
      }

      assertTest(Boolean(row), `Room ${setting.roomId} was not enabled for the retreat.`);
      assertTest(
        row?.max_guests === Math.max(1, setting.maxGuests),
        `Room ${setting.roomId} max_guests does not match.`
      );
    });
  });
}

export async function testRejectOccupiedRoomDisable(
  retreatId: number,
  roomId: number,
  currentMaxGuests: number
): Promise<ServiceTestResult> {
  try {
    await retreatRoomsService.saveRetreatRooms(retreatId, [{
      roomId,
      isAvailable: false,
      maxGuests: currentMaxGuests,
    }]);
    return "Occupied retreat room was disabled instead of being rejected.";
  } catch {
    return true;
  }
}
