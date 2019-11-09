import * as React from 'react';
import { Activity, CardAction, User, Message } from 'botframework-directlinejs';
import { ChatState } from './Store';
import { connect } from 'react-redux';
import { HScroll } from './HScroll';
import { classList, doCardAction, IDoCardAction } from './Chat';
import * as konsole from './Konsole';
import { ChatActions, sendMessage, sendPostBack, addMessage } from './Store';
import { activityWithSuggestedActions } from './activityWithSuggestedActions';

export interface MessagePaneProps {
    activityWithSuggestedActions: Message,

    takeSuggestedAction: (message: Message) => any,

    children: React.ReactNode,
    doCardAction: IDoCardAction,

    customPrevSvgPathData: string,
    customNextSvgPathData: string
}

const MessagePaneView = (props: MessagePaneProps) =>
    <div className={classList('wc-message-pane', props.activityWithSuggestedActions && 'show-actions')}>
        {props.children}
        <div className="wc-suggested-actions">
            <SuggestedActions {...props} />
        </div>
    </div>;

class SuggestedActions extends React.Component<MessagePaneProps, {}> {
    private toBeFocusedDocument: Element = null;

    constructor(props: MessagePaneProps) {
        super(props);
    }

    actionMouseDown(e: React.MouseEvent<HTMLButtonElement>, cardAction: CardAction) {
        const currentFocusedItem = document.querySelector(':focus');
        if (currentFocusedItem && currentFocusedItem.className.indexOf("wc-shellinput") > -1) {
            this.toBeFocusedDocument = currentFocusedItem;
        } else {
            this.toBeFocusedDocument = null;
        }
    }

    actionClick(e: React.MouseEvent<HTMLElement>, cardAction: CardAction) {
        //"stale" actions may be displayed (see shouldComponentUpdate), do not respond to click events if there aren't actual actions
        if (!this.props.activityWithSuggestedActions) return;

        this.props.takeSuggestedAction(this.props.activityWithSuggestedActions);
        this.props.doCardAction(cardAction.type, cardAction.value, cardAction.title);

        if (this.toBeFocusedDocument && this.toBeFocusedDocument instanceof HTMLElement) {
            this.toBeFocusedDocument.focus();
            this.toBeFocusedDocument = null;
        }

        e.stopPropagation();
    }

    shouldComponentUpdate(nextProps: MessagePaneProps) {
        //update only when there are actions. We want the old actions to remain displayed as it animates down.
        return !!nextProps.activityWithSuggestedActions;
    }

    render() {
        if (!this.props.activityWithSuggestedActions) return null;

        return (
            <HScroll
                prevSvgPathData={this.props.customPrevSvgPathData ? this.props.customPrevSvgPathData : "M 16.5 22 L 19 19.5 L 13.5 14 L 19 8.5 L 16.5 6 L 8.5 14 L 16.5 22 Z"}
                nextSvgPathData={this.props.customNextSvgPathData ? this.props.customNextSvgPathData : "M 12.5 22 L 10 19.5 L 15.5 14 L 10 8.5 L 12.5 6 L 20.5 14 L 12.5 22 Z"}
                scrollUnit="page"
            >
                <ul>{this.props.activityWithSuggestedActions.suggestedActions.actions.map((action, index) =>
                    <li key={index}>
                        <button type="button" onClick={e => this.actionClick(e, action)} onMouseDown={e => this.actionMouseDown(e, action)} title={action.title}>
                            {action.title}
                        </button>
                    </li>
                )}</ul>
            </HScroll>
        );
    }

}

export const MessagePane = connect(
    (state: ChatState) => ({
        // passed down to MessagePaneView
        activityWithSuggestedActions: activityWithSuggestedActions(state.history.activities),
        // only used to create helper functions below
        botConnection: state.connection.botConnection,
        user: state.connection.user,
        locale: state.format.locale,

    }), {
    takeSuggestedAction: (message: Message) => ({ type: 'Take_SuggestedAction', message } as ChatActions),
    // only used to create helper functions below
    sendMessage,
    sendPostBack,
    addMessage
}, (stateProps: any, dispatchProps: any, ownProps: any): MessagePaneProps => ({
    // from stateProps
    customPrevSvgPathData: ownProps.customPrevSvgPathData,
    customNextSvgPathData: ownProps.customNextSvgPathData,
    activityWithSuggestedActions: stateProps.activityWithSuggestedActions,
    // from dispatchProps
    takeSuggestedAction: dispatchProps.takeSuggestedAction,
    // from ownProps
    children: ownProps.children,
    // helper functions
    doCardAction: doCardAction(stateProps.user, stateProps.locale, dispatchProps.sendMessage, dispatchProps.sendPostBack, dispatchProps.addMessage),
})
)(MessagePaneView);
