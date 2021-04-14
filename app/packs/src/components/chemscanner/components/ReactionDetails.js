import { pascalize } from 'humps';
import Immutable from 'immutable';
import PropTypes from 'prop-types';
import React from 'react';
import { Label } from 'react-bootstrap';

export default class ReactionDetails extends React.Component {
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
    const { reaction } = this.props;
    const details = reaction.get('details').toJS() || {};

    const reactionDetails = Object.keys(details).reduce((acc, dKey) => {
      const arr = details[dKey];
      if (arr.length === 0) return acc;

      const keyList = arr.map((detail, idx) => (
        <div key={`${dKey}-${idx}`}>
          <Label>{pascalize(dKey)}</Label>
          <ul>
            {Object.keys(detail).filter(k => detail[k]).map(k => (
              <li key={k}> <b>{`${pascalize(k)}: `}</b> {detail[k]} </li>
            ))}
          </ul>
        </div>
      ));

      return acc.concat(keyList);
    }, []);

    const detailsList = ['reactants', 'reagents', 'products'].reduce((acc, group) => {
      const groupMol = reaction.get(group);
      if (!groupMol || groupMol.size === 0) return acc;

      const keyList = groupMol.reduce((mAcc, m, idx) => {
        const mDetail = m.get('details').toJS();
        const mDetailEls = Object.keys(mDetail).filter(k => mDetail[k]).map(k => (
          <li key={k}> <b>{`${pascalize(k)}: `}</b> {mDetail[k]} </li>
        ));
        if (mDetailEls.length === 0) return mAcc;

        mAcc.push((
          <div key={m.get('id')}>
            <Label>{`${group.slice(0, -1)} ${idx + 1}`}</Label>
            <ul>
              {mDetailEls}
            </ul>
          </div>
        ));

        return mAcc;
      }, []);

      return acc.concat(keyList);
    }, reactionDetails);

    if (detailsList.length === 0) return <span />;

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
          {expand ? detailsList : <span />}
        </div>
      </div>
    );
  }
}

ReactionDetails.propTypes = {
  reaction: PropTypes.instanceOf(Immutable.Map).isRequired,
};
