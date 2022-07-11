import {ethers} from "ethers";

const login = async () =>{
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    let signature = await signer.signMessage("Hello world \n test");
    console.log("signature",signature);
    // const fileId = wrappedFile.existingId ?? EID(uuidv4());
    return signature;
}
