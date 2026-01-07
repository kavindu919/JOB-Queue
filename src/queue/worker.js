import redis from "../redis/connection.js";
const LOCK_TTL = 10000;
const BASE_DELAY = 2000;

function getBackoffDelay(attempts) {
  return BASE_DELAY * Math.pow(2, attempts - 1);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startWorker(workerId = `worker-${process.pid}`) {
  console.log(`Worker started: ${workerId}`);

  while (true) {
    const result = await redis.brpop("queue:waiting", 0);
    const jobId = result[1];

    const lockKey = `lock:job:${jobId}`;
    const lock = await redis.set(lockKey, workerId, "NX", "PX", LOCK_TTL);

    if (!lock) {
      continue;
    }

    const jobKey = `job:${jobId}`;

    await redis.lpush("queue:active", jobId);

    await redis.hset(jobKey, {
      status: "active",
      workerId,
      startedAt: Date.now(),
    });

    const job = await redis.hgetall(jobKey);
    console.log("Processing job:", job.id, job.payload);

    try {
      await sleep(1000);
      if (Math.random() < 0.5) {
        throw new Error("Random job failure");
      }
      await redis.hset(jobKey, {
        status: "completed",
        completedAt: Date.now(),
      });
      console.log(`Job completed: ${jobId}`);
    } catch (error) {
      const attempts = Number(job.attempts || 0) + 1;
      const maxAttempts = Number(job.maxAttempts || 3);
      console.log(`Job failed (${attempts}/${maxAttempts}): ${jobId}`);
      await redis.hset(jobKey, {
        status: "failed",
        attempts,
        lastError: error.message,
        failedAt: Date.now(),
      });
      if (attempts < maxAttempts) {0
        const delay = getBackoffDelay(attempts);
        const retryAt = Date.now() + delay;
        await redis.hset(jobKey, {
          status: "delayed",
          retriedAt: retryAt,
        });
        await redis.zadd("queue:delayed", retryAt, jobId);
        console.log(
          `Job delayed ${delay}ms (attempt ${attempts}/${maxAttempts}):`,
          jobId
        );
      } else {
        await redis.lpush("queue:failed", jobId);
        console.log(`Job permanently failed: ${jobId}`);
      }
    } finally {
      await redis.lrem("queue:active", 0, jobId);
      await redis.del(lockKey);
    }
  }
}

startWorker().catch(console.error);
