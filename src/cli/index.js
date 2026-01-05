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

program.parse(process.argv);
