import {ethers} from "ethers";

const FileContractInfo = {
    abi: [
        "function writeChunk(bytes memory name, bytes memory fileType, uint256 chunkId, bytes calldata data) public payable",
        "function remove(bytes memory name) external returns (uint256)",
        "function removes(bytes[] memory names) public",
        "function countChunks(bytes memory name) external view returns (uint256)",
        "function getChunkHash(bytes memory name, uint256 chunkId) public view returns (bytes32)",
        "function getFileInfos() public view returns (uint256[] memory times,bytes[] memory uuids,bytes[] memory names,bytes[] memory types)",
        "function getDriveId() public view returns(bytes memory)",
        "function getFile(bytes memory uuid) public view returns(bytes memory)"
    ],
};

export const FileContract = (address) => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contract = new ethers.Contract(address, FileContractInfo.abi, provider);
    return contract.connect(provider.getSigner());
};
