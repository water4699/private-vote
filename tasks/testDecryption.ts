import { task } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

task("test:decryption", "Test the complete decryption flow")
  .addParam("session", "Session ID to test")
  .setAction(async ({ session }: { session: string }, hre: HardhatRuntimeEnvironment) => {
    const { ethers, deployments } = hre;
    
    console.log("\n🔍 Testing Decryption Flow for Session:", session);
    console.log("=" .repeat(60));

    // Get contract
    const deployment = await deployments.get("GovernanceFeedback");
    const governanceFeedback = await ethers.getContractAt(
      "GovernanceFeedback",
      deployment.address
    );

    const sessionId = BigInt(session);

    // Step 1: Get session info
    console.log("\n1️⃣ Fetching session info...");
    const sessionInfo = await governanceFeedback.getSessionInfo(sessionId);
    console.log(`   Title: ${sessionInfo[0]}`);
    console.log(`   Description: ${sessionInfo[1]}`);
    console.log(`   Start: ${new Date(Number(sessionInfo[2]) * 1000).toLocaleString()}`);
    console.log(`   End: ${new Date(Number(sessionInfo[3]) * 1000).toLocaleString()}`);
    console.log(`   Creator: ${sessionInfo[4]}`);
    console.log(`   Finalized: ${sessionInfo[5]}`);
    console.log(`   Feedback Count: ${sessionInfo[6]}`);

    const finalized = sessionInfo[5];
    const feedbackCount = sessionInfo[6];

    // Step 2: Check if ready for finalization
    if (!finalized && feedbackCount > 0n) {
      const now = Math.floor(Date.now() / 1000);
      const endTime = Number(sessionInfo[3]);
      
      if (now > endTime) {
        console.log("\n2️⃣ Session ready for finalization!");
        console.log("   ⚠️  Run: npx hardhat finalize --session", session, "--network sepolia");
      } else {
        console.log("\n2️⃣ Session not ready yet");
        console.log(`   ⏳ Ends in: ${Math.floor((endTime - now) / 60)} minutes`);
      }
    } else if (!finalized && feedbackCount === 0n) {
      console.log("\n2️⃣ No feedback submitted yet");
    }

    // Step 3: Check if finalized and show results
    if (finalized) {
      console.log("\n3️⃣ Session finalized! Fetching results...");
      
      try {
        const results = await governanceFeedback.getResults(sessionId);
        console.log("\n   📊 DECRYPTED RESULTS:");
        console.log("   " + "-".repeat(50));
        console.log(`   Total Score:      ${results[0]}`);
        console.log(`   Participants:     ${results[1]}`);
        console.log(`   Average Score:    ${results[2]} / 10`);
        console.log(`   Satisfaction:     ${(Number(results[2]) / 10 * 100).toFixed(1)}%`);
        console.log("   " + "-".repeat(50));
        console.log("\n   ✅ Decryption successful! Results are publicly visible on-chain.");
      } catch (error) {
        console.error("\n   ❌ Failed to fetch results:", error);
      }
    } else {
      console.log("\n3️⃣ Session not finalized yet");
      console.log("   Once finalized, results will be visible here");
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ Test complete!\n");
  });

task("finalize", "Request finalization and decryption")
  .addParam("session", "Session ID to finalize")
  .setAction(async ({ session }: { session: string }, hre: HardhatRuntimeEnvironment) => {
    const { ethers, deployments } = hre;
    
    console.log("\n🔓 Requesting Finalization for Session:", session);
    console.log("=" .repeat(60));

    const deployment = await deployments.get("GovernanceFeedback");
    const governanceFeedback = await ethers.getContractAt(
      "GovernanceFeedback",
      deployment.address
    );

    const sessionId = BigInt(session);

    console.log("\n1️⃣ Checking session status...");
    const sessionInfo = await governanceFeedback.getSessionInfo(sessionId);
    
    if (sessionInfo[5]) {
      console.log("   ⚠️  Session already finalized!");
      return;
    }

    if (sessionInfo[6] === 0n) {
      console.log("   ⚠️  No feedback submitted yet!");
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const endTime = Number(sessionInfo[3]);
    
    if (now <= endTime) {
      console.log(`   ⚠️  Session not ended yet! Ends at ${new Date(endTime * 1000).toLocaleString()}`);
      return;
    }

    console.log("\n2️⃣ Requesting finalization...");
    console.log("   📡 Calling requestFinalize()...");
    
    const tx = await governanceFeedback.requestFinalize(sessionId);
    console.log(`   Transaction hash: ${tx.hash}`);
    
    console.log("\n3️⃣ Waiting for transaction confirmation...");
    const receipt = await tx.wait();
    console.log(`   ✅ Transaction confirmed in block ${receipt?.blockNumber}`);

    console.log("\n4️⃣ KMS Decryption Process Started");
    console.log("   ⏳ Waiting for KMS oracle callback...");
    console.log("   ⏳ This may take 15-30 seconds on Sepolia testnet");
    console.log("\n   To check results, run:");
    console.log(`   npx hardhat test:decryption --session ${session} --network sepolia`);

    console.log("\n" + "=".repeat(60));
    console.log("✅ Finalization request sent!\n");
  });

