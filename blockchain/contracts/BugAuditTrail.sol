/*
LEGACY BLOCKCHAIN CODE — intentionally commented out.
The active application does not compile or deploy this contract.

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract BugAuditTrail {
    struct BugEvent {
        uint256 eventId;
        bytes32 bugChainId;
        string bugId;
        string action;
        string actorEmail;
        string actorRole;
        string metadata;
        uint256 timestamp;
    }

    BugEvent[] private bugEvents;
    mapping(string => bytes32) private bugChainIds;

    event BugEventRecorded(
        uint256 indexed eventId,
        bytes32 indexed bugChainId,
        string bugId,
        string action,
        string actorEmail,
        string actorRole,
        string metadata,
        uint256 timestamp
    );

    function recordBugEvent(
        string calldata bugId,
        string calldata action,
        string calldata actorEmail,
        string calldata actorRole,
        string calldata metadata
    ) external returns (uint256 eventId, bytes32 bugChainId) {
        eventId = bugEvents.length;
        bugChainId = bugChainIdFor(bugId);

        bugEvents.push(
            BugEvent({
                eventId: eventId,
                bugChainId: bugChainId,
                bugId: bugId,
                action: action,
                actorEmail: actorEmail,
                actorRole: actorRole,
                metadata: metadata,
                timestamp: block.timestamp
            })
        );

        emit BugEventRecorded(
            eventId,
            bugChainId,
            bugId,
            action,
            actorEmail,
            actorRole,
            metadata,
            block.timestamp
        );
    }

    function getBugEvent(uint256 eventId) external view returns (BugEvent memory) {
        require(eventId < bugEvents.length, "Bug event does not exist");
        return bugEvents[eventId];
    }

    function getBugEventCount() external view returns (uint256) {
        return bugEvents.length;
    }

    function bugChainIdFor(string memory bugId) public returns (bytes32) {
        bytes32 existing = bugChainIds[bugId];
        if (existing != bytes32(0)) {
            return existing;
        }

        bytes32 chainId = keccak256(abi.encodePacked(block.chainid, address(this), bugId));
        bugChainIds[bugId] = chainId;
        return chainId;
    }
}
*/
