import retreatsService from "@/services/retreatsService";
import type { CreateRetreat, UpdateRetreat } from "@/services/database";
import { assertTest, runServiceTest } from "./types";
import type { ServiceTestResult } from "./types";

export async function testCreateRetreat(retreat: CreateRetreat): Promise<ServiceTestResult> {
  return runServiceTest(async () => {
    const created = await retreatsService.createRetreat(retreat);
    const loaded = await retreatsService.getRetreatById(created.id);

    assertTest(loaded !== null, "Created retreat cannot be loaded.");
    assertTest(loaded.title === retreat.title, "Created retreat title does not match.");
    assertTest(loaded.start_date === retreat.start_date, "Created retreat start date does not match.");
    assertTest(loaded.end_date === retreat.end_date, "Created retreat end date does not match.");
  });
}

export async function testUpdateRetreat(
  retreatId: number,
  changes: UpdateRetreat
): Promise<ServiceTestResult> {
  return runServiceTest(async () => {
    const updated = await retreatsService.updateRetreat(retreatId, changes);
    const loaded = await retreatsService.getRetreatById(retreatId);

    assertTest(loaded !== null, "Updated retreat cannot be loaded.");

    Object.entries(changes).forEach(([key, value]) => {
      if (value !== undefined) {
        const actual = updated[key as keyof typeof updated];
        assertTest(actual === value, `Updated retreat field ${key} does not match.`);
      }
    });
  });
}

export async function testDeleteRetreat(retreatId: number): Promise<ServiceTestResult> {
  return runServiceTest(async () => {
    await retreatsService.deleteRetreat(retreatId);
    const loaded = await retreatsService.getRetreatById(retreatId);

    assertTest(loaded === null, "Deleted retreat still exists.");
  });
}
