CREATE USER flowable WITH PASSWORD 'flowable';
CREATE DATABASE flowable_db;
\c flowable_db;
GRANT ALL ON SCHEMA public TO flowable;
