import redis from "../redis/connection.js";

const LOCK_TTL = 10000;
const RECOVERY_INTERVAL = 5000;

async function recoverStuckJobs() {
  const activeJobs = await redis.lrange("queue:active", 0, -1);
  for (const jobId of activeJobs) {
    const lockKey = `lock:job:${jobId}`;
    const hasLock = await redis.exists(lockKey);

    if (hasLock) continue;

    const jobKey = `job:${jobId}`;
    const job = await redis.hgetall(jobKey);

    if (!job.startedAt) continue;

    const age = Date.now() - Number(job.startedAt);
    if (age < LOCK_TTL) continue;
    console.log("Recovering stuck job:", jobId);

    await redis.lrem("queue:active",0,jobId)
    await redis.lpush("queue:waiting",jobId)

    await redis.hset(jobKey,{
        status: "waiting",
        recoveredAt: Date.now()
    })
  }
}

setInterval(recoverStuckJobs,RECOVERY_INTERVAL)