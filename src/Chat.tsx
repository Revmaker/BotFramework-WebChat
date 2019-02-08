import * as React from 'react';
import { findDOMNode } from 'react-dom';

import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';

import { Activity, IBotConnection, User, DirectLine, DirectLineOptions, CardActionTypes, EventActivity } from 'botframework-directlinejs';
import { createStore, ChatActions, sendMessage, initializeConnection, ChatState } from './Store';
import { Provider } from 'react-redux';
import { SpeechOptions } from './SpeechOptions';
import { Speech } from './SpeechModule';
import { ActivityOrID, FormatOptions } from './Types';
import * as konsole from './Konsole';
import { getTabIndex } from './getTabIndex';
import { getStoredActivities, clearStoredActivities } from './helpers/storeActivity';
import SplitPane from 'react-split-pane';
import { Log } from './Log';
import { State } from './State';
import { Header } from './Header';

export interface IVendorConfig {
    name: string;
    id: string;
};

export interface ChatProps {
    adaptiveCardsHostConfig: any,
    chatTitle?: boolean | string,
    vendors: IVendorConfig[],
    secret: string,
    user: User,
    bot: User,
    botConnection: DirectLine,
    actionEndpointUrl: string,
    speechOptions?: SpeechOptions,
    locale?: string,
    selectedActivity?: BehaviorSubject<ActivityOrID>,
    sendTyping?: boolean,
    showUploadButton?: boolean,
    formatOptions?: FormatOptions,
    sentryDsn: string;
    sentryEnvironment: string;
    resize?: 'none' | 'window' | 'detect'
}

import { History } from './History';
import { MessagePane } from './MessagePane';
import { Shell, ShellFunctions } from './Shell';
import axios from 'axios';
import { string } from 'prop-types';

export class Chat extends React.Component<ChatProps, {}> {

    private store = createStore();

    private botConnection: IBotConnection;

    private shellRef: React.Component & ShellFunctions;
    private historyRef: React.Component;
    private chatviewPanelRef: HTMLElement;

    private resizeListener = () => this.setSize();

    private _handleCardAction = this.handleCardAction.bind(this);
    private _handleKeyDownCapture = this.handleKeyDownCapture.bind(this);
    private _saveChatviewPanelRef = this.saveChatviewPanelRef.bind(this);
    private _saveHistoryRef = this.saveHistoryRef.bind(this);
    private _saveShellRef = this.saveShellRef.bind(this);

    constructor(props: ChatProps) {
        super(props);

        konsole.log("BotChat.Chat props", props);

        this.store.dispatch<ChatActions>({
            type: 'Set_Locale',
            locale: props.locale || (window.navigator as any)["userLanguage"] || window.navigator.language || 'en'
        });

        if (props.adaptiveCardsHostConfig) {
            this.store.dispatch<ChatActions>({
                type: 'Set_AdaptiveCardsHostConfig',
                payload: props.adaptiveCardsHostConfig
            });
        }

        let { chatTitle } = props;

        if (props.formatOptions) {
            console.warn('DEPRECATED: "formatOptions.showHeader" is deprecated, use "chatTitle" instead. See https://github.com/Microsoft/BotFramework-WebChat/blob/master/CHANGELOG.md#formatoptionsshowheader-is-deprecated-use-chattitle-instead.');

            if (typeof props.formatOptions.showHeader !== 'undefined' && typeof props.chatTitle === 'undefined') {
                chatTitle = props.formatOptions.showHeader;
            }
        }

        if (typeof chatTitle !== 'undefined') {
            this.store.dispatch<ChatActions>({ type: 'Set_Chat_Title', chatTitle });
        }

        this.store.dispatch<ChatActions>({ type: 'Toggle_Upload_Button', showUploadButton: false });

        if (props.sendTyping) {
            this.store.dispatch<ChatActions>({ type: 'Set_Send_Typing', sendTyping: props.sendTyping });
        }

        if (props.speechOptions) {
            Speech.SpeechRecognizer.setSpeechRecognizer(props.speechOptions.speechRecognizer);
            Speech.SpeechSynthesizer.setSpeechSynthesizer(props.speechOptions.speechSynthesizer);
        }

        this.onChangeVendor = this.onChangeVendor.bind(this);
        this.setDirectLineOptions = this.setDirectLineOptions.bind(this);
    }

    private setSize() {
        this.store.dispatch<ChatActions>({
            type: 'Set_Size',
            width: this.chatviewPanelRef.offsetWidth,
            height: this.chatviewPanelRef.offsetHeight
        });
    }

    private handleCardAction() {
        // After the user click on any card action, we will "blur" the focus, by setting focus on message pane
        // This is for after click on card action, the user press "A", it should go into the chat box
        const historyDOM = findDOMNode(this.historyRef) as HTMLElement;

        if (historyDOM) {
            historyDOM.focus();
        }
    }

    private handleKeyDownCapture(evt: React.KeyboardEvent<HTMLDivElement>) {
        const target = evt.target as HTMLElement;
        const tabIndex = getTabIndex(target);

        if (
            evt.altKey
            || evt.ctrlKey
            || evt.metaKey
            || (!inputtableKey(evt.key) && evt.key !== 'Backspace')
        ) {
            // Ignore if one of the utility key (except SHIFT) is pressed
            // E.g. CTRL-C on a link in one of the message should not jump to chat box
            // E.g. "A" or "Backspace" should jump to chat box
            return;
        }

        if (
            target === findDOMNode(this.historyRef)
            || typeof tabIndex !== 'number'
            || tabIndex < 0
        ) {
            evt.stopPropagation();

            let key: string;

            // Quirks: onKeyDown we re-focus, but the newly focused element does not receive the subsequent onKeyPress event
            //         It is working in Chrome/Firefox/IE, confirmed not working in Edge/16
            //         So we are manually appending the key if they can be inputted in the box
            if (/(^|\s)Edge\/16\./.test(navigator.userAgent)) {
                key = inputtableKey(evt.key);
            }

            this.shellRef.focus(key);
        }
    }

    private saveChatviewPanelRef(chatviewPanelRef: HTMLElement) {
        this.chatviewPanelRef = chatviewPanelRef;
    }

    private saveHistoryRef(historyWrapper: any) {
        this.historyRef = historyWrapper && historyWrapper.getWrappedInstance();
    }

    private saveShellRef(shellWrapper: any) {
        this.shellRef = shellWrapper && shellWrapper.getWrappedInstance();
    }

    private onChangeVendor(vendor: IVendorConfig) {
        clearStoredActivities();
        
        this.store.dispatch<ChatActions>({ 
            type: "Clear_History",
        });

        this.setDirectLineOptions(vendor);
    }

    private setDirectLineOptions(vendor: IVendorConfig) {
        this.store.dispatch<ChatActions>({ 
            type: "Configure_DirectLine_Options",
            user: this.props.user,
            bot: this.props.bot,
            secret: this.props.secret, 
            vendorId: vendor.id, 
        });
    }

    componentDidMount() {
        // Now that we're mounted, we know our dimensions. Put them in the store (this will force a re-render)
        this.setSize();

        // Configure directline options
        this.setDirectLineOptions(this.props.vendors[0]);

        // Get all activies in storage
        const storedActivities = getStoredActivities();

        // Activities in storage, add them to history.
        if (storedActivities.length > 0) {
            storedActivities.filter((activity: Activity) => activity.type == 'message')
            .forEach((activity: Activity) => {
              this.store.dispatch<ChatActions>({ activity, type: "Add_Message"});
            });

            storedActivities.filter((activity: EventActivity) => activity.type == 'event')
            .forEach((activity: EventActivity) => {
              this.store.dispatch<ChatActions>({ activity, type: "Add_Event"});
            });
        } 
        
        // Nothing in storage, fetch initial messages.
        else {
            /*
            axios.request<Activity[]>({
                method: 'GET',
                url: this.props.actionEndpointUrl,
            })
            .then((response) => {
                const { data } = response
                data.forEach((activity) => { 
                    this.store.dispatch<ChatActions>({ activity, type: "Receive_Message"})
                });
            })
            */
        }

        if (this.props.resize === 'window')
            window.addEventListener('resize', this.resizeListener);
    }

    componentWillUnmount() {
        // TODO: Re-enable, possibly want to unsubscribe and end connection
        //this.connectionStatusSubscription.unsubscribe();
        //this.activitySubscription.unsubscribe();
        //if (this.selectedActivitySubscription)
        //    this.selectedActivitySubscription.unsubscribe();
        //if (this.botConnection)
        //    this.botConnection.end();
        window.removeEventListener('resize', this.resizeListener);
    }

    componentWillReceiveProps(nextProps: ChatProps) {
        if (this.props.adaptiveCardsHostConfig !== nextProps.adaptiveCardsHostConfig) {
            this.store.dispatch<ChatActions>({
                type: 'Set_AdaptiveCardsHostConfig',
                payload: nextProps.adaptiveCardsHostConfig
            });
        }

        if (this.props.showUploadButton !== nextProps.showUploadButton) {
            this.store.dispatch<ChatActions>({
                type: 'Toggle_Upload_Button',
                showUploadButton: nextProps.showUploadButton
            });
        }

        if (this.props.chatTitle !== nextProps.chatTitle) {
            this.store.dispatch<ChatActions>({
                type: 'Set_Chat_Title',
                chatTitle: nextProps.chatTitle
            });
        }

    }

    // At startup we do three render passes:
    // 1. To determine the dimensions of the chat panel (nothing needs to actually render here, so we don't)
    // 2. To determine the margins of any given carousel (we just render one mock activity so that we can measure it)
    // 3. (this is also the normal re-render case) To render without the mock activity

    render() {
        const state = this.store.getState();
        konsole.log("BotChat.Chat state", state);

        const headerTitle = typeof state.format.chatTitle === 'string' ? state.format.chatTitle : state.format.strings.title;

        // only render real stuff after we know our dimensions
        return (
            <Provider store={ this.store }>
                <SplitPane split="vertical" minSize={600} primary="second">
                    <div
                        className="wc-chatview-panel"
                        onKeyDownCapture={ this._handleKeyDownCapture }
                        ref={ this._saveChatviewPanelRef }
                    >
                        <Header title={headerTitle} onChangeVendor={this.onChangeVendor} vendors={this.props.vendors} />
                        <MessagePane>
                            <History
                                onCardAction={ this._handleCardAction }
                                ref={ this._saveHistoryRef }
                            />
                        </MessagePane>
                        <Shell ref={ this._saveShellRef } />
                        {
                            this.props.resize === 'detect' &&
                                <ResizeDetector onresize={ this.resizeListener } />
                        }
                    </div>
                    <SplitPane split="horizontal" minSize={300} primary="second">
                        <Log />
                        <State />
                    </SplitPane>
                </SplitPane>
            </Provider>
        );
    }
}

export interface IDoCardAction {
    (type: CardActionTypes | 'locationButton', value: string | object, buttonTitle?: string): void;
}

export const doCardAction = (
    from: User,
    locale: string,
    sendMessage: (value: string) => void,
    sendPostBack: (text: string, value: object) => void,
    addMessage: (value: string, user: User, locale: string) => void,
): IDoCardAction => (
    type,
    actionValue,
    buttonTitle
) => {
    const text = (typeof actionValue === 'string') ? actionValue as string : undefined;
    const value = (typeof actionValue === 'object')? actionValue as object : undefined;

    switch (type) {
        case "imBack":
            if (typeof text === 'string')
                sendMessage(text);
            break;
        case "postBack":
            sendPostBack(text, value);
            addMessage(buttonTitle, from, locale);
            break;
        case "locationButton":
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(function(position) {
                    const locationMessage = getLocationMessage(position.coords.latitude, position.coords.longitude);
                    sendPostBack(locationMessage, value);
                    addMessage(buttonTitle, from, locale);
                });
            }
            break;
        case "call":
        case "openUrl":
        case "playAudio":
        case "playVideo":
        case "showImage":
        case "downloadFile":
            window.open(text);
            break;
        // TODO: Re-enable
        /*
        case "signin":
            let loginWindow =  window.open();
            if (botConnection.getSessionId)  {
                botConnection.getSessionId().subscribe(sessionId => {
                    konsole.log("received sessionId: " + sessionId);
                    loginWindow.location.href = text + encodeURIComponent('&code_challenge=' + sessionId);
                }, error => {
                    konsole.log("failed to get sessionId", error);
                });
            }
            else {
                loginWindow.location.href = text;
            }
            break;
        */
        default:
            konsole.log("unknown button type", type);
        }
}

export const renderIfNonempty = (value: any, renderer: (value: any) => JSX.Element ) => {
    if (value !== undefined && value !== null && (typeof value !== 'string' || value.length > 0))
        return renderer(value);
}

export const classList = (...args:(string | boolean)[]) => {
    return args.filter(Boolean).join(' ');
}

const getLocationMessage = function(lat: number, long: number) {
    const message = {
        localResponse: {
            result: {
                action: "schedule.testDrive",
                parameters: {
                    latlong: `${lat},${long}`
                }
            }
        }
    };

    return JSON.stringify(message);
}

// note: container of this element must have CSS position of either absolute or relative
const ResizeDetector = (props: {
    onresize: () => void
}) =>
    // adapted to React from https://github.com/developit/simple-element-resize-detector
    <iframe
        style={ { position: 'absolute', left: '0', top: '-100%', width: '100%', height: '100%', margin: '1px 0 0', border: 'none', opacity: 0, visibility: 'hidden', pointerEvents: 'none' } }
        ref={ frame => {
            if (frame)
                frame.contentWindow.onresize = props.onresize;
        } }
    />;

// For auto-focus in some browsers, we synthetically insert keys into the chatbox.
// By default, we insert keys when:
// 1. evt.key.length === 1 (e.g. "1", "A", "=" keys), or
// 2. evt.key is one of the map keys below (e.g. "Add" will insert "+", "Decimal" will insert ".")
const INPUTTABLE_KEY: { [key: string]: string } = {
    Add: '+',      // Numpad add key
    Decimal: '.',  // Numpad decimal key
    Divide: '/',   // Numpad divide key
    Multiply: '*', // Numpad multiply key
    Subtract: '-'  // Numpad subtract key
};

function inputtableKey(key: string) {
    return key.length === 1 ? key : INPUTTABLE_KEY[key];
}
