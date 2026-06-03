# Database Migrations

**WARNING: DO NOT RUN `schema.sql` ON PRODUCTION!**
The `schema.sql` file contains destructive commands like `DROP TABLE ... CASCADE` which will delete all existing data in production.

For any database changes to a live Supabase project, you must create a new safe migration file in this directory.

## Migration Rules:
1. Always run one migration at a time.
2. Only use **non-destructive** changes.
3. Use `ADD COLUMN IF NOT EXISTS`.
4. Never use `DROP TABLE` or `TRUNCATE` in these files.
5. Backup your Supabase data before running a migration via SQL Editor.
6. Verify your changes on a single table before proceeding.
