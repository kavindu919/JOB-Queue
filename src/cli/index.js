#!/usr/bin/env node
import "dotenv/config";

import { Command } from "commander";
import redis from "../redis/connection.js";
import addJob from "../queue/producer.js";

const program = new Command();

program
  .name("job-queue")
  .description("Distributed Job Queue System")
  .version("0.1.0");

program
  .command("ping")
  .description("Check if queue system is alive")
  .action(() => {
    console.log("Queue system alive");
  });

program
  .command("redis:ping")
  .description("Check Redis connectivity")
  .action(async () => {
    const result = await redis.ping();
    console.log("Redis response:", result);
    process.exit(0);
  });

program
  .command("job:add <queue>")
  .description("Add a job to the queue")
  .option("-p, --payload <json>", "Job payload as JSON")
  .action(async (queue,options)=>{
    const payload = options.payload ? JSON.parse(options.payload):{}
    const jobId = await addJob(queue,payload)
    console.log("Job added",jobId)
    process.exit(0)
  })

  program
  .command("job:status <jobId>")
  .description("Show job status and metadata")
  .action(async (jobId) => {
    const job = await redis.hgetall(`job:${jobId}`);

    if (!job || Object.keys(job).length === 0) {
      console.log("Job not found");
      process.exit(1);
    }

    console.log("Job status:");
    console.table({
      id: job.id,
      queue: job.queue,
      status: job.status,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      workerId: job.workerId || "-",
      lastError: job.lastError || "-",
      createdAt: new Date(Number(job.createdAt)).toISOString(),
      startedAt: job.startedAt
        ? new Date(Number(job.startedAt)).toISOString()
        : "-",
      completedAt: job.completedAt
        ? new Date(Number(job.completedAt)).toISOString()
        : "-",
      retryAt: job.retryAt
        ? new Date(Number(job.retryAt)).toISOString()
        : "-"
    });

    process.exit(0);
  });

  program
  .command("queue:stats")
  .description("Show queue statistics")
  .action(async () => {
    const [
      waiting,
      active,
      failed,
      delayed
    ] = await Promise.all([
      redis.llen("queue:waiting"),
      redis.llen("queue:active"),
      redis.llen("queue:failed"),
      redis.zcard("queue:delayed")
    ]);

    console.log("Queue stats:");
    console.table({
      waiting,
      active,
      delayed,
      failed
    });

    process.exit(0);
  });

program
  .command("job:retry <jobId>")
  .description("Manually retry a job")
  .action(async (jobId) => {
    const jobKey = `job:${jobId}`;
    const job = await redis.hgetall(jobKey);

    if (!job || !job.id) {
      console.log("Job not found");
      process.exit(1);
    }

    await redis.zrem("queue:delayed", jobId);
    await redis.lrem("queue:failed", 0, jobId);
    await redis.lrem("queue:active", 0, jobId);

    await redis.hset(jobKey, {
      status: "waiting",
      lastError: "",
      retriedManuallyAt: Date.now()
    });

    await redis.lpush("queue:waiting", jobId);

    console.log("Job manually retried:", jobId);
    process.exit(0);
  });

  program
  .command("job:fail <jobId>")
  .description("Force fail a job")
  .action(async (jobId) => {
    const jobKey = `job:${jobId}`;
    const job = await redis.hgetall(jobKey);

    if (!job || !job.id) {
      console.log("Job not found");
      process.exit(1);
    }

    await redis.zrem("queue:delayed", jobId);
    await redis.lrem("queue:waiting", 0, jobId);
    await redis.lrem("queue:active", 0, jobId);

    await redis.hset(jobKey, {
      status: "failed",
      forcedFailedAt: Date.now()
    });

    await redis.lpush("queue:failed", jobId);

    console.log("Job force-failed:", jobId);
    process.exit(0);
  });

  program
  .command("queue:purge")
  .description("Purge all queues (dangerous)")
  .action(async () => {
    await Promise.all([
      redis.del("queue:waiting"),
      redis.del("queue:active"),
      redis.del("queue:failed"),
      redis.del("queue:delayed")
    ]);

    console.log("All queues purged");
    process.exit(0);
  });




program.parse(process.argv);
