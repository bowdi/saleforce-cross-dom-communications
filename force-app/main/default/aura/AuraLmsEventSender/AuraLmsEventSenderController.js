({
    sendEvent : function(component, event, helper) {
        // create a payload to send
        let payload = {
            message: component.get('v.messageText'),
            sendTime: window.performance.now()
        }
        component.find("lmsEvent").publish(payload); // fire the event
    }
})
