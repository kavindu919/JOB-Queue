import redis from "../redis/connection.js";


const SCHEDULER_INTERVAL = 1000;
async function moveReadyJobs() {
  const now = Date.now();

  const readyJobs = await redis.zrangebyscore(
    "queue:delayed",
    0,
    now
  );

  for (const jobId of readyJobs) {
    await redis.zrem("queue:delayed", jobId);
    await redis.lpush("queue:waiting", jobId);

    await redis.hset(`job:${jobId}`, {
      status: "waiting",
      scheduledAt: Date.now()
    });

    console.log("Job moved to waiting:", jobId);
  }
}

setInterval(moveReadyJobs, SCHEDULER_INTERVAL);
