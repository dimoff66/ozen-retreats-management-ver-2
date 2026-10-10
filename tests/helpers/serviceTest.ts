import { expect } from "vitest";
import type { ServiceTestResult } from "../../test-kit/retreat-services/types";

export function expectServiceTest(result: ServiceTestResult): void {
  if (result !== true) {
    throw new Error(result);
  }

  expect(result).toBe(true);
}
