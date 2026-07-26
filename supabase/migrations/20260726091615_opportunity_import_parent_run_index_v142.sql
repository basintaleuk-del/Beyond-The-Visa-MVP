create index if not exists btv_import_runs_parent_idx
  on public.btv_opportunity_import_runs(parent_run_id)
  where parent_run_id is not null;
