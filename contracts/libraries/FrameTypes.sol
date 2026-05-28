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
        uint256 nonce;
        uint256 deadline;
        uint256 gasLimit;
        bytes32 metadataHash;
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
