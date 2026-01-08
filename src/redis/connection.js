import Redis from "ioredis";
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

redis.on("reconnecting", () => {
  console.log("Redis reconnecting...");
});
export default redis