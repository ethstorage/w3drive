import { ethers } from "ethers";
import { FileContract } from "./contract";
import { v4 as uuidv4} from 'uuid';
import { createFileEncrypt } from "./dirve/w3drive";

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

const base64Img = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (res) => {
      resolve(res.target.result);
    };
    reader.readAsDataURL(file);
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

export const request = async ({
  chunkLength,
  account,
  driveKey,
  contractAddress,
  file,
  onSuccess,
  onError,
  onProgress
}) => {
  // read file
  const rawFile = file.raw;
  const data = await readFile(rawFile);
  // encrypt file
  const uuid = uuidv4();
  const encryptResult = await createFileEncrypt(driveKey, uuid, data);
  const content = encryptResult.data;
  const iv = encryptResult.cipherIV;// iv is different every time

  // Data need to be sliced if file > 475K
  let fileSize = content.length;
  let chunks = [];
  if (fileSize > chunkLength) {
    const chunkSize = Math.ceil(fileSize / chunkLength);
    chunks = bufferChunk(content, chunkSize);
    fileSize = fileSize / chunkSize;
  } else {
    chunks.push(content);
  }

  // file name
  const hexUuid = stringToHex(uuid);
  const hexName = stringToHex(rawFile.name);
  const hexType = stringToHex(rawFile.type);
  const hexIv = stringToHex(iv);

  const fileContract = FileContract(contractAddress);
  let uploadState = true;
  let notEnoughBalance = false;
  for (const index in chunks) {
    const chunk = chunks[index];
    let cost = 0;
    if (fileSize > 24 * 1024 - 326) {
      cost = Math.floor((fileSize + 326) / 1024 / 24);
    }
    const hexData = '0x' + chunk.toString('hex');
    try {
      const balance = await fileContract.provider.getBalance(account);
      if(balance.lte(ethers.utils.parseEther(cost.toString()))){
        // not enough balance
        uploadState = false;
        notEnoughBalance = true;
        break;
      }

      // file is remove or change
      const tx = await fileContract.writeChunk(hexUuid, hexName, hexIv, hexType, chunks.length, index, hexData, {
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
    if(rawFile.type.includes('image')) {
      const img = await base64Img(rawFile);
      onSuccess({uuid: uuid, img: img});
      return;
    }
    onSuccess({ uuid: uuid});
  } else {
    if (notEnoughBalance) {
      onError(new NotEnoughBalance('Not enough balance'));
    } else {
      onError(new Error('upload request failed!'));
    }
  }
};

export class NotEnoughBalance extends Error {}
