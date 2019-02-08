import * as React from 'react';
import { ChatState } from './Store';
import { connect } from 'react-redux';
import { Activity, CardAction, User, EventActivity } from 'botframework-directlinejs';
import ReactJson from 'react-json-view'

export interface StateProps {
  activities: Activity[],
}

export class StateView extends React.Component<StateProps, {}> {
  private scrollMe: HTMLDivElement;
  private scrollContent: HTMLDivElement;

  constructor(props: StateProps) {
    super(props);
  }

  render() {
    const { activities } = this.props;

    if (!activities || activities.length == 0) {
      return null;
    }

    let event = activities.filter((activity: EventActivity) => activity.type == 'event').pop() as EventActivity;

    if (!event) {
      return null;
    }

    return (
      <div className='State'>
        <ReactJson name='State' collapsed={false} src={JSON.parse(event.value)['state']} />
      </div>
    );
  }
}

export const State = connect(
    (state: ChatState) => ({
        activities: state.history.activities,
    }), {
    }, (stateProps: any, dispatchProps: any, ownProps: any): StateProps => ({
        // from stateProps
        activities: stateProps.activities,
    })
)(StateView);