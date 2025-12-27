import { EventEmitter } from "events";
import { handleError } from "../utils/helper.js";
import { sendWarningEmail , sendLoginAlertEmail } from "../utils/sendEmail.js";

const eventEmitter = new EventEmitter();

eventEmitter.on('limit_hit', async (data) => {
    try{
        // expect data.meta = { ip, device }
        await sendWarningEmail(data.email, data.action, data.meta);
    }catch(err){
        handleError(err);
    }
});
eventEmitter.on('NEW_LOGIN', async (data) => {
    try{
        await sendLoginAlertEmail(data.email, data.action, data.meta);

    }catch(err){
        handleError(err);
    }
});

export default eventEmitter;