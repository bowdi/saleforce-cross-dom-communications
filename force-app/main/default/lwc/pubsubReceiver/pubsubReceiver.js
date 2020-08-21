import { LightningElement, wire } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import { registerListener } from 'c/pubsub';

export default class PubsubReceiver extends LightningElement {
    @wire(CurrentPageReference)
    pageRef;
    
    numberOfMessagesReceived = 0;
    averageMessageTimeMs = 0;
    minMessageTimeMs;
    maxMessageTimeMs;
    lastMessage;
    lastMessageTimeTakenMs;

    connectedCallback() {
        registerListener('pubsubEvent', this.handleEvent, this);
    }

    handleEvent (event) {
        let receiveTime = window.performance.now(); // get current time before any calculations so these don't affect the stats
        // get current values from component
        let numOfMessages = this.numberOfMessagesReceived;
        let avg = this.averageMessageTimeMs;
        let min = this.minMessageTimeMs;
        let max = this.maxMessageTimeMs;
        // get values from event
        let message =  event.message;
        let sendTime =  event.sendTime;

        // perform calculations
        let timeTakenMs = receiveTime - sendTime; // calculate time taken in MS
        numOfMessages += 1; // increment number of messages received
        avg += (timeTakenMs - avg) / numOfMessages; // calculate using incremental avg formula
        min = min < timeTakenMs ? min : timeTakenMs; // asses min
        max = max > timeTakenMs ? max : timeTakenMs; // asses max

        // save results
        this.numberOfMessagesReceived = numOfMessages;
        this.averageMessageTimeMs = avg;
        this.minMessageTimeMs = min;
        this.maxMessageTimeMs = max;
        this.lastMessage = message;
        this.lastMessageTimeTakenMs = timeTakenMs;
    }
}