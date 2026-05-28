// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IFrameVerifier {
    function verify(address signer, bytes32 digest, bytes calldata signature) external view returns (bool);
}
