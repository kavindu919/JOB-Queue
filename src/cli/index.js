#!/usr/bin/env node

import {Command} from 'commander'

const program = new Command()

program.name('job-queue').description("Distributed Job Queue System").version("0.1.0")

program.command('ping').description("Check if queue system is alive").action(()=>{
    console.log("Queue system alive")
})

program.parse(process.argv);
