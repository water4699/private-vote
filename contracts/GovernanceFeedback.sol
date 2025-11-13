// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint8, externalEuint8, euint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Encrypted Governance Feedback
/// @author private-pool
/// @notice Collect encrypted satisfaction scores (1-10) from DAO members after proposal execution
contract GovernanceFeedback is SepoliaConfig {
    struct FeedbackSession {
        string proposalTitle;
        string description;
        uint64 startTime;
        uint64 endTime;
        address creator;
        bool finalized;
        euint32 totalScore; // encrypted sum of all scores
        uint256 feedbackCount; // total number of submissions (plaintext)
        uint32 decryptedTotalScore; // revealed after finalization
        euint8[] allScores; // store all encrypted scores for detailed view
    }

    // sessionId => FeedbackSession
    mapping(uint256 => FeedbackSession) private _sessions;
    uint256 private _sessionCount;

    // sessionId => member => has submitted feedback
    mapping(uint256 => mapping(address => bool)) public hasSubmitted;

    event SessionCreated(
        uint256 indexed sessionId,
        string proposalTitle,
        string description,
        uint64 startTime,
        uint64 endTime
    );
    event FeedbackSubmitted(uint256 indexed sessionId, address indexed member);
    event FinalizeRequested(uint256 indexed sessionId, uint256 requestId);
    event Finalized(uint256 indexed sessionId, uint32 totalScore, uint256 feedbackCount, uint32 averageScore);

    modifier validSession(uint256 sessionId) {
        require(sessionId < _sessionCount, "Invalid session");
        _;
    }

    /// @notice Create a new feedback session
    /// @param proposalTitle The title of the executed proposal
    /// @param description Additional description or context
    /// @param startTime Timestamp when feedback collection starts
    /// @param endTime Timestamp when feedback collection ends
    /// @return sessionId The ID of the created session
    function createSession(
        string memory proposalTitle,
        string memory description,
        uint64 startTime,
        uint64 endTime
    ) external returns (uint256 sessionId) {
        require(bytes(proposalTitle).length > 0, "Empty title");
        require(endTime > startTime, "Invalid time range");
        require(endTime > block.timestamp, "End time must be in future");

        sessionId = _sessionCount++;
        FeedbackSession storage session = _sessions[sessionId];
        
        session.proposalTitle = proposalTitle;
        session.description = description;
        session.startTime = startTime;
        session.endTime = endTime;
        session.creator = msg.sender;
        session.finalized = false;
        session.feedbackCount = 0;
        session.decryptedTotalScore = 0;

        emit SessionCreated(sessionId, proposalTitle, description, startTime, endTime);
    }

    /// @notice Submit encrypted satisfaction score (1-10)
    /// @param sessionId The ID of the feedback session
    /// @param encryptedScore The encrypted satisfaction score (must be between 1-10)
    /// @param inputProof The input proof for encrypted value
    function submitFeedback(
        uint256 sessionId,
        externalEuint8 encryptedScore,
        bytes calldata inputProof
    ) external validSession(sessionId) {
        FeedbackSession storage session = _sessions[sessionId];
        
        require(block.timestamp >= session.startTime, "Session not started");
        require(block.timestamp <= session.endTime, "Session ended");
        require(!session.finalized, "Session finalized");
        require(!hasSubmitted[sessionId][msg.sender], "Already submitted");

        // Convert external encrypted input to internal encrypted type
        euint8 score = FHE.fromExternal(encryptedScore, inputProof);
        
        // Convert euint8 to euint32 for addition
        euint32 score32 = FHE.asEuint32(score);
        
        // Add to total score
        session.totalScore = FHE.add(session.totalScore, score32);
        
        // Store individual score for detailed view
        session.allScores.push(score);
        
        // Set permissions
        FHE.allowThis(session.totalScore);
        FHE.allow(session.totalScore, msg.sender);
        FHE.allow(session.totalScore, session.creator);
        
        FHE.allowThis(score);
        FHE.allow(score, msg.sender);
        FHE.allow(score, session.creator);

        hasSubmitted[sessionId][msg.sender] = true;
        session.feedbackCount += 1;

        emit FeedbackSubmitted(sessionId, msg.sender);
    }

    /// @notice Allow decryption permissions for the feedback session
    /// @param sessionId The ID of the session to grant decryption access
    /// @dev Anyone can grant themselves decryption access once feedback has been submitted
    function requestDecryptionAccess(uint256 sessionId) external validSession(sessionId) {
        FeedbackSession storage session = _sessions[sessionId];

        require(session.feedbackCount > 0, "No feedback submitted");

        // Grant decryption permission to the caller
        FHE.allow(session.totalScore, msg.sender);

        emit FinalizeRequested(sessionId, 0); // Using 0 as requestId since no KMS is used
    }

    /// @notice Finalize session with decrypted results (for client-side decryption)
    /// @param sessionId The ID of the session to finalize
    /// @param totalScore The decrypted total score
    /// @param averageScore The calculated average score
    function finalizeWithResults(uint256 sessionId, uint32 totalScore, uint32 averageScore) external validSession(sessionId) {
        FeedbackSession storage session = _sessions[sessionId];

        require(!session.finalized, "Already finalized");
        require(session.feedbackCount > 0, "No feedback submitted");

        // Store the decrypted results
        session.decryptedTotalScore = totalScore;
        session.finalized = true;

        emit Finalized(sessionId, totalScore, session.feedbackCount, averageScore);
    }

    /// @notice Get the total number of feedback sessions
    /// @return The number of sessions created
    function getSessionCount() external view returns (uint256) {
        return _sessionCount;
    }

    /// @notice Get basic information about a feedback session
    /// @param sessionId The ID of the session
    /// @return proposalTitle The proposal title
    /// @return description The session description
    /// @return startTime Session start timestamp
    /// @return endTime Session end timestamp
    /// @return creator Address of the session creator
    /// @return finalized Whether the session has been finalized
    /// @return feedbackCount Number of feedback submissions
    function getSessionInfo(uint256 sessionId)
        external
        view
        validSession(sessionId)
        returns (
            string memory proposalTitle,
            string memory description,
            uint64 startTime,
            uint64 endTime,
            address creator,
            bool finalized,
            uint256 feedbackCount
        )
    {
        FeedbackSession storage session = _sessions[sessionId];
        return (
            session.proposalTitle,
            session.description,
            session.startTime,
            session.endTime,
            session.creator,
            session.finalized,
            session.feedbackCount
        );
    }

    /// @notice Get the encrypted total score (only accessible to authorized users)
    /// @param sessionId The ID of the session
    /// @return The encrypted total score
    function getEncryptedTotalScore(uint256 sessionId)
        external
        view
        validSession(sessionId)
        returns (euint32)
    {
        return _sessions[sessionId].totalScore;
    }

    /// @notice Request decryption access for encrypted total score
    /// @param sessionId The ID of the session
    function grantDecryptionAccess(uint256 sessionId) external validSession(sessionId) {
        FeedbackSession storage session = _sessions[sessionId];
        require(session.feedbackCount > 0, "No feedback submitted");

        FHE.allow(session.totalScore, msg.sender);
    }

    /// @notice Get decrypted results after finalization
    /// @param sessionId The ID of the session
    /// @return totalScore The total sum of all scores
    /// @return feedbackCount The number of feedback submissions
    /// @return averageScore The calculated average score
    function getResults(uint256 sessionId)
        external
        view
        validSession(sessionId)
        returns (uint32 totalScore, uint256 feedbackCount, uint32 averageScore)
    {
        FeedbackSession storage session = _sessions[sessionId];
        require(session.finalized, "Session not finalized");
        
        totalScore = session.decryptedTotalScore;
        feedbackCount = session.feedbackCount;
        averageScore = feedbackCount > 0 ? uint32(totalScore / feedbackCount) : 0;
    }

    /// @notice Check if a member has submitted feedback for a session
    /// @param sessionId The ID of the session
    /// @param member The address of the member
    /// @return Whether the member has submitted feedback
    function hasMemberSubmitted(uint256 sessionId, address member)
        external
        view
        validSession(sessionId)
        returns (bool)
    {
        return hasSubmitted[sessionId][member];
    }
}

