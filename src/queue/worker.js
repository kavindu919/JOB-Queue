import redis from "../redis/connection.js";


const LOCK_TTL = 10000;
const BASE_DELAY = 2000;

let shuttingDown = false;

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
  shuttingDown = true;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function backoff(attempts) {
  return BASE_DELAY * Math.pow(2, attempts - 1);
}

async function start(workerId = `worker-${process.pid}`) {
  while (!shuttingDown) {
    const res = await redis.brpop("queue:waiting", 0);
    const jobId = res[1];
    const lockKey = `lock:job:${jobId}`;

    const locked = await redis.set(lockKey, workerId, "NX", "PX", LOCK_TTL);
    if (!locked) continue;

    const jobKey = `job:${jobId}`;

    await redis.lpush("queue:active", jobId);
    await redis.hset(jobKey, {
      status: "active",
      workerId,
      startedAt: Date.now()
    });

    const job = await redis.hgetall(jobKey);

    try {
      await sleep(1000);

      if (Math.random() < 0.5) {
        throw new Error("failure");
      }

      await redis.hset(jobKey, {
        status: "completed",
        completedAt: Date.now()
      });

      await redis.incr("metrics:processed");
    } catch (err) {
      const attempts = Number(job.attempts) + 1;
      const max = Number(job.maxAttempts);

      await redis.hset(jobKey, {
        status: "failed",
        attempts,
        lastError: err.message,
        failedAt: Date.now()
      });

      await redis.incr("metrics:failed");

      if (attempts < max) {
        const delay = backoff(attempts);
        const retryAt = Date.now() + delay;

        await redis.hset(jobKey, {
          status: "delayed",
          retryAt
        });

        await redis.zadd("queue:delayed", retryAt, jobId);
        await redis.incr("metrics:retried");
      } else {
        await redis.lpush("queue:failed", jobId);
      }
    } finally {
      await redis.lrem("queue:active", 0, jobId);
      await redis.del(lockKey);
    }
  }

  process.exit(0);
}

start();
