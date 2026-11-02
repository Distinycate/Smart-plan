import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { isAuthorizationError } from "@/lib/auth/authorization";
import { context } from "@/lib/english-mastery/server";
import { EnglishService } from "@/lib/english-mastery/service";
import { MediaService } from "@/lib/english-mastery/media";
import { DomainError, ensure } from "@/lib/english-mastery/repository";
import { identifier } from "@/lib/english-mastery/policy";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function boundedBody(request: NextRequest, limit: number) {
  ensure(
    Number(request.headers.get("content-length") || 0) <= limit,
    "REQUEST_TOO_LARGE",
    413,
  );
  const reader = request.body?.getReader();
  ensure(reader, "BODY_REQUIRED");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      ensure(size <= limit, "REQUEST_TOO_LARGE", 413);
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel();
    throw error;
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ operation: string }> },
) {
  const params = await props.params;
  try {
    const origin = request.headers.get("origin");
    ensure(origin, "ORIGIN_DENIED", 403);
    // Next's internal request URL may use localhost behind a reverse proxy.
    // Match the browser Origin against the actual Host; never trust forwarded-host.
    const parsedOrigin = new URL(origin);
    ensure(
      parsedOrigin.host === request.headers.get("host") &&
        ["http:", "https:"].includes(parsedOrigin.protocol),
      "ORIGIN_DENIED",
      403,
    );
    ensure(
      request.headers.get("sec-fetch-site") !== "cross-site",
      "ORIGIN_DENIED",
      403,
    );
    const { actor, repository, client } = await context();
    const service = new EnglishService(repository, actor);
    await service.rateLimit();
    let result: any;
    if (params.operation === "upload") {
      ensure(
        Number(request.headers.get("content-length") || 0) <= 3400000,
        "AUDIO_SIZE_LIMIT",
        413,
      );
      const bytes = await boundedBody(request, 3400000);
      const form = await new Response(bytes, {
          headers: {
            "Content-Type": request.headers.get("content-type") || "",
          },
        }).formData(),
        file = form.get("audio");
      ensure(file instanceof File, "AUDIO_REQUIRED");
      result = await new MediaService(service, client).upload(
        identifier.parse(form.get("attemptId")),
        identifier.parse(form.get("itemId")),
        new Uint8Array(await file.arrayBuffer()),
        form.get("consent") === "true",
      );
    } else {
      ensure(
        request.headers.get("content-type")?.includes("application/json"),
        "JSON_REQUIRED",
        415,
      );
      const body = new TextDecoder().decode(await boundedBody(request, 200000));
      const input = JSON.parse(body);
      if (params.operation === "purgeExpired") {
        ensure(typeof input.dryRun === "boolean", "DRY_RUN_REQUIRED");
        result = await new MediaService(service, client).purgeExpired(
          input.dryRun,
        );
      } else if (
        params.operation === "playback" ||
        params.operation === "deleteAudio"
      ) {
        const id = identifier.parse(input.id),
          media = new MediaService(service, client);
        result =
          params.operation === "playback"
            ? await media.playback(id)
            : await media.delete(id);
      } else result = await service.run(params.operation, input);
    }
    return NextResponse.json(
      { success: true, data: result },
      {
        headers: {
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch (error) {
    const status =
      error instanceof DomainError
        ? error.status
        : isAuthorizationError(error)
          ? error.httpStatus
          : error instanceof ZodError || error instanceof SyntaxError
            ? 400
            : 503;
    const code =
      error instanceof DomainError
        ? error.code
        : isAuthorizationError(error)
          ? error.code
          : status === 400
            ? "INVALID_INPUT"
            : "SERVICE_UNAVAILABLE";
    return NextResponse.json(
      { success: false, error: code },
      { status, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
