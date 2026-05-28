// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IERC1271.sol";
import "./interfaces/IFrameVerifier.sol";

contract FrameVerifier is IFrameVerifier {
    bytes4 private constant ERC1271_MAGICVALUE = 0x1626ba7e;

    function verify(address signer, bytes32 digest, bytes calldata signature) external view returns (bool) {
        if (signer.code.length > 0) {
            try IERC1271(signer).isValidSignature(digest, signature) returns (bytes4 value) {
                return value == ERC1271_MAGICVALUE;
            } catch {
                return false;
            }
        }

        return _recover(digest, signature) == signer;
    }

    function _recover(bytes32 digest, bytes calldata signature) internal pure returns (address) {
        if (signature.length != 65) return address(0);

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 0x20))
            v := byte(0, calldataload(add(signature.offset, 0x40)))
        }

        if (v < 27) v += 27;
        if (v != 27 && v != 28) return address(0);

        return ecrecover(_toEthSignedMessageHash(digest), v, r, s);
    }

    function _toEthSignedMessageHash(bytes32 digest) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", digest));
    }
}
