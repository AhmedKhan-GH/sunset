-- Module 1: enable pgvector for embedding columns on later tables.
create extension if not exists vector;
create extension if not exists pg_trgm;
