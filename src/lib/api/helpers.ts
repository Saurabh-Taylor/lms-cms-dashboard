export function ok<T>(data: T, init?: ResponseInit) {
  return Response.json(data, init);
}

export function fail(status: number, message: string) {
  return Response.json({ error: { message } }, { status });
}
