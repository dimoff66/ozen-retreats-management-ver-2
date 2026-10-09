export type ServiceTestResult = true | string;

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function assertTest(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export async function runServiceTest(action: () => Promise<void>): Promise<ServiceTestResult> {
  try {
    await action();
    return true;
  } catch (error) {
    return getErrorMessage(error);
  }
}
