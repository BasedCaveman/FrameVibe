// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./FrameTypes.sol";

library FrameLib {
    bytes32 internal constant CALL_TYPEHASH = keccak256("Call(address target,uint256 value,bytes32 dataHash)");
    bytes32 internal constant FRAME_TYPEHASH =
        keccak256("Frame(uint8 kind,address account,address actor,address sponsor,bytes32 callsHash,bytes32 nonceKey,uint256 nonceSeq,uint256 deadline,uint256 gasLimit,bytes32 recentRoot,bytes32 recentRootSource,bytes32 metadataHash,uint256 chainId)");

    function hashCall(FrameTypes.Call calldata call_) internal pure returns (bytes32) {
        return keccak256(abi.encode(CALL_TYPEHASH, call_.target, call_.value, keccak256(call_.data)));
    }

    function hashCalls(FrameTypes.Call[] calldata calls) internal pure returns (bytes32) {
        bytes32[] memory callHashes = new bytes32[](calls.length);
        for (uint256 i = 0; i < calls.length; i++) {
            callHashes[i] = hashCall(calls[i]);
        }
        return keccak256(abi.encodePacked(callHashes));
    }

    function hashFrame(address account, FrameTypes.Frame calldata frame) internal view returns (bytes32) {
        return keccak256(
            abi.encode(
                FRAME_TYPEHASH,
                uint8(frame.kind),
                account,
                frame.actor,
                frame.sponsor,
                hashCalls(frame.calls),
                frame.nonceKey,
                frame.nonceSeq,
                frame.deadline,
                frame.gasLimit,
                frame.recentRoot,
                frame.recentRootSource,
                frame.metadataHash,
                block.chainid
            )
        );
    }

    function assertLive(uint256 deadline) internal view {
        require(deadline == 0 || block.timestamp <= deadline, "FRAME_EXPIRED");
    }
}
