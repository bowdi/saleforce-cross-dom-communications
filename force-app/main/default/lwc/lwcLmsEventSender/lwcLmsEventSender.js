import { LightningElement, wire } from 'lwc';
import { publish, MessageContext } from 'lightning/messageService';
import LMS_EVENT from "@salesforce/messageChannel/LmsEvent__c";

export default class LmsEventSender extends LightningElement {
    @wire(MessageContext)
    messageContext;
    messageText;

    sendEvent (event) {
        // create a payload to send
        let payload = {
            message: this.messageText,
            sendTime: window.performance.now()
        }
        publish(this.messageContext, LMS_EVENT, payload) // fire the event
    }
}