// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Single-file Remix build for FrameVibe.
// Deploy FrameVibeFactory from this file.

abstract contract ReentrancyGuardLite {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    uint256 private _status = _NOT_ENTERED;

    modifier nonReentrant() {
        require(_status != _ENTERED, "REENTRANCY");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}

library FrameTypes {
    enum FrameKind {
        VERIFY,
        EXECUTION,
        APPROVE
    }

    struct Call {
        address target;
        uint256 value;
        bytes data;
    }

    struct Frame {
        FrameKind kind;
        address actor;
        address sponsor;
        Call[] calls;
        bytes32 nonceKey;
        uint256 nonceSeq;
        uint256 deadline;
        uint256 gasLimit;
        bytes32 recentRoot;
        bytes32 recentRootSource;
        bytes32 metadataHash;
    }

    struct RecentRoot {
        bytes32 root;
        bytes32 source;
        uint64 validAfter;
        uint64 validUntil;
    }

    struct SponsorRule {
        bool active;
        uint96 maxGasWei;
        uint96 maxValueWei;
        uint32 maxUses;
        uint32 used;
        uint64 validUntil;
    }
}

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

interface IERC1271 {
    function isValidSignature(bytes32 hash, bytes calldata signature) external view returns (bytes4 magicValue);
}

interface IFrameVerifier {
    function verify(address signer, bytes32 digest, bytes calldata signature) external view returns (bool);
}

interface IFrameSponsorManager {
    function canSponsor(address sponsor, address account, uint256 gasLimit, uint256 valueWei) external view returns (bool);
    function consumeSponsor(address sponsor, address account, uint256 gasLimit, uint256 valueWei) external;
}

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

contract FrameVibeAccount is IFrameVibeAccount, ReentrancyGuardLite {
    address public immutable override owner;
    IFrameVerifier public immutable verifier;
    address public sponsorManager;

    mapping(bytes32 nonceKey => uint256 nonceSeq) private _nonces;
    mapping(address validator => bool enabled) public validators;

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
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

    function nonce(bytes32 nonceKey) external view override returns (uint256) {
        return _nonces[nonceKey];
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
        bytes32 nonceKey = frame.nonceKey == bytes32(0) ? _defaultNonceKey(frame.kind) : frame.nonceKey;
        require(frame.nonceSeq == _nonces[nonceKey], "BAD_NONCE");

        bytes32 digest = FrameLib.hashFrame(address(this), frame);
        _verifyFrame(frame, digest, signature);
        _nonces[nonceKey] += 1;

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

    function _defaultNonceKey(FrameTypes.FrameKind kind) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("FRAMEVIBE_DEFAULT_NONCE", uint8(kind)));
    }

    function _revertReason(bytes memory result) internal pure returns (string memory) {
        if (result.length < 68) return "CALL_FAILED";
        assembly {
            result := add(result, 0x04)
        }
        return abi.decode(result, (string));
    }
}

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

contract FrameVibeFactory is ReentrancyGuardLite {
    struct Project {
        address owner;
        address account;
        address verifier;
        address sponsorManager;
        string name;
        string metadataURI;
        bool active;
    }

    mapping(bytes32 projectId => Project project) public projects;
    mapping(address account => bytes32 projectId) public projectOfAccount;

    address[] public allAccounts;

    event ProjectCreated(bytes32 indexed projectId, address indexed owner, address indexed account, address verifier, address sponsorManager, string name);
    event ProjectMetadataUpdated(bytes32 indexed projectId, string metadataURI);

    function createProject(bytes32 projectId, string calldata name, string calldata metadataURI, address owner)
        external
        nonReentrant
        returns (address account, address verifier, address sponsorManager)
    {
        require(projectId != bytes32(0), "BAD_PROJECT_ID");
        require(projects[projectId].account == address(0), "PROJECT_EXISTS");
        require(owner != address(0), "BAD_OWNER");

        bytes32 verifierSalt = keccak256(abi.encode(projectId, owner, "VERIFIER"));
        bytes32 sponsorSalt = keccak256(abi.encode(projectId, owner, "SPONSOR"));
        bytes32 accountSalt = keccak256(abi.encode(projectId, owner, "ACCOUNT"));

        verifier = address(new FrameVerifier{salt: verifierSalt}());
        sponsorManager = address(new FrameSponsorManager{salt: sponsorSalt}(owner));
        account = address(new FrameVibeAccount{salt: accountSalt}(owner, verifier, sponsorManager));

        projects[projectId] = Project({
            owner: owner,
            account: account,
            verifier: verifier,
            sponsorManager: sponsorManager,
            name: name,
            metadataURI: metadataURI,
            active: true
        });

        projectOfAccount[account] = projectId;
        allAccounts.push(account);

        emit ProjectCreated(projectId, owner, account, verifier, sponsorManager, name);
    }

    function predictProjectAddresses(bytes32 projectId, address owner)
        external
        view
        returns (address account, address verifier, address sponsorManager)
    {
        bytes32 verifierSalt = keccak256(abi.encode(projectId, owner, "VERIFIER"));
        bytes32 sponsorSalt = keccak256(abi.encode(projectId, owner, "SPONSOR"));
        bytes32 accountSalt = keccak256(abi.encode(projectId, owner, "ACCOUNT"));

        verifier = _predict(verifierSalt, keccak256(type(FrameVerifier).creationCode));
        sponsorManager = _predict(sponsorSalt, keccak256(abi.encodePacked(type(FrameSponsorManager).creationCode, abi.encode(owner))));
        account = _predict(accountSalt, keccak256(abi.encodePacked(type(FrameVibeAccount).creationCode, abi.encode(owner, verifier, sponsorManager))));
    }

    function updateProjectMetadata(bytes32 projectId, string calldata metadataURI) external {
        Project storage project = projects[projectId];
        require(project.owner == msg.sender, "NOT_PROJECT_OWNER");
        project.metadataURI = metadataURI;
        emit ProjectMetadataUpdated(projectId, metadataURI);
    }

    function accountsLength() external view returns (uint256) {
        return allAccounts.length;
    }

    function _predict(bytes32 salt, bytes32 initCodeHash) internal view returns (address) {
        return address(uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff), address(this), salt, initCodeHash)))));
    }
}
