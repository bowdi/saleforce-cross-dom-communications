({
    sendEvent : function(component, event, helper) {
        let eventReq = $A.get('e.c:ApplicationEvent'); // get the application event
        eventReq.setParams({ // set params
            'message' : component.get('v.messageText'),
            'sendTime' : window.performance.now() // send the time the message was sent for stats
        });
        eventReq.fire(); // fire the event
    }
})
