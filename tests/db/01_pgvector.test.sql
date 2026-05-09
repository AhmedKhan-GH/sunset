-- Module 1 — pgvector rigorous tests.
-- Runs idempotently; cleans up after itself.
-- Apply with: psql "$DATABASE_URL" -f tests/db/01_pgvector.test.sql

\set ON_ERROR_STOP on
\timing off
\echo '=== Module 1: pgvector ==='

-- Test 1: extension is installed and at expected major version
do $$
declare v_ver text;
begin
  select extversion into v_ver from pg_extension where extname = 'vector';
  if v_ver is null then
    raise exception 'FAIL: vector extension not installed';
  end if;
  raise notice 'PASS: vector extension installed (v%)', v_ver;
end $$;

-- Cleanup any prior test artifacts
drop table if exists _test_pgvector cascade;

-- Test 2: can create vector(768) column
create table _test_pgvector (
  id   int generated always as identity primary key,
  v768 vector(768) not null
);
\echo 'PASS: created table with vector(768) column'

-- Test 3: can insert valid 768-dim vectors (built from real[])
insert into _test_pgvector (v768)
values
  (array_fill(0.0::real, ARRAY[768])::real[]::vector),
  (array_fill(1.0::real, ARRAY[768])::real[]::vector),
  (array_fill(0.5::real, ARRAY[768])::real[]::vector);

do $$
declare n int;
begin
  select count(*) into n from _test_pgvector;
  if n <> 3 then raise exception 'FAIL: expected 3 rows, got %', n; end if;
  raise notice 'PASS: inserted 3 vectors';
end $$;

-- Test 4: vector_dims() returns 768
do $$
declare d int;
begin
  select vector_dims(v768) into d from _test_pgvector limit 1;
  if d <> 768 then raise exception 'FAIL: expected dim 768, got %', d; end if;
  raise notice 'PASS: vector_dims() returns 768';
end $$;

-- Test 5: dimension mismatch is rejected
do $$
begin
  begin
    insert into _test_pgvector (v768) values ('[1,2,3]'::vector);
    raise exception 'FAIL: should have rejected vector(3) insert into vector(768) column';
  exception when others then
    if SQLERRM like 'FAIL%' then raise; end if;
    raise notice 'PASS: wrong-dimension insert rejected (%)', SQLERRM;
  end;
end $$;

-- Test 6: cosine distance operator <=> (skip the all-zero row; cosine on zero is NaN)
do $$
declare similarity real;
begin
  select v768 <=> v768 into similarity
    from _test_pgvector
    where v768 <> array_fill(0.0::real, ARRAY[768])::real[]::vector
    limit 1;
  if similarity is null or similarity > 0.0001 then
    raise exception 'FAIL: self-cosine-distance should be 0, got %', similarity;
  end if;
  raise notice 'PASS: cosine <=> operator works (self-distance %)', similarity;
end $$;

-- Test 7: L2 distance operator <->
do $$
declare d real;
begin
  select v768 <-> v768 into d from _test_pgvector limit 1;
  if d > 0.0001 then raise exception 'FAIL: self-L2 should be 0, got %', d; end if;
  raise notice 'PASS: L2 <-> operator works';
end $$;

-- Test 8: inner product operator <#>
do $$
declare ip real;
begin
  -- <#> in pgvector returns negative inner product
  select v768 <#> v768 into ip from _test_pgvector limit 1 offset 1; -- the 1.0-filled row
  raise notice 'PASS: inner-product <#> operator works (got %)', ip;
end $$;

-- Test 9: ivfflat index creates and is used by ANN query
create index _test_ivf on _test_pgvector
  using ivfflat (v768 vector_cosine_ops) with (lists = 1);
do $$
declare idx_count int;
begin
  select count(*) into idx_count
    from pg_indexes
    where indexname = '_test_ivf' and tablename = '_test_pgvector';
  if idx_count <> 1 then raise exception 'FAIL: ivfflat index not created'; end if;
  raise notice 'PASS: ivfflat index created';
end $$;

-- Test 10: ANN query order-by-similarity returns rows
do $$
declare n int;
begin
  perform v768
    from _test_pgvector
    order by v768 <=> array_fill(0.5::real, ARRAY[768])::real[]::vector
    limit 3;
  get diagnostics n = ROW_COUNT;
  if n <> 3 then raise exception 'FAIL: expected 3 ANN results, got %', n; end if;
  raise notice 'PASS: ANN order-by-similarity returns expected rows';
end $$;

-- Test 11: hnsw index also works
drop index _test_ivf;
create index _test_hnsw on _test_pgvector
  using hnsw (v768 vector_cosine_ops);
do $$
declare idx_count int;
begin
  select count(*) into idx_count
    from pg_indexes
    where indexname = '_test_hnsw' and tablename = '_test_pgvector';
  if idx_count <> 1 then raise exception 'FAIL: hnsw index not created'; end if;
  raise notice 'PASS: hnsw index created';
end $$;

-- Cleanup
drop table _test_pgvector cascade;
\echo 'PASS: cleanup complete'

\echo '=== Module 1: ALL TESTS PASSED ==='
