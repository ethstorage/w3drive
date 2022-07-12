import { ethers } from "ethers";
import { FileContract } from "./contract";
const sha3 = require('js-sha3').keccak_256;

const stringToHex = (s) => ethers.utils.hexlify(ethers.utils.toUtf8Bytes(s));

const readFile = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (res) => {
      resolve(Buffer.from(res.target.result));
    };
    reader.readAsArrayBuffer(file);
  });
}

const bufferChunk = (buffer, chunkSize) => {
  let i = 0;
  let result = [];
  const len = buffer.length;
  const chunkLength = Math.ceil(len / chunkSize);
  while (i < len) {
    result.push(buffer.slice(i, i += chunkLength));
  }
  return result;
}

const clearOldFile = async (fileContract, chunkSize, hexName) => {
  try {
    const oldChunkSize = await fileContract.countChunks(hexName);
    if (oldChunkSize > chunkSize) {
      // remove
      const tx = await fileContract.remove(hexName);
      console.log(`Remove file: ${hexName}`);
      console.log(`Transaction Id: ${tx.hash}`);
      const receipt = await tx.wait();
      return receipt.status;
    }
  } catch (e) {
    return false;
  }
  return true;
}

const request = async ({
  contractAddress,
  dirPath,
  file,
  onSuccess,
  onError,
  onProgress
}) => {
  if (!window.ethereum) {
    onError(new Error("Can't find metamask"));
    return;
  }
  let account;
  try {
    account = await window.ethereum.enable();
    if (!account) {
      onError(new Error("Can't get Account"));
      return;
    }
  } catch (e) {
    onError(new Error("Can't get Account"));
    return;
  }


  const rawFile = file.raw;
  const content = await readFile(rawFile);
  // file name
  const name = dirPath + rawFile.name;
  const hexName = stringToHex(name);
  const hexType = stringToHex(rawFile.type);
  // Data need to be sliced if file > 475K
  let fileSize = rawFile.size;
  let chunks = [];
  if (fileSize > 475 * 1024) {
    const chunkSize = Math.ceil(fileSize / (475 * 1024));
    chunks = bufferChunk(content, chunkSize);
    fileSize = fileSize / chunkSize;
  } else {
    chunks.push(content);
  }

  const fileContract = FileContract(contractAddress);
  const clear = await clearOldFile(fileContract, chunks.length, hexName, hexType)
  if (!clear) {
    onError(new Error("Check Old File Fail!"));
    return;
  }

  let uploadState = true;
  for (const index in chunks) {
    const chunk = chunks[index];
    let cost = 0;
    if (fileSize > 24 * 1024 - 326) {
      cost = Math.floor((fileSize + 326) / 1024 / 24);
    }
    const hexData = '0x' + chunk.toString('hex');
    const localHash = '0x' + sha3(chunk);
    const hash = await fileContract.getChunkHash(hexName, index);
    if (localHash === hash) {
      console.log(`File ${name} chunkId: ${index}: The data is not changed.`);
      onProgress({ percent: Number(index) + 1});
      continue;
    }

    try {
      // file is remove or change
      const tx = await fileContract.writeChunk(hexName, hexType, index, hexData, {
        value: ethers.utils.parseEther(cost.toString())
      });
      console.log(`Transaction Id: ${tx.hash}`);
      const receipt = await tx.wait();
      if (!receipt.status) {
        uploadState = false;
        break;
      }
      onProgress({ percent: Number(index) + 1});
    } catch (e) {
      uploadState = false;
      break;
    }
  }
  if (uploadState) {
    const url = "https://galileo.web3q.io/file.w3q/" + account + "/" + name;
    onSuccess({ path: url});
  } else {
    onError(new Error('upload request failed!'));
  }
};

export default request;
