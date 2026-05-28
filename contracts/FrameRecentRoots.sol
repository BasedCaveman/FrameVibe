// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./libraries/FrameTypes.sol";

contract FrameRecentRoots {
    address public owner;
    mapping(bytes32 root => FrameTypes.RecentRoot recentRoot) public recentRoots;

    event OwnerTransferred(address indexed oldOwner, address indexed newOwner);
    event RecentRootSet(bytes32 indexed root, bytes32 indexed source, uint64 validAfter, uint64 validUntil);

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

    function setRecentRoot(bytes32 root, bytes32 source, uint64 validAfter, uint64 validUntil) external onlyOwner {
        require(root != bytes32(0), "BAD_ROOT");
        require(validUntil == 0 || validAfter <= validUntil, "BAD_WINDOW");

        recentRoots[root] = FrameTypes.RecentRoot({
            root: root,
            source: source,
            validAfter: validAfter,
            validUntil: validUntil
        });

        emit RecentRootSet(root, source, validAfter, validUntil);
    }

    function isRecentRoot(bytes32 root, bytes32 source) external view returns (bool) {
        FrameTypes.RecentRoot memory storedRoot = recentRoots[root];
        if (storedRoot.root == bytes32(0)) return false;
        if (source != bytes32(0) && storedRoot.source != source) return false;
        if (storedRoot.validAfter != 0 && block.timestamp < storedRoot.validAfter) return false;
        if (storedRoot.validUntil != 0 && block.timestamp > storedRoot.validUntil) return false;
        return true;
    }
}
