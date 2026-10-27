/** TEST-ONLY Supabase HTTP contract double over real PostgreSQL (PGlite).
 * Not imported by application code. Does not claim to be real GoTrue/Storage.
 */
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { database, SqlRepository, USERS } from "./database";
import { importPackages } from "../../lib/english-mastery/content";
import { insert, TABLES } from "../../lib/english-mastery/repository";
import { PERMISSIONS } from "../../lib/english-mastery/policy";
async function main() {
  if (process.env.EMH_TEST_PROVIDER !== "local-contract-only")
    throw Error("TEST_ONLY");
  const db = await database(),
    repo = new SqlRepository(db);
  await importPackages(repo, USERS.author, false);
  for (const [name, id] of Object.entries(USERS)) {
    const permissions =
      name === "learner"
        ? ["english.learn", "english.preview"]
        : name === "other"
          ? ["english.learn"]
          : PERMISSIONS;
    await repo.commit(
      permissions.map((permission) =>
        insert("permissions", `${id}:${permission}`, id, {
          permission,
          units: ["*"],
          reviewTypes: ["*"],
        }),
      ),
    );
  }
  const tokens = new Map<string, any>(),
    objects = new Map<string, { bytes: Buffer; mime: string }>(),
    links = new Map<string, string>();
  const server = createServer(async (req, res) => {
    const url = new URL(req.url!, "http://127.0.0.1:54401");
    const json = (data: any, status = 200) => {
      res.writeHead(status, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      res.end(JSON.stringify(data));
    };
    try {
      if (url.pathname === "/health") return json({ testOnly: true });
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const bytes = Buffer.concat(chunks);
      const body = () => (bytes.length ? JSON.parse(bytes.toString()) : {});
      const bearer = req.headers.authorization?.replace(/^Bearer /, "") || "",
        user = tokens.get(bearer),
        service = bearer === "local-test-service";
      if (url.pathname === "/auth/v1/token") {
        const input = body(),
          name = input.email?.split("@")[0] as keyof typeof USERS,
          id = USERS[name];
        if (!id || input.password !== "local-fixture-password")
          return json({ message: "Invalid credentials" }, 400);
        const value = {
          id,
          email: input.email,
          role: "authenticated",
          aud: "authenticated",
          created_at: new Date().toISOString(),
          app_metadata: { provider: "email" },
          user_metadata: { full_name: `Test ${name}` },
        };
        const token = `${Buffer.from('{"alg":"HS256"}').toString("base64url")}.${Buffer.from(JSON.stringify({ sub: id, exp: Math.floor(Date.now() / 1000) + 3600, role: "authenticated" })).toString("base64url")}.local-test-only`;
        tokens.set(token, value);
        return json({
          access_token: token,
          refresh_token: randomUUID(),
          token_type: "bearer",
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: value,
        });
      }
      if (url.pathname === "/auth/v1/user")
        return user ? json(user) : json({ message: "Unauthorized" }, 401);
      if (url.pathname === "/auth/v1/logout") {
        tokens.delete(bearer);
        return json({});
      }
      if (url.pathname === "/rest/v1/profiles") {
        if (!user) return json({ message: "Unauthorized" }, 401);
        const profile = {
          id: user.id,
          role: user.id === USERS.author ? "admin" : "user",
          full_name: user.user_metadata.full_name,
          email: user.email,
          grade_levels: "[]",
        };
        return json(
          req.headers.accept?.includes("object") ? profile : [profile],
        );
      }
      if (url.pathname === "/rest/v1/rpc/emh_commit") {
        if (!service) return json({ message: "permission denied" }, 403);
        try {
          await repo.commit(body().changes);
          return json(null);
        } catch (e: any) {
          return json(
            {
              code:
                e.code === "REVISION_CONFLICT" ? "23505" : e.code || "P0001",
              message: e.message,
            },
            409,
          );
        }
      }
      if (url.pathname.startsWith("/rest/v1/emh_")) {
        if (!service) return json({ message: "permission denied" }, 403);
        const table = url.pathname.replace("/rest/v1/emh_", "") as any;
        if (!TABLES.includes(table)) return json({}, 404);
        let rows = await repo.list(table);
        for (const field of ["id", "owner_id"]) {
          const filter = url.searchParams.get(field);
          if (filter?.startsWith("eq."))
            rows = rows.filter((r) => (r as any)[field] === filter.slice(3));
        }
        const offset = Number(url.searchParams.get("offset") || 0),
          limit = Number(url.searchParams.get("limit") || 500);
        rows = rows.slice(offset, offset + limit);
        return json(
          req.headers.accept?.includes("object") ? rows[0] || null : rows,
        );
      }
      if (url.pathname.startsWith("/storage/v1/object/sign/")) {
        const key = decodeURIComponent(
          url.pathname.replace("/storage/v1/object/sign/", ""),
        );
        if (req.method === "POST") {
          if (!service || !objects.has(key)) return json({}, 403);
          const token = randomUUID();
          links.set(token, key);
          return json({ signedURL: `/object/sign/${key}?token=${token}` });
        }
        if (
          links.get(url.searchParams.get("token") || "") !== key ||
          !objects.has(key)
        )
          return json({}, 403);
        const object = objects.get(key)!;
        res.writeHead(200, { "Content-Type": object.mime });
        return res.end(object.bytes);
      }
      if (url.pathname.startsWith("/storage/v1/object/")) {
        if (!service) return json({}, 403);
        const key = decodeURIComponent(
          url.pathname.replace("/storage/v1/object/", ""),
        );
        if (req.method === "DELETE") {
          for (const prefix of body().prefixes)
            objects.delete(`${key}/${prefix}`);
          return json([]);
        }
        objects.set(key, { bytes, mime: String(req.headers["content-type"]) });
        return json({ Key: key });
      }
      // Existing host empty fixture collections; no teacher data touched.
      if (url.pathname.startsWith("/rest/v1/")) return json([]);
      json({}, 404);
    } catch (e) {
      console.error("Local contract provider failure:", (e as Error).message);
      json({ message: "TEST_PROVIDER_ERROR" }, 500);
    }
  });
  server.listen(54401, "127.0.0.1", () =>
    console.log("Local test provider ready"),
  );
  process.on("SIGTERM", () => {
    server.close();
    void db.close().then(() => process.exit(0));
  });
}
void main();
