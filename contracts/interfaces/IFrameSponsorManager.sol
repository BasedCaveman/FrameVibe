// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IFrameSponsorManager {
    function canSponsor(address sponsor, address account, uint256 gasLimit, uint256 valueWei) external view returns (bool);
    function consumeSponsor(address sponsor, address account, uint256 gasLimit, uint256 valueWei) external;
}
