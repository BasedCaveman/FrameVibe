// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library FrameTypes {
    enum FrameKind {
        VERIFY,
        EXECUTION,
        APPROVE
    }

    struct Call {
        address target;
        uint256 value;
        bytes data;
    }

    struct Frame {
        FrameKind kind;
        address actor;
        address sponsor;
        Call[] calls;
        bytes32 nonceKey;
        uint256 nonceSeq;
        uint256 deadline;
        uint256 gasLimit;
        bytes32 recentRoot;
        bytes32 recentRootSource;
        bytes32 metadataHash;
    }

    struct RecentRoot {
        bytes32 root;
        bytes32 source;
        uint64 validAfter;
        uint64 validUntil;
    }

    struct SponsorRule {
        bool active;
        uint96 maxGasWei;
        uint96 maxValueWei;
        uint32 maxUses;
        uint32 used;
        uint64 validUntil;
    }
}
