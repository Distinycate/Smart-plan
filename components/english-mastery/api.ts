export type Data = Record<string, any>;
export async function api(operation: string, input: Data = {}) {
  const response = await fetch(`/api/english/${operation}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const result = await response.json();
  if (!response.ok || !result.success)
    throw new Error(result.error || "REQUEST_FAILED");
  return result.data;
}
