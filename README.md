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

#### Aura Application Event Sender
##### Component
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
##### Controller
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

#### Aura Application Event Receiver
##### Component
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
##### Controller
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

## Lightning Message Service
### Method
The [Lightning Message Service](https://releasenotes.docs.salesforce.com/en-us/summer20/release-notes/rn_lc_message_channel.htm) (LMS) was made generally available as of the Summer 20' release. It is a a message service to communicate across the DOM and across presentation technologies ([Visualforce](https://developer.salesforce.com/docs/atlas.en-us.pages.meta/pages/pages_intro_what_is_it.htm), [Aura](https://developer.salesforce.com/docs/atlas.en-us.lightning.meta/lightning/intro_framework.htm), [LWC](https://developer.salesforce.com/docs/component-library/documentation/en/lwc)) and even into the Lightning Utility Bar (think communicating to a softphone which uses Open CTI). This puts the technology in an extremely useful position for us as it:
1. Allows us to communicate across the DOM regardless of our technology.
2. Allows us to transfer data & events between frameworks. This is particularly useful while we are transitioning from [Aura](https://developer.salesforce.com/docs/atlas.en-us.lightning.meta/lightning/intro_framework.htm) to [LWC](https://developer.salesforce.com/docs/component-library/documentation/en/lwc).
3. Allows us to gain the increased performance benefits of [LWC](https://developer.salesforce.com/docs/component-library/documentation/en/lwc) for our dispatcher architecture but maintain compatibility with our legacy components after a transition away from [Application Events](https://developer.salesforce.com/docs/atlas.en-us.lightning.meta/lightning/events_application.htm) to [LMS](https://releasenotes.docs.salesforce.com/en-us/summer20/release-notes/rn_lc_message_channel.htm).

To test the [LMS](https://releasenotes.docs.salesforce.com/en-us/summer20/release-notes/rn_lc_message_channel.htm) I created sending and receiving components in both [Aura](https://developer.salesforce.com/docs/atlas.en-us.lightning.meta/lightning/intro_framework.htm) and [LWC](https://developer.salesforce.com/docs/component-library/documentation/en/lwc). The logic is identical between this test and the [Application Events](https://developer.salesforce.com/docs/atlas.en-us.lightning.meta/lightning/events_application.htm) baseline, the only difference for the [Aura](https://developer.salesforce.com/docs/atlas.en-us.lightning.meta/lightning/intro_framework.htm) components is the method to send the event and i've ported across the logic to [LWC](https://developer.salesforce.com/docs/component-library/documentation/en/lwc) as seen below:

#### Aura LMS Sender
##### Component
``` HTML
<aura:component implements="flexipage:availableForAllPageTypes">
    <aura:attribute name="messageText" type="String" default="Hello!"/>

    <lightning:messageChannel type="LmsEvent__c" aura:id="lmsEvent"/>

    <lightning:card title="Aura - LMS Event Sender">
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

##### Controller
``` Javascript
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
```

#### Aura LMS Receiver
##### Component
``` HTML
<aura:component implements="flexipage:availableForAllPageTypes">
    <aura:attribute name="numberOfMessagesReceived" type="Integer" default="0"/>
    <aura:attribute name="averageMessageTimeMs" type="Integer" default="0"/>
    <aura:attribute name="minMessageTimeMs" type="Integer"/>
    <aura:attribute name="maxMessageTimeMs" type="Integer"/>

    <aura:attribute name="lastMessage" type="Integer" default="0"/>
    <aura:attribute name="lastMessageTimeTakenMs" type="Integer" default="0"/>

    <lightning:messageChannel type="LmsEvent__c" onMessage="{!c.handleEvent}"/>

    <lightning:card title="Aura - LMS Event Receiver">
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

##### Controller
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

#### LWC LMS Sender
##### Template
``` HTML
<template>
    <lightning-card title="LWC - LMS Event Sender">
        <div class="slds-var-p-around_large">
            <lightning-input name="messageText" label="Message Text" value={messageText}></lightning-input>
            <br/>
            <div class="slds-align_absolute-center">
                <lightning-button label="Send Message" title="Send event" onclick={sendEvent}></lightning-button>
            </div>
        </div>
    </lightning-card>
</template>
```

##### Controller
``` Javascript
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
```

#### LWC LMS Receiver
##### Template
``` HTML
<template>
    <lightning-card title="LWC - LMS Event Receiver">
        <div class="slds-var-p-around_large">
            <span>Number Of Messages Received: {numberOfMessagesReceived}</span><br/>
            <span>Average Message Time (ms): {averageMessageTimeMs}</span><br/>
            <span>Min Message Time (ms): {minMessageTimeMs}</span><br/>
            <span>Max Message Time (ms): {maxMessageTimeMs}</span><br/>
            <span>Last Message: {lastMessage}</span><br/>
            <span>Last Message Time Taken (ms): {lastMessageTimeTakenMs}</span><br/>
        </div>
    </lightning-card>
</template>
```

##### Controller
``` Javascript
import { LightningElement, wire } from 'lwc';
import { subscribe, unsubscribe, MessageContext } from 'lightning/messageService';
import LMS_EVENT from "@salesforce/messageChannel/LmsEvent__c";

export default class LmsEventReceiver extends LightningElement {
    @wire(MessageContext)
    messageContext;
    
    subscription = null;
    numberOfMessagesReceived = 0;
    averageMessageTimeMs = 0;
    minMessageTimeMs;
    maxMessageTimeMs;
    lastMessage;
    lastMessageTimeTakenMs;

    connectedCallback() {
        this.subscribeMC();
    }

    subscribeMC() {
        if (this.subscription) {
            return;
        }
        this.subscription = subscribe(
            this.messageContext,
            LMS_EVENT, 
            (message) => {
                this.handleEvent(message);
            });
    }

    unsubscribeMC() {
        unsubscribe(this.subscription);
        this.subscription = null;
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
```

### Results
#### Aura -> Aura
* Number Of Messages Received: 1000
* Average Message Time (ms): 0.1560799994040281
* Min Message Time (ms): 0.10000006295740604
* Max Message Time (ms): 2.194999950006604

#### Aura -> LWC
* Number Of Messages Received: 1000
* Average Message Time (ms): 0.09055500244721773
* Min Message Time (ms): 0.06499979645013809
* Max Message Time (ms): 1.1650000233203173

#### LWC -> Aura
* Number Of Messages Received: 1000
* Average Message Time (ms): 0.09681999636813995
* Min Message Time (ms): 0.06500002928078175
* Max Message Time (ms): 1.5700000803917646

#### LWC -> LWC
* Number Of Messages Received: 1000
* Average Message Time (ms): 0.10207499819807722
* Min Message Time (ms): 0.059999991208314896
* Max Message Time (ms): 1.6700001433491707

## LWC pubsub ES6 module
### Method
Before [LMS](https://releasenotes.docs.salesforce.com/en-us/summer20/release-notes/rn_lc_message_channel.htm) was made generally available, Salesforce released a unsupported [LWC](https://developer.salesforce.com/docs/component-library/documentation/en/lwc) solution was provided that used a [singleton](https://en.wikipedia.org/wiki/Singleton_pattern) [ES6 module](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) that creates an event like pattern but not backed by a official Metadata base. This solution however, is not interoperable with [Aura](https://developer.salesforce.com/docs/atlas.en-us.lightning.meta/lightning/intro_framework.htm) so is not suitable for us at this point in time. I decided to test this still as when we have progressed enough into our [LWC](https://developer.salesforce.com/docs/component-library/documentation/en/lwc) migration there may be suitable use cases for a [LWC](https://developer.salesforce.com/docs/component-library/documentation/en/lwc) only event solution.

I won't put the code for the module here but it is available on [Github](https://github.com/developerforce/pubsub).

Again, the logic in both the [LWC](https://developer.salesforce.com/docs/component-library/documentation/en/lwc) sender and receiver is identical to the baseline and the [LMS](https://releasenotes.docs.salesforce.com/en-us/summer20/release-notes/rn_lc_message_channel.htm) tests to retain parity.

#### LWC pubsub sender
##### Template
``` HTML
<template>
    <lightning-card title="LWC - pubsub Event Sender">
        <div class="slds-var-p-around_large">
            <lightning-input name="messageText" label="Message Text" value={messageText}></lightning-input>
            <br/>
            <div class="slds-align_absolute-center">
                <lightning-button label="Send Message" title="Send event" onclick={sendEvent}></lightning-button>
            </div>
        </div>
    </lightning-card>
</template>
```

##### Controller
``` Javascript
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
```

#### LWC pubsub receiver
##### Template
``` HTML
<template>
    <lightning-card title="LWC - pubsub Event Receiver">
        <div class="slds-var-p-around_large">
            <span>Number Of Messages Received: {numberOfMessagesReceived}</span><br/>
            <span>Average Message Time (ms): {averageMessageTimeMs}</span><br/>
            <span>Min Message Time (ms): {minMessageTimeMs}</span><br/>
            <span>Max Message Time (ms): {maxMessageTimeMs}</span><br/>
            <span>Last Message: {lastMessage}</span><br/>
            <span>Last Message Time Taken (ms): {lastMessageTimeTakenMs}</span><br/>
        </div>
    </lightning-card>
</template>
```

##### Controller
``` Javascript
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
```
### Results
* Number Of Messages Received: 1000
* Average Message Time (ms): 0.03721000091172755
* Min Message Time (ms): 0.019999919459223747
* Max Message Time (ms): 0.7499998901039362
