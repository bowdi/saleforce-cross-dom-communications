import { LightningElement, wire } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import { fireEvent as firePubsubEvent } from 'c/pubsub';

export default class PubsubSender extends LightningElement {
    @wire(CurrentPageReference)
    pageRef;

    messageText;

    sendEvent (event) {
        // create a payload to send
        let payload = {
            message: this.messageText,
            sendTime: window.performance.now()
        }
        firePubsubEvent(this.pageRef, 'pubsubEvent', payload) // fire the event
    }
}