import * as React from 'react';
import { ChatState } from './Store';
import { connect } from 'react-redux';
import { Activity, CardAction, User, EventActivity } from 'botframework-directlinejs';
import ReactJson from 'react-json-view'

export interface LogProps {
  activities: Activity[],
}

export interface LogState {
  filterText: string,
}

export class LogView extends React.Component<LogProps, LogState> {
  constructor(props: LogProps) {
    super(props);

    this.state = {
      filterText: ''
    };

    this.onChangeFilter = this.onChangeFilter.bind(this);
  }

  onChangeFilter(event: React.FormEvent<HTMLInputElement>) {
    this.setState({
      filterText: event.currentTarget.value
    });
  }

  render() {
    const { filterText } = this.state;
    const { activities } = this.props;

    if (!activities || activities.length == 0) {
      return null;
    }

    let events = activities.filter((activity: EventActivity) => activity.type == 'event');

    if (!events || events.length == 0) {
      return null;
    }

    if (filterText) {
      events = events.filter((activity: EventActivity) => new RegExp('.*' + filterText + '.*').test(activity.value));
    }

    const elements = events.map((activity: EventActivity, index) =>
      <div className='Log__item' key={ 'event' + index }>
        <ReactJson name={activity.name} collapsed={true} src={JSON.parse(activity.value)['event']} />
      </div>
    );

    return (
      <div className='Log'>
        <input className='Log__filter' type='text' placeholder='Type filter here...' onChange={this.onChangeFilter} />
        <div className='Log__list-container'>
          { elements }
        </div>
      </div>
    );
  }
}

export const Log = connect(
    (state: ChatState) => ({
        activities: state.history.activities,
    }), {
    }, (stateProps: any, dispatchProps: any, ownProps: any): LogProps => ({
        // from stateProps
        activities: stateProps.activities,
    })
)(LogView);