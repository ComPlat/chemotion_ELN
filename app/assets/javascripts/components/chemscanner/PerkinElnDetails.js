import React from 'react';
import PropTypes from 'prop-types';

import ListProps from './ListProps';

export default class PerkinElnDetails extends React.Component {
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
    const { details } = this.props;
    if (!details) return (<span />);
    if (Object.values(details).filter(x => x).length === 0) return (<span />);

    const { expand } = this.state;
    const iconClass = expand ? 'fa-angle-down' : 'fa-angle-right';
    const iconText = expand ? 'Hide' : 'More';
    const expandBtn = (
      <button
        className="expand-btn btn btn-xs"
        onClick={this.onClick}
      >
        <i className={`fa ${iconClass} fa-lg`} />
        &nbsp;&nbsp;
        <span><b>{iconText} Details</b></span>
      </button>
    );

    const detailsList = Object.keys(details).filter(x => x && details[x]).reduce((acc, k) => {
      const val = details[k];
      if (Object.keys(val).length === 0) return acc;

      if (val instanceof Array) {
        const els = val.map((v, idx) => {
          return (
            <ListProps key={k} label={k} listProps={v} />
          );
        });
        return acc.concat(els);
      }

      const el = (
        <ListProps key={k} label={k} listProps={details[k]} />
      );

      acc.push(el);
      return acc;
    }, []);
    if (detailsList.length === 0) return <span />;

    return (
      <div className="perkin-eln-details-container">
        <div className="eln-click">
          {expandBtn}
        </div>
        <div className="perkin-eln-details">
          {expand ? detailsList : <span />}
        </div>
      </div>
    );
  }
}

PerkinElnDetails.propTypes = {
  details: PropTypes.object.isRequired
};
