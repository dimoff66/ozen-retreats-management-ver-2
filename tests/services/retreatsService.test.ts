import { afterEach, describe, it } from "vitest";
import retreatsService from "@/services/retreatsService";
import {
  testCreateRetreat,
  testDeleteRetreat,
  testUpdateRetreat,
} from "../../test-kit/retreat-services/retreatsService";
import { expectServiceTest } from "../helpers/serviceTest";

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const createdRetreatIds = new Set<number>();

async function createDisposableRetreat(suffix: string) {
  const retreat = await retreatsService.createRetreat({
    title: `__TEST__ ${runId} ${suffix}`,
    start_date: "2099-02-01",
    end_date: "2099-02-05",
    is_active: false,
  });

  createdRetreatIds.add(retreat.id);
  return retreat;
}

afterEach(async () => {
  for (const retreatId of [...createdRetreatIds]) {
    const retreat = await retreatsService.getRetreatById(retreatId);

    if (retreat) {
      await retreatsService.deleteRetreat(retreatId);
    }

    createdRetreatIds.delete(retreatId);
  }
});

describe("retreatsService", () => {
  // Проверяем полный цикл создания retreat через сервис и последующее чтение созданной записи.
  it("creates a retreat and reads it back", async () => {
    const title = `__TEST__ ${runId} create`;
    const result = await testCreateRetreat({
      title,
      start_date: "2099-02-01",
      end_date: "2099-02-05",
      is_active: false,
    });
    const created = (await retreatsService.getRetreats()).find(retreat => retreat.title === title);

    if (created) {
      createdRetreatIds.add(created.id);
    }

    expectServiceTest(result);
  });

  // Проверяем изменение основных полей retreat и чтение уже обновлённых данных через сервис.
  it("updates a retreat", async () => {
    const retreat = await createDisposableRetreat("update");
    const result = await testUpdateRetreat(retreat.id, {
      title: `__TEST__ ${runId} updated`,
      end_date: "2099-02-06",
    });

    expectServiceTest(result);
  });

  // Проверяем удаление retreat через публичный метод сервиса и отсутствие записи после удаления.
  it("deletes a retreat", async () => {
    const retreat = await createDisposableRetreat("delete");
    const result = await testDeleteRetreat(retreat.id);

    createdRetreatIds.delete(retreat.id);
    expectServiceTest(result);
  });
});
