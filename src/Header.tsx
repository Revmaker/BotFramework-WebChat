import * as React from 'react';
import { ChatState } from './Store';
import { connect } from 'react-redux';
import { IVendorConfig } from './Chat';

export interface HeaderProps {
  title: string
  selectedVendorId: string;
  vendors: IVendorConfig[];
  onChangeVendor: (vendor: IVendorConfig) => void;
}

export interface HeaderState {
  vendorId: string
}

export class HeaderView extends React.Component<HeaderProps, HeaderState> {
  constructor(props: HeaderProps) {
    super(props);

    this.state = {
      vendorId: this.props.selectedVendorId
    };

    this.onChangeVendor = this.onChangeVendor.bind(this);
  }

  onChangeVendor(event: React.FormEvent<HTMLSelectElement>) {
    const vendor = this.props.vendors.find(v => v.id == event.currentTarget.value);
    this.props.onChangeVendor(vendor);
  }

  render() {
    const { title, selectedVendorId, vendors } = this.props;
    return (
      <div className="Header">
        <div className="Header__right">
          <span>{ title }</span>
        </div>
        <div className="Header__left">
          <select value={selectedVendorId} onChange={this.onChangeVendor}>
            { vendors.map((v, i) => <option value={v.id} key={'vendors-' + i}>{ v.name }</option>)}
          </select>
        </div>
      </div>
    );
  }
}

export const Header = connect(
    (state: ChatState) => ({
        vendorId: state.connection.vendorId,
    }), {
    }, (stateProps: any, dispatchProps: any, ownProps: any): HeaderProps => ({
        // from stateProps
        selectedVendorId: stateProps.selectedVendorId,
        // from ownProps
        title: ownProps.title,
        vendors: ownProps.vendors,
        onChangeVendor: ownProps.onChangeVendor,
    })
)(HeaderView);