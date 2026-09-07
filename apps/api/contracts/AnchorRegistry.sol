"""Minimal immutable anchor registry (Phase 21).

Stores ONLY cryptographic anchors: a mapping from `bytes32 digest` to the block
and timestamp where it was anchored, plus an `EvidenceAnchored` event. It never
stores evidence, PII, or any application metadata. The contract is deliberately
tiny and immutable (no owner upgrade, no parameterization, no storage beyond
the lookup) to keep the audit surface of Trinetra Pulse to a minimum.

The anchor proves a digest existed on-chain at `timestamp`. It does NOT prove
that the underlying evidence content is truthful.
"""

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract AnchorRegistry {
    struct Anchor {
        bool exists;
        uint256 blockNumber;
        uint256 timestamp;
    }

    mapping(bytes32 => Anchor) private anchors;

    event EvidenceAnchored(bytes32 indexed digest, uint256 timestamp, uint256 blockNumber);

    error AlreadyAnchored(bytes32 digest);

    /// Store a cryptographic anchor digest. Reverts if already anchored
    /// (anchors are immutable — one digest, one record).
    function anchor(bytes32 digest) external {
        if (anchors[digest].exists) revert AlreadyAnchored(digest);
        anchors[digest] = Anchor({exists: true, blockNumber: block.number, timestamp: block.timestamp});
        emit EvidenceAnchored(digest, block.timestamp, block.number);
    }

    /// Retrieval for an anchor digest.
    function getAnchor(bytes32 digest)
        external
        view
        returns (bool exists, uint256 blockNumber, uint256 timestamp)
    {
        Anchor storage a = anchors[digest];
        return (a.exists, a.blockNumber, a.timestamp);
    }
}