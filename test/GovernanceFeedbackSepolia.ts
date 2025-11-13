import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { GovernanceFeedback } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

describe("GovernanceFeedbackSepolia", function () {
  let signers: Signers;
  let governanceFeedback: GovernanceFeedback;
  let contractAddress: string;
  let step: number;
  let steps: number;

  function progress(message: string) {
    console.log(`${++step}/${steps} ${message}`);
  }

  before(async function () {
    if (fhevm.isMock) {
      console.warn(`This hardhat test suite can only run on Sepolia Testnet`);
      this.skip();
    }

    try {
      const deployment = await deployments.get("GovernanceFeedback");
      contractAddress = deployment.address;
      governanceFeedback = await ethers.getContractAt("GovernanceFeedback", deployment.address);
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia'";
      throw e;
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { alice: ethSigners[0], bob: ethSigners[1] };
  });

  beforeEach(async () => {
    step = 0;
    steps = 0;
  });

  it("should create a feedback session and submit encrypted feedback", async function () {
    steps = 8;
    this.timeout(4 * 60000);

    progress("Creating feedback session...");
    const currentTime = Math.floor(Date.now() / 1000);
    const startTime = currentTime - 100;
    const endTime = currentTime + 3600; // 1 hour from now

    const createTx = await governanceFeedback
      .connect(signers.alice)
      .createSession("Test Governance Proposal", "Gathering satisfaction feedback", startTime, endTime);
    await createTx.wait();

    progress("Getting session count...");
    const sessionCount = await governanceFeedback.getSessionCount();
    console.log(`Total sessions: ${sessionCount}`);
    const sessionId = Number(sessionCount) - 1;

    progress("Getting session info...");
    const sessionInfo = await governanceFeedback.getSessionInfo(sessionId);
    console.log(`Session ID: ${sessionId}`);
    console.log(`Proposal: ${sessionInfo[0]}`);
    console.log(`Description: ${sessionInfo[1]}`);

    progress(`Encrypting feedback score for Alice...`);
    const aliceScore = 9; // Satisfaction score 9/10
    const aliceEncrypted = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(aliceScore)
      .encrypt();

    progress(
      `Submitting feedback from Alice (score=${aliceScore}) contract=${contractAddress} handle=${ethers.hexlify(aliceEncrypted.handles[0])}...`,
    );
    const aliceTx = await governanceFeedback
      .connect(signers.alice)
      .submitFeedback(sessionId, aliceEncrypted.handles[0], aliceEncrypted.inputProof);
    await aliceTx.wait();

    progress(`Encrypting feedback score for Bob...`);
    const bobScore = 7;
    const bobEncrypted = await fhevm
      .createEncryptedInput(contractAddress, signers.bob.address)
      .add8(bobScore)
      .encrypt();

    progress(`Submitting feedback from Bob (score=${bobScore})...`);
    const bobTx = await governanceFeedback
      .connect(signers.bob)
      .submitFeedback(sessionId, bobEncrypted.handles[0], bobEncrypted.inputProof);
    await bobTx.wait();

    progress("Checking submission status...");
    const aliceSubmitted = await governanceFeedback.hasMemberSubmitted(sessionId, signers.alice.address);
    const bobSubmitted = await governanceFeedback.hasMemberSubmitted(sessionId, signers.bob.address);
    
    expect(aliceSubmitted).to.be.true;
    expect(bobSubmitted).to.be.true;

    const updatedInfo = await governanceFeedback.getSessionInfo(sessionId);
    console.log(`Total feedback submissions: ${updatedInfo[6]}`);
    
    progress("Test completed successfully!");
  });
});

