({
    handleEvent : function(component, event, helper) {
        let receiveTime = window.performance.now(); // get current time before any calculations so these don't affect the stats
        // get current values from component
        let numOfMessages = component.get('v.numberOfMessagesReceived');
        let avg = component.get('v.averageMessageTimeMs');
        let min = component.get('v.minMessageTimeMs');
        let max = component.get('v.maxMessageTimeMs');
        // get values from event
        let message =  event.getParam('message');
        let sendTime =  event.getParam('sendTime');

        // perform calculations
        let timeTakenMs = receiveTime - sendTime; // calculate time taken in MS
        numOfMessages += 1; // increment number of messages received
        avg += (timeTakenMs - avg) / numOfMessages; // calculate using incremental avg formula
        min = min < timeTakenMs ? min : timeTakenMs; // asses min
        max = max > timeTakenMs ? max : timeTakenMs; // asses max

        // save results
        component.set('v.numberOfMessagesReceived', numOfMessages);
        component.set('v.averageMessageTimeMs', avg);
        component.set('v.minMessageTimeMs', min);
        component.set('v.maxMessageTimeMs', max);
        component.set('v.lastMessage', message);
        component.set('v.lastMessageTimeTakenMs', timeTakenMs);
    }
})
