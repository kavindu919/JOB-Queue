#!/usr/bin/env node
import 'dotenv/config'

import {Command} from 'commander'
import redis from '../redis/connection.js'

const program = new Command()

program.name('job-queue').description("Distributed Job Queue System").version("0.1.0")

program.command('ping').description("Check if queue system is alive").action(()=>{
    console.log("Queue system alive")
})

program.command('redis:ping').description("Check Redis connectivity").action(async ()=>{
    const result = await redis.ping()
    console.log("Redis response:", result);
    process.exit(0);
})

program.parse(process.argv);
