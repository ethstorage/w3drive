import {ethers} from "ethers";
import {FileContract} from "../contract";
import {deriveDriveKey, deriveFileKey, fileDecrypt, fileEncrypt} from "./w3crypto";

const stringToHex = (s) => ethers.utils.hexlify(ethers.utils.toUtf8Bytes(s));

export const getDriveId = async (controller) => {
    const fileContract = FileContract(controller);
    const result = await fileContract.getDriveId();
    return result??stringToHex(result);
}

export const login = async (driveId) =>{
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    return await signer.signMessage("\n\nDriveId: " + driveId + "\n\nMessage: Login to w3drive and sign.");
}

export const createDrive = async (signature, fileId) => {
    const key = await deriveDriveKey(signature, "123456");
    console.log(key);
    return await deriveFileKey(key, fileId);
}

export const encrypt = async (fileKey, path) => {
    return await fileEncrypt(fileKey, path);
}

// const fileinfo = await fileEncrypt("EnAPR72tkIFRbrWDCF4ROAtyJ3YdtYscuY2xmlfghCg", content);
// console.log(fileinfo, fileinfo.data.toString());
// const fi = await fileDecrypt(fileinfo.cipherIV,"EnAPR72tkIFRbrWDCF4ROAtyJ3YdtYscuY2xmlfghCg", fileinfo.data);
// console.log(fi.toString());

