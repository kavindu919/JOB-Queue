# Mini BullMQ – Distributed Job Queue System

A Redis-backed distributed job queue system inspired by BullMQ. Built with Node.js and a CLI-first approach. Designed to demonstrate core queueing primitives used in production systems: locking, crash recovery, retries with backoff, delayed scheduling, and operational observability.

---

## 1. Overview

Mini BullMQ is a near-production job queue that supports multiple distributed workers across processes or machines. Redis acts as the single source of truth. The system guarantees at-least-once delivery with safe concurrency using Redis locks.

This project focuses on correctness, simplicity, and transparency rather than feature bloat.

---

## 2. Core Features

* Job enqueueing via CLI
* Distributed workers
* Redis-based job locking
* Crash recovery for stuck jobs
* Retry mechanism with max attempts
* Exponential backoff for delayed retries
* Time-based scheduling using Redis sorted sets
* CLI observability (job status, queue stats)
* Manual operator controls (retry, fail, purge)
* Graceful worker shutdown
* Basic metrics

---

## 3. System Architecture

### High-Level Flow

Producer (CLI)
→ Redis (waiting queue)
→ Worker (lock + execute)
→ Redis (completed / delayed / failed)

Scheduler and Recovery run as independent processes.

### Processes

* Producers: enqueue jobs
* Workers: execute jobs
* Scheduler: moves delayed jobs back to waiting
* Recovery: requeues stuck active jobs

All components communicate only through Redis.

---

## 4. Redis Data Model

### Queues

* queue:waiting (LIST)
* queue:active (LIST)
* queue:failed (LIST)
* queue:delayed (ZSET)

### Jobs

* job:{jobId} (HASH)

Fields include:

* id
* queue
* payload
* status
* attempts
* maxAttempts
* workerId
* timestamps (createdAt, startedAt, completedAt, retryAt)
* lastError

### Locks

* lock:job:{jobId}

Uses SET NX PX with TTL

### Metrics

* metrics:processed
* metrics:failed
* metrics:retried

---

## 5. Job Lifecycle

waiting
→ active (locked)
→ completed

On failure:
active
→ delayed
→ waiting (after backoff)

On exhaustion:
active
→ failed

On crash:
active
→ waiting (via recovery)

---

## 6. Locking & Concurrency

Each job is protected by a Redis lock:

* SET lock:job:{id} workerId NX PX ttl

Only the worker holding the lock may process the job. Lock TTL ensures recovery after crashes.

This guarantees:

* No concurrent execution of the same job
* Safe multi-worker execution across machines

---

## 7. Retry & Backoff Strategy

Retries are controlled by:

* attempts
* maxAttempts

Backoff formula:

delay = baseDelay * 2^(attempts - 1)

Delayed jobs are stored in a Redis sorted set using retry timestamps.

---

## 8. Crash Recovery

A recovery process periodically scans active jobs.

A job is considered stuck if:

* status is active
* lock does not exist
* startedAt exceeds lock TTL

Such jobs are safely requeued.

---

## 9. CLI Commands

### Job Commands

* job_queue job:add <queue> --payload '{}'
* job_queue job:status <jobId>
* job_queue job:retry <jobId>
* job_queue job:fail <jobId>

### Queue Commands

* job_queue queue:stats
* job_queue queue:purge

---

## 10. Guarantees & Limitations

### Guarantees

* At-least-once job delivery
* No concurrent execution of the same job
* Crash-safe processing

### Limitations

* No exactly-once guarantee
* No job prioritization
* No rate limiting
* Redis-only backend

---

## 11. Running Locally

Requirements:

* Node.js 18+
* Redis

Install dependencies:

npm install

Run processes:

node src/queue/worker.js
node src/queue/scheduler.js
node src/queue/recovery.js

Use CLI:

mini-bullmq job:add test --payload '{"hello":"world"}'

---

## 12. Design Philosophy

* Simple Redis primitives over Lua
* Explicit state transitions
* Separation of responsibilities
* Observable internal state
* Failure-first design

---

## 13. Why This Project Matters

This system implements the core mechanics used by production job queues such as BullMQ, Sidekiq, and Celery.

It demonstrates understanding of:

* Distributed systems
* Fault tolerance
* Concurrency control
* Operational tooling

---

## 14. Future Enhancements

* Job priorities
* Rate limiting
* Namespaced queues
* Worker pools
* Lua scripts for atomic moves

---

## 15. Conclusion

Mini BullMQ is a compact but serious distributed system. It prioritizes correctness and transparency and serves as a strong foundation for learning or extension into a production-grade queue.
