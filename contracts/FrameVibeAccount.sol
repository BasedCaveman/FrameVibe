// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IFrameSponsorManager.sol";
import "./interfaces/IFrameVerifier.sol";
import "./interfaces/IFrameVibeAccount.sol";
import "./libraries/FrameLib.sol";
import "./libraries/FrameTypes.sol";
import "./libraries/ReentrancyGuardLite.sol";

contract FrameVibeAccount is IFrameVibeAccount, ReentrancyGuardLite {
    using FrameLib for FrameTypes.Frame;

    address public immutable override owner;
    IFrameVerifier public immutable verifier;
    address public sponsorManager;

    mapping(FrameTypes.FrameKind kind => uint256 currentNonce) private _nonces;
    mapping(address validator => bool enabled) public validators;

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    modifier onlyOwnerOrValidator() {
        require(msg.sender == owner || validators[msg.sender], "NOT_AUTHORIZED");
        _;
    }

    constructor(address initialOwner, address initialVerifier, address initialSponsorManager) payable {
        require(initialOwner != address(0), "BAD_OWNER");
        require(initialVerifier != address(0), "BAD_VERIFIER");

        owner = initialOwner;
        verifier = IFrameVerifier(initialVerifier);
        sponsorManager = initialSponsorManager;
    }

    receive() external payable {}

    function nonce(FrameTypes.FrameKind kind) external view override returns (uint256) {
        return _nonces[kind];
    }

    function setValidator(address validator, bool enabled) external override onlyOwner {
        require(validator != address(0), "BAD_VALIDATOR");
        validators[validator] = enabled;
        emit ValidatorSet(validator, enabled);
    }

    function setSponsorManager(address manager) external override onlyOwner {
        sponsorManager = manager;
        emit SponsorManagerSet(manager);
    }

    function executeFrame(FrameTypes.Frame calldata frame, bytes calldata signature)
        external
        payable
        override
        nonReentrant
        returns (bytes[] memory results)
    {
        FrameLib.assertLive(frame.deadline);
        require(frame.nonce == _nonces[frame.kind], "BAD_NONCE");

        bytes32 digest = FrameLib.hashFrame(address(this), frame);
        _verifyFrame(frame, digest, signature);
        _nonces[frame.kind] += 1;

        if (frame.kind == FrameTypes.FrameKind.VERIFY) {
            require(frame.calls.length == 0, "VERIFY_HAS_CALLS");
            emit FrameExecuted(digest, frame.kind, frame.actor);
            return new bytes[](0);
        }

        if (frame.kind == FrameTypes.FrameKind.APPROVE) {
            require(frame.sponsor != address(0), "NO_SPONSOR");
            require(sponsorManager != address(0), "NO_SPONSOR_MANAGER");
            IFrameSponsorManager(sponsorManager).consumeSponsor(frame.sponsor, address(this), frame.gasLimit, _totalValue(frame.calls));
            emit FrameExecuted(digest, frame.kind, frame.actor);
            return new bytes[](0);
        }

        require(frame.kind == FrameTypes.FrameKind.EXECUTION, "BAD_KIND");
        results = _executeCalls(frame.calls);
        emit FrameExecuted(digest, frame.kind, frame.actor);
    }

    function _verifyFrame(FrameTypes.Frame calldata frame, bytes32 digest, bytes calldata signature) internal view {
        address actor = frame.actor == address(0) ? owner : frame.actor;
        bool actorAllowed = actor == owner || validators[actor];
        require(actorAllowed, "ACTOR_NOT_ALLOWED");

        if (msg.sender != actor) {
            require(verifier.verify(actor, digest, signature), "BAD_SIGNATURE");
        }
    }

    function _executeCalls(FrameTypes.Call[] calldata calls) internal returns (bytes[] memory results) {
        require(calls.length > 0, "NO_CALLS");
        results = new bytes[](calls.length);

        for (uint256 i = 0; i < calls.length; i++) {
            require(calls[i].target != address(0), "BAD_TARGET");
            (bool success, bytes memory result) = calls[i].target.call{value: calls[i].value}(calls[i].data);
            require(success, _revertReason(result));
            results[i] = result;
        }
    }

    function _totalValue(FrameTypes.Call[] calldata calls) internal pure returns (uint256 total) {
        for (uint256 i = 0; i < calls.length; i++) {
            total += calls[i].value;
        }
    }

    function _revertReason(bytes memory result) internal pure returns (string memory) {
        if (result.length < 68) return "CALL_FAILED";
        assembly {
            result := add(result, 0x04)
        }
        return abi.decode(result, (string));
    }
}
