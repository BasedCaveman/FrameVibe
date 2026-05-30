// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract FramePrivacyRegistry {
    address public owner;

    mapping(bytes32 root => bool approved) public approvedRoots;
    mapping(bytes32 nullifierHash => bool used) public usedNullifiers;

    event OwnerTransferred(address indexed oldOwner, address indexed newOwner);
    event PrivacyRootSet(bytes32 indexed root, bool approved);
    event PrivateFrameVerified(bytes32 indexed root, bytes32 indexed nullifierHash, bytes32 indexed actionHash, address account);

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    constructor(address initialOwner) {
        require(initialOwner != address(0), "BAD_OWNER");
        owner = initialOwner;
        emit OwnerTransferred(address(0), initialOwner);
    }

    function transferOwner(address newOwner) external onlyOwner {
        require(newOwner != address(0), "BAD_OWNER");
        emit OwnerTransferred(owner, newOwner);
        owner = newOwner;
    }

    function setRoot(bytes32 root, bool approved) external onlyOwner {
        require(root != bytes32(0), "BAD_ROOT");
        approvedRoots[root] = approved;
        emit PrivacyRootSet(root, approved);
    }

    function verifyPrivateFrame(bytes32 root, bytes32 nullifierHash, bytes32 actionHash, address account) external returns (bool) {
        require(approvedRoots[root], "ROOT_NOT_APPROVED");
        require(nullifierHash != bytes32(0), "BAD_NULLIFIER");
        require(actionHash != bytes32(0), "BAD_ACTION");
        require(account != address(0), "BAD_ACCOUNT");
        require(!usedNullifiers[nullifierHash], "NULLIFIER_USED");

        usedNullifiers[nullifierHash] = true;
        emit PrivateFrameVerified(root, nullifierHash, actionHash, account);
        return true;
    }
}
