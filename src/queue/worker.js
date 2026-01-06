import redis from "../redis/connection.js";
const LOCK_TTL = 10000

async function startWorker(workerId = "worker-1") {
  console.log(`Worker started: ${workerId}`);

  while (true) {
    const result = await redis.brpop("queue:waiting", 0);
    const jobId = result[1];

    const lockKey = `lock:job:${jobId}`;
    const lock = await redis.set(
      lockKey,
      workerId,
      "NX",
      "PX",
      LOCK_TTL
    )

    if(!lock){
      continue
    }

    const jobKey = `job:${jobId}`;

    await redis.lpush("queue:active", jobId);

    await redis.hset(jobKey, {
      status: "active",
      workerId,
      startedAt: Date.now()
    });

    const job = await redis.hgetall(jobKey);
    console.log("Processing job:", job.id, job.payload);
    await new Promise(res => setTimeout(res, 1000));

    await redis.hset(jobKey, {
      status: "completed",
      completedAt: Date.now()
    });
    await redis.lrem("queue:active", 0, jobId);
    await redis.del(lockKey)
        console.log("Job completed:", jobId);


    console.log("Job completed:", jobId);
  }
}

startWorker().catch(console.error);
