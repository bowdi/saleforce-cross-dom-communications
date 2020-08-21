# Cross DOM Communications

| property  | value          |
| --------- | -------------- |
| author    | Will Bowditch  |
| version   | v1: 20.08.2020 |
| story     | HSPM-108       |

## Index
* Introduction
* Application Events
* Lightning Message Service
  * LWC -> LWC
  * LWC -> Aura
  * Aura -> LWC
  * Aura -> Aura
* LWC pubsub ES6 module
* Conclusion

## Introduction
As we start to move our front end components away from the [Aura](https://developer.salesforce.com/docs/atlas.en-us.lightning.meta/lightning/intro_framework.htm) framework to [Lightning Web Components](https://developer.salesforce.com/docs/component-library/documentation/en/lwc) (LWC) we will very shortly run into scenario's that require communication across the DOM hierarchy as our entire front-end data transportation pattern ([Dispatcher Pattern](https://devops.vitality.co.uk/confluence/display/SD/Dispatcher+Pattern)) is built on top of an event based, cross DOM solution. In [Aura](https://developer.salesforce.com/docs/atlas.en-us.lightning.meta/lightning/intro_framework.htm) this can be handled easily using the built in [event framework](https://developer.salesforce.com/docs/atlas.en-us.lightning.meta/lightning/events_intro.htm) and more specifically, [Application Events](https://developer.salesforce.com/docs/atlas.en-us.lightning.meta/lightning/events_application.htm). As [LWC](https://developer.salesforce.com/docs/component-library/documentation/en/lwc) is built upon the [Web Components](https://github.com/w3c/webcomponents/) standards and uses only very small and specific "modules" of Salesforce proprietary code (exposed as ES6 modules) we don't get the same built in transportation method.

There are two ways of communicating across the DOM when using [LWC](https://developer.salesforce.com/docs/component-library/documentation/en/lwc) that follow our current event based architecture:
* Lightning Message Service (LMS)
* LWC based "pubsub" model / singleton module

We'll explore both for the purposes of this whitepaper so that we get a full picture of options, however, all the time we have some [Aura](https://developer.salesforce.com/docs/atlas.en-us.lightning.meta/lightning/intro_framework.htm) components in our platform that require access to the same data, we will need to use [LWC](https://developer.salesforce.com/docs/component-library/documentation/en/lwc) as it is the only option listed above that supports communicating with both [Aura](https://developer.salesforce.com/docs/atlas.en-us.lightning.meta/lightning/intro_framework.htm) and [LWC](https://developer.salesforce.com/docs/component-library/documentation/en/lwc).

## Application Events
### Method
It's worth first baselining the performance against the current technology and this involves running a test against a new [scratch org](https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_scratch_orgs.htm). To start I created a blank org using the shape defined in [this](https://devops.vitality.co.uk/bitbucket/projects/HLXS/repos/cross-dom-comms-whitepaper/browse) repo. I then created two [Aura](https://developer.salesforce.com/docs/atlas.en-us.lightning.meta/lightning/intro_framework.htm) components, one sender and one receiver with a matching [Application Event](https://developer.salesforce.com/docs/atlas.en-us.lightning.meta/lightning/events_application.htm).

A Lightning page was then setup with the two components on at the same level (thus making sure they are communicator across the DOM tree) so I could monitor the results and trigger the event.

The sender is a simple component that has an input box for a message (for testing purposed), a button to trigger the send of the event and some javascript to send the message along with the current time.

#### Component
``` HTML
<aura:component implements="flexipage:availableForAllPageTypes">
    <aura:attribute name="messageText" type="String" default="Hello!"/>

    <aura:registerEvent name="applicationEvent" type="c:ApplicationEvent"/>

    <lightning:card>
        <div class="slds-var-p-around_large">
            <lightning:input name="messageText" label="Message Text" value="{!v.messageText}"/>
            <br/>
            <div class="slds-align_absolute-center">
                <lightning:button label="Send Message" title="Send event" onclick="{!c.sendEvent}"/>
            </div>
        </div>
    </lightning:card>
</aura:component>	
```
#### Controller
``` Javascript
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
```

The only thing worth mentioning about the above code is the use of `window.performance.now()` rather than `new Date().getTime()`. I've used this so we can get sub-millisecond timings.

The sender is equally as simple, with markup just facilitating the showing of the results and Javascript performing calculations as events are received.

#### Component
``` HTML
<aura:component implements="flexipage:availableForAllPageTypes">
    <aura:attribute name="numberOfMessagesReceived" type="Integer" default="0"/>
    <aura:attribute name="averageMessageTimeMs" type="Integer" default="0"/>
    <aura:attribute name="minMessageTimeMs" type="Integer"/>
    <aura:attribute name="maxMessageTimeMs" type="Integer"/>

    <aura:attribute name="lastMessage" type="Integer" default="0"/>
    <aura:attribute name="lastMessageTimeTakenMs" type="Integer" default="0"/>

    <aura:handler event="c:ApplicationEvent" action="{!c.handleEvent}"/>

    <lightning:card>
        <div class="slds-var-p-around_large">
            <span>Number Of Messages Received: {!v.numberOfMessagesReceived}</span><br/>
            <span>Average Message Time (ms): {!v.averageMessageTimeMs}</span><br/>
            <span>Min Message Time (ms): {!v.minMessageTimeMs}</span><br/>
            <span>Max Message Time (ms): {!v.maxMessageTimeMs}</span><br/>
            <span>Last Message: {!v.lastMessage}</span><br/>
            <span>Last Message Time Taken (ms): {!v.lastMessageTimeTakenMs}</span><br/>
        </div>
    </lightning:card>
</aura:component>	

```
#### Controller
``` Javascript
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
```

The only thing noteable in this code is the method of average calculation. To save having to keep all results in a list and iterating through each result when we receive every event we use the incremental averaging equation discussed [here](https://blog.demofox.org/2016/08/23/incremental-averaging/) who's source is [this](http://math.stackexchange.com/questions/106700/incremental-averageing) question.

With all this setup we can start to test the performance of the Application Events. I fired the Application Event 1000 times to ensure we had enough data to calculate a meaningful average.

### Results
* Number Of Messages Received: 1000
* Average Message Time (ms): 0.06601499463431537
* Min Message Time (ms): 0.024999957531690598
* Max Message Time (ms): 2.749999985098839
