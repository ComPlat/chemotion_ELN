import { pascalize } from 'humps';
import Immutable from 'immutable';
import React from 'react';
import PropTypes from 'prop-types';

export default class MoleculeDetails extends React.Component {
  constructor() {
    super();
    this.state = {
      expand: false
    };

    this.onClick = this.onClick.bind(this);
  }

  onClick() {
    const { expand } = this.state;
    this.setState({ expand: !expand });
  }

  render() {
    const { molecule } = this.props;
    const details = molecule.get('details').toJS();

    const detailsList = Object.keys(details).filter(k => details[k]).map(k => (
      <li key={k}> <b>{`${pascalize(k)}: `}</b> {details[k]} </li>
    ));

    if (detailsList.length === 0) return <span />;

    const detailsUl = <ul> {detailsList} </ul>;

    const { expand } = this.state;
    const iconClass = expand ? 'fa-angle-down' : 'fa-angle-right';
    const iconText = expand ? 'Hide' : 'More';

    return (
      <div className="perkin-eln-details-container">
        <div className="eln-click">
          <button
            className="expand-btn btn btn-xs"
            onClick={this.onClick}
          >
            <i className={`fa ${iconClass} fa-lg`} />
            &nbsp;&nbsp;
            <span><b>{iconText} Details</b></span>
          </button>
        </div>
        <div className="perkin-eln-details">
          {expand ? detailsUl : <span />}
        </div>
      </div>
    );
  }
}

MoleculeDetails.propTypes = {
  molecule: PropTypes.instanceOf(Immutable.Map).isRequired,
};
