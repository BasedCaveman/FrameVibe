// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IFrameVibeAccount.sol";
import "./libraries/FrameTypes.sol";

contract FrameExecutor {
    event Forwarded(address indexed account, FrameTypes.FrameKind indexed kind, address indexed relayer);

    function forward(address account, FrameTypes.Frame calldata frame, bytes calldata signature)
        external
        payable
        returns (bytes[] memory results)
    {
        results = IFrameVibeAccount(account).executeFrame{value: msg.value}(frame, signature);
        emit Forwarded(account, frame.kind, msg.sender);
    }
}
