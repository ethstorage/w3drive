import {FileContract} from "./contract";

// contract
export const getUploadByAddress = async (controller) => {
    const fileContract = FileContract(controller);
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

export const deleteFile = async (controller, uuid) => {
    const fileContract = FileContract(controller);
    const tx = await fileContract.remove(uuid);
    const receipt = await tx.wait();
    return receipt.status;
}

export const deleteFiles = async (controller, uuids) => {
    const fileContract = FileContract(controller);
    const tx = await fileContract.removes(uuids);
    const receipt = await tx.wait();
    return receipt.status;
}
