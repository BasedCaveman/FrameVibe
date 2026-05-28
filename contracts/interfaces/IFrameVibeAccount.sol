// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../libraries/FrameTypes.sol";

interface IFrameVibeAccount {
    event FrameExecuted(bytes32 indexed frameHash, FrameTypes.FrameKind indexed kind, address indexed actor);
    event ValidatorSet(address indexed validator, bool enabled);
    event SponsorManagerSet(address indexed sponsorManager);

    function owner() external view returns (address);
    function nonce(bytes32 nonceKey) external view returns (uint256);
    function executeFrame(FrameTypes.Frame calldata frame, bytes calldata signature) external payable returns (bytes[] memory results);
    function setValidator(address validator, bool enabled) external;
    function setSponsorManager(address sponsorManager) external;
}
