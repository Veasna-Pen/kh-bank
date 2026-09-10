const PG_UNIQUE_VIOLATION = '23505';

export function isUniqueViolation(error: unknown): boolean {
  const cause = (error as { cause?: unknown } | undefined)?.cause;
  return [error, cause].some(
    (e) => (e as { code?: string } | undefined)?.code === PG_UNIQUE_VIOLATION,
  );
}
