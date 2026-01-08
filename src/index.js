import 'dotenv/config'

const command = process.argv[2];

if (command === "ping") {
  console.log("Queue system alive");
}
