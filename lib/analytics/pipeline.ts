/**
 * Overview must read MetricSnapshot / Post from DB (+ CacheStore).
 * Never call PlatformAdapter.fetch* on the Overview request path.
 * Live platform I/O belongs in JobQueue workers (Phase 1+).
 */
export async function readOverview(userId: string): Promise<{
  userId: string;
  empty: true;
  wins: [];
  issues: [];
}> {
  return { userId, empty: true, wins: [], issues: [] };
}
