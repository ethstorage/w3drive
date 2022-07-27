import {FileContract} from "./contract";
import {decryptFile} from "./dirve/w3drive";
import {ethers} from "ethers";
const hexToString = (h) => ethers.utils.toUtf8String(h);

// contract
export const getUploadByAddress = async (contract) => {
    const fileContract = FileContract(contract);
    const result = await fileContract.getFileInfos();
    const files = [];
    const times = result[0];
    const uuids = result[1];
    const names = result[2];
    const types = result[3];
    const ivs = result[4];
    for (let i = 0; i < uuids.length; i++) {
        const file = {
            time: new Date(parseInt(times[i], 10) * 1000),
            uuid: uuids[i],
            name: names[i],
            type: types[i],
            ivs: ivs[i],
            showProgress: false
        };
        files.push(file);
    }
    files.sort(function (a, b) {
        return a.time - b.time
    });
    return files;
}

export const deleteFile = async (contract, uuid) => {
    const fileContract = FileContract(contract);
    const tx = await fileContract.remove(uuid);
    const receipt = await tx.wait();
    return receipt.status;
}

export const deleteFiles = async (contract, uuids) => {
    const fileContract = FileContract(contract);
    const tx = await fileContract.removes(uuids);
    const receipt = await tx.wait();
    return receipt.status;
}

export const getFile = async (contract, driveKey, uuid) => {
    const fileContract = FileContract(contract);
    const [fileInfo, encryptData] = await Promise.all([
        fileContract.getFileInfo(uuid),
        fileContract.getFile(uuid, 0),
    ]);
    uuid = hexToString(uuid);
    const iv = hexToString(fileInfo.iv);
    const data = await decryptFile(driveKey, uuid, encryptData, iv);
    return {
        name: fileInfo.name,
        time: new Date(parseInt(fileInfo.time, 10) * 1000),
        type: fileInfo.fileType,
        data,
    }
}
