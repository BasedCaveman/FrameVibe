// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./FrameSponsorManager.sol";
import "./FrameVerifier.sol";
import "./FrameVibeAccount.sol";
import "./libraries/ReentrancyGuardLite.sol";

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
