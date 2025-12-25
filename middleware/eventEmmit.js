import { EventEmitter } from "events";
import { handleError } from "../utils/helper.js";
import { sendWarningEmail } from "../utils/sendEmail.js";

const eventEmitter = new EventEmitter();

eventEmitter.on('limit_hit', async (data) => {
    try{
        await sendWarningEmail(data.email , data.action , data.meta);
    }catch(err){
        handleError(err);
    }
});

export default eventEmitter;