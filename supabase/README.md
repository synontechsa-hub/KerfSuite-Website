# KerfSuite Supabase migrations

The database is managed as an ordered migration sequence.

## Files

1. `202607270000_initial_schema.sql` creates the original KerfSuite tables, enums, functions, and trigger without the legacy permission block.
2. `202607270001_security_baseline.sql` upgrades the schema to version 1.2.0 and defines the authoritative constraints, RLS policies, RPCs, triggers, and grants.

Do not run the repository-root `schema.sql` against a new database. It is retained as the pre-hardening 1.1.0 reference.

## Current development database

The existing development database already contains the 1.1.0 objects. Apply only `202607270001_security_baseline.sql` to it.

Apply the migration before deploying the matching application code because the license RPC signatures change to require `p_app`, and invitation handling begins using `assign_invited_user`.

## Fresh database

Apply both migration files in filename order. A future Supabase CLI setup can apply this directory automatically.

## Post-migration checks

The following read-only query should return no rows:

```sql
SELECT routine_name, grantee
FROM information_schema.routine_privileges
WHERE specific_schema = 'public'
  AND grantee IN ('anon', 'PUBLIC')
  AND routine_name IN (
    'assign_invited_user',
    'increment_trial_run',
    'verify_license',
    'bind_machine',
    'commit_kerfcut_job'
  );
```

The service role should have `EXECUTE` on those five server-only functions. Authenticated users should have access only to the portal helper functions explicitly granted at the end of the security migration.

## Backup

Run a data backup before every remote migration:

```bash
npm run backup:dev-db -- /d/path/to/backup-directory
```

The backup contains Auth user metadata and portal records. Store it outside the repository and treat it as sensitive.
