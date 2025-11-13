import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:getSessionCount", "Get the total number of feedback sessions").setAction(
  async (_taskArguments: TaskArguments, hre) => {
    const GovernanceFeedback = await hre.deployments.get("GovernanceFeedback");
    const governanceFeedback = await hre.ethers.getContractAt("GovernanceFeedback", GovernanceFeedback.address);
    const sessionCount = await governanceFeedback.getSessionCount();
    console.log(`Total feedback sessions: ${sessionCount}`);
  },
);

task("task:getSessionInfo", "Get information about a feedback session")
  .addParam("sessionid", "The session ID")
  .setAction(async (taskArguments: TaskArguments, hre) => {
    const GovernanceFeedback = await hre.deployments.get("GovernanceFeedback");
    const governanceFeedback = await hre.ethers.getContractAt("GovernanceFeedback", GovernanceFeedback.address);
    const sessionId = taskArguments.sessionid;
    const info = await governanceFeedback.getSessionInfo(sessionId);
    console.log(`Session ${sessionId} Info:`);
    console.log(`  Proposal Title: ${info[0]}`);
    console.log(`  Description: ${info[1]}`);
    console.log(`  Start Time: ${new Date(Number(info[2]) * 1000).toISOString()}`);
    console.log(`  End Time: ${new Date(Number(info[3]) * 1000).toISOString()}`);
    console.log(`  Creator: ${info[4]}`);
    console.log(`  Finalized: ${info[5]}`);
    console.log(`  Feedback Count: ${info[6]}`);
  });

task("task:getResults", "Get decrypted results after finalization")
  .addParam("sessionid", "The session ID")
  .setAction(async (taskArguments: TaskArguments, hre) => {
    const GovernanceFeedback = await hre.deployments.get("GovernanceFeedback");
    const governanceFeedback = await hre.ethers.getContractAt("GovernanceFeedback", GovernanceFeedback.address);
    const sessionId = taskArguments.sessionid;

    try {
      const results = await governanceFeedback.getResults(sessionId);
      console.log(`Session ${sessionId} Results:`);
      console.log(`  Total Score: ${results[0]}`);
      console.log(`  Feedback Count: ${results[1]}`);
      console.log(`  Average Score: ${results[2]}`);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
      }
    }
  });
