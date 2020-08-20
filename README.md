# Cross DOM Communications

| property  | value          |
| --------- | -------------- |
| author    | Will Bowditch  |
| version   | v1: 20.08.2020 |

## Index
* Introduction
* Application Events
* Lightning Message Service
* LWC pubsub module

## Introduction
As we start to move our front end components away from the [Aura](https://developer.salesforce.com/docs/atlas.en-us.lightning.meta/lightning/intro_framework.htm) framework to [Lightning Web Components](https://developer.salesforce.com/docs/component-library/documentation/en/lwc) (LWC) we will very shortly run into scenario's that require communication across the DOM hierarchy as our entire front-end data transportation pattern ([Dispatcher Pattern](https://devops.vitality.co.uk/confluence/display/SD/Dispatcher+Pattern)) is built on top of an event based, cross DOM solution. In [Aura](https://developer.salesforce.com/docs/atlas.en-us.lightning.meta/lightning/intro_framework.htm) this can be handled easily using the built in [event framework](https://developer.salesforce.com/docs/atlas.en-us.lightning.meta/lightning/events_intro.htm) and more specifically, [Application Events](https://developer.salesforce.com/docs/atlas.en-us.lightning.meta/lightning/events_application.htm). As [LWC](https://developer.salesforce.com/docs/component-library/documentation/en/lwc) is built upon the [Web Components](https://github.com/w3c/webcomponents/) standards and uses only very small and specific "modules" of Salesforce proprietary code (exposed as ES6 modules) we don't get the same built in transportation method.

There are two ways of communicating across the DOM when using [LWC](https://developer.salesforce.com/docs/component-library/documentation/en/lwc) that follow our current event based architecture:
* Lightning Message Service (LMS)
* LWC based "pubsub" model / singleton module

We'll explore both for the purposes of this whitepaper so that we get a full picture of options, however, all the time we have some [Aura](https://developer.salesforce.com/docs/atlas.en-us.lightning.meta/lightning/intro_framework.htm) components in our platform that require access to the same data, we will need to use [LWC](https://developer.salesforce.com/docs/component-library/documentation/en/lwc) as it is the only option listed above that supports communicating with both [Aura](https://developer.salesforce.com/docs/atlas.en-us.lightning.meta/lightning/intro_framework.htm) and [LWC](https://developer.salesforce.com/docs/component-library/documentation/en/lwc).