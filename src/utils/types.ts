export interface IdempotencyResult {
  status: number | null | undefined;
  body: any;
  cacheHit: boolean;
}