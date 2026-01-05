import redis from "../redis/connection.js"
import { randomUUID } from "crypto";

async function addJob(queueName,payload) {
    const jobId = randomUUID()
    await redis.hset(`job:${jobId}`,{
        id:jobId,
        queue:queueName,
        payload:JSON.stringify(payload),
        status:"wating",
        createdAt: Date.now()
    })
    await redis.lpush('queue:wating',jobId)
    return jobId
}

export default addJob