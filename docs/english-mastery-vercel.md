# Vercel preview/staging

Target is the EXISTING Smart Plan project `smart-plan`, project `prj_9Trq1yqZHTalKScaaltT1DJBG58o`, team `distinycate-s-projects`. Connector access was restored and project/account identity, Next.js framework, Node24.x and deployment protection were verified on 2026-10-25. Its old host production deployment is READY; no new EMH preview or staging deployment is claimed. See [live readiness findings](english-mastery-live-readiness.md) before deployment.

`vercel.json` disables automatic deployment ONLY for `feature/english-mastery-integration` until environment isolation is verified. It does not change main/production branch behavior. See https://vercel.com/docs/project-configuration/git-configuration . Keep this guard when pushing unverified integration work.

After an isolated Supabase staging target is approved:

1. Confirm project, GitHub `Distinycate/Smart-plan`, branch/commit, root directory and Node24 runtime. Never substitute the old similarly named Smartplan repository.
2. Set Preview branch-specific Supabase URL/anon/server key to the approved staging project. Do not inherit production secrets. Set EMH_ENABLED=true and EMH_ENV=staging; configure genuine recording policy only when approved. AI remains off. Never configure EMH_TEST_PROVIDER or test fixture secrets on Vercel.
3. Verify migration/import/bootstrap and real Supabase checks first.
4. With an authenticated, reviewed Vercel CLI, run the following from this repository. Inspect linked metadata before proceeding; pull to a fresh private file rather than overwriting local secrets.

```sh
vercel link --project smart-plan --scope distinycate-s-projects
vercel env ls preview
vercel pull --environment=preview --git-branch=feature/english-mastery-integration
vercel build
vercel deploy --prebuilt
```

No `--prod`, promote, production domain reassignment or billing upgrade is authorized by this runbook. Preview Secret values may not be returned by pull; arrange approved development/staging credentials privately, never retrieve production credentials to work around this.

5. Record resulting URL/commit/environment and READY/build logs. Check signed-in learner/author/reviewer/admin flows, cookies, cache/no-store, private storage, existing plans and PDF/Word export on that exact deployment. If protected, use the approved Vercel access flow, not a weakened deployment-protection setting.
6. Review logs for errors without recording sensitive responses/audio/URLs. Enable the branch's Git deployment only after these gates are satisfied. Merge/production release requires a separate approval and rollback plan.
