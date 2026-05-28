// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IFrameSponsorManager.sol";
import "./libraries/FrameTypes.sol";

contract FrameSponsorManager is IFrameSponsorManager {
    address public owner;

    mapping(address sponsor => mapping(address account => FrameTypes.SponsorRule)) public sponsorRules;

    event OwnerTransferred(address indexed oldOwner, address indexed newOwner);
    event SponsorRuleSet(address indexed sponsor, address indexed account, uint96 maxGasWei, uint96 maxValueWei, uint32 maxUses, uint64 validUntil);
    event SponsorConsumed(address indexed sponsor, address indexed account, uint256 gasLimit, uint256 valueWei, uint32 used);

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

    function setSponsorRule(
        address sponsor,
        address account,
        uint96 maxGasWei,
        uint96 maxValueWei,
        uint32 maxUses,
        uint64 validUntil,
        bool active
    ) external onlyOwner {
        require(sponsor != address(0), "BAD_SPONSOR");
        require(account != address(0), "BAD_ACCOUNT");

        sponsorRules[sponsor][account] = FrameTypes.SponsorRule({
            active: active,
            maxGasWei: maxGasWei,
            maxValueWei: maxValueWei,
            maxUses: maxUses,
            used: sponsorRules[sponsor][account].used,
            validUntil: validUntil
        });

        emit SponsorRuleSet(sponsor, account, maxGasWei, maxValueWei, maxUses, validUntil);
    }

    function canSponsor(address sponsor, address account, uint256 gasLimit, uint256 valueWei) public view returns (bool) {
        FrameTypes.SponsorRule memory rule = sponsorRules[sponsor][account];
        if (!rule.active) return false;
        if (rule.validUntil != 0 && block.timestamp > rule.validUntil) return false;
        if (rule.maxUses != 0 && rule.used >= rule.maxUses) return false;
        if (rule.maxGasWei != 0 && gasLimit > rule.maxGasWei) return false;
        if (rule.maxValueWei != 0 && valueWei > rule.maxValueWei) return false;
        return true;
    }

    function consumeSponsor(address sponsor, address account, uint256 gasLimit, uint256 valueWei) external {
        require(msg.sender == account, "ONLY_ACCOUNT");
        require(canSponsor(sponsor, account, gasLimit, valueWei), "SPONSOR_DENIED");

        FrameTypes.SponsorRule storage rule = sponsorRules[sponsor][account];
        rule.used += 1;

        emit SponsorConsumed(sponsor, account, gasLimit, valueWei, rule.used);
    }
}
