// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Strings.sol";

interface FlatDirectoryFactoryInterface {
    function create() external returns (address);
}

interface IERC5018 {
    enum StorageMode {
        Uninitialized,
        OnChain,
        Blob
    }

    struct FileChunk {
        bytes name;
        uint256[] chunkIds;
    }

    // Large storage methods
    function write(bytes memory name, bytes memory data) external payable;

    function read(bytes memory name) external view returns (bytes memory, bool);

    // return (size, # of chunks)
    function size(bytes memory name) external view returns (uint256, uint256);

    function remove(bytes memory name) external returns (uint256);

    function countChunks(bytes memory name) external view returns (uint256);

    // Chunk-based large storage methods
    function writeChunk(
        bytes memory name,
        uint256 chunkId,
        bytes memory data
    ) external payable;

    function writeChunks(bytes memory name, uint256[] memory chunkIds, uint256[] memory sizes) external payable;

    function readChunk(bytes memory name, uint256 chunkId) external view returns (bytes memory, bool);

    function chunkSize(bytes memory name, uint256 chunkId) external view returns (uint256, bool);

    function removeChunk(bytes memory name, uint256 chunkId) external returns (bool);

    function truncate(bytes memory name, uint256 chunkId) external returns (uint256);

    function refund() external;

    function destruct() external;

    function getChunkHash(bytes memory name, uint256 chunkId) external view returns (bytes32);

    function getChunkHashesBatch(FileChunk[] memory fileChunks) external view returns (bytes32[] memory);

    function getChunkCountsBatch(bytes[] memory names) external view returns (uint256[] memory);

    function getUploadInfo(bytes memory name) external view returns (StorageMode mode, uint256 chunkCount, uint256 storageCost);
}

contract SimpleW3drive {
    using Strings for uint256;

    modifier isCreatedDrive() {
        require(keccak256(fileInfos[msg.sender].uuid) != keccak256(""), "Drive is not create");
        _;
    }

    struct File {
        uint256 time;
        uint256 chunkCount;
        bytes uuid;
        bytes name;
        bytes fileType;
        bytes iv;
    }

    struct FilesInfo {
        bytes uuid;
        bytes driveEncrypt;
        bytes cipherIV;
        File[] files;
        mapping(bytes32 => uint256) fileIds;
    }

    IERC5018 public fileFD;
    mapping(address => FilesInfo) fileInfos;

    constructor(address _factory) {
        FlatDirectoryFactoryInterface factory = FlatDirectoryFactoryInterface(_factory);
        fileFD = IERC5018(factory.create());
    }

    receive() external payable {}

    function createDrive(bytes memory uuid, bytes memory iv, bytes memory driveEncrypt) public {
        FilesInfo storage info = fileInfos[msg.sender];
        require(keccak256(info.uuid) == keccak256(""), "Drive is created");
        info.uuid = uuid;
        info.driveEncrypt = driveEncrypt;
        info.cipherIV = iv;
    }

    function writeChunk(
        bytes memory uuid, bytes memory name,
        bytes memory iv, bytes memory fileType, uint256 chunkCount,
        uint256 chunkId, bytes calldata data
    )
        public
        payable
        isCreatedDrive
    {
        bytes32 uuidHash = keccak256(uuid);
        FilesInfo storage info = fileInfos[msg.sender];
        if (info.fileIds[uuidHash] == 0) {
            // first add file
            info.files.push(File(block.timestamp, chunkCount, uuid, name, fileType, iv));
            info.fileIds[uuidHash] = info.files.length;
        }

        fileFD.writeChunk{value: msg.value}(getNewName(msg.sender, uuid), chunkId, data);
    }

    function remove(bytes memory uuid) public returns (uint256) {
        bytes32 uuidHash = keccak256(uuid);
        FilesInfo storage info = fileInfos[msg.sender];
        require(info.fileIds[uuidHash] != 0, "File does not exist");

        uint256 lastIndex = info.files.length - 1;
        uint256 removeIndex = info.fileIds[uuidHash] - 1;
        if (lastIndex != removeIndex) {
            File storage lastFile = info.files[lastIndex];
            info.files[removeIndex] = lastFile;
            info.fileIds[keccak256(lastFile.uuid)] = removeIndex + 1;
        }
        info.files.pop();
        delete info.fileIds[uuidHash];

        uint256 id = fileFD.remove(getNewName(msg.sender, uuid));
        fileFD.refund();
        payable(msg.sender).transfer(address(this).balance);
        return id;
    }

    function removes(bytes[] memory uuids) public {
        for (uint256 i; i < uuids.length; i++) {
            remove(uuids[i]);
        }
    }

    function getNewName(address author,bytes memory name) public pure returns (bytes memory) {
        return abi.encodePacked(
            Strings.toHexString(uint256(uint160(author)), 20),
            '/',
            name
        );
    }

    function getFileInfos()
        public
        view
        returns (
            uint256[] memory times,
            bytes[] memory uuids,
            bytes[] memory names,
            bytes[] memory types
        )
    {
        uint256 length = fileInfos[msg.sender].files.length;
        times = new uint256[](length);
        uuids = new bytes[](length);
        names = new bytes[](length);
        types = new bytes[](length);
        for (uint256 i; i < length; i++) {
            times[i] = fileInfos[msg.sender].files[i].time;
            uuids[i] = fileInfos[msg.sender].files[i].uuid;
            names[i] = fileInfos[msg.sender].files[i].name;
            types[i] = fileInfos[msg.sender].files[i].fileType;
        }
    }

    function getFileInfo(bytes memory uuid)
        public
        view
        returns(
            uint256 realChunkCount,
            uint256 chunkCount,
            uint256 time,
            bytes memory name,
            bytes memory fileType,
            bytes memory iv
        )
    {
        uint256 count = countChunks(uuid);
        bytes32 uuidHash = keccak256(uuid);
        FilesInfo storage info = fileInfos[msg.sender];
        uint256 index = info.fileIds[uuidHash] - 1;
        File memory file = info.files[index];
        return (count, file.chunkCount, file.time, file.name, file.fileType, file.iv);
    }

    function getFile(bytes memory uuid, uint256 chunkId) public view returns(bytes memory) {
        (bytes memory data, ) = fileFD.readChunk(getNewName(msg.sender, uuid), chunkId);
        return data;
    }

    function getDrive() public view returns(bytes memory uuid, bytes memory iv, bytes memory driveEncrypt) {
        FilesInfo storage info = fileInfos[msg.sender];
        return (info.uuid, info.cipherIV, info.driveEncrypt);
    }

    function getChunkHash(bytes memory uuid, uint256 chunkId) public view returns (bytes32) {
        return fileFD.getChunkHash(getNewName(msg.sender, uuid), chunkId);
    }

    function countChunks(bytes memory uuid) public view returns (uint256) {
        return fileFD.countChunks(getNewName(msg.sender, uuid));
    }
}
