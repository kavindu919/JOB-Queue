import Redis from "ioredis";
console.log("cwd:", process.cwd());

console.log(process.env.REDIS_HOST)
const redis = new Redis({
    host:process.env.REDIS_HOST,
    port:process.env.REDIS_PORT
})
redis.on("connect",()=>{
      console.log("Redis connected");
})
redis.on("error",(err)=>{
    console.error("Redis connection error", err);
})

export default redis