import React from 'react';
import PropTypes from 'prop-types';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';

export default class InvalidPropertyWarning extends React.Component {
  // eslint-disable-next-line react/static-property-placement
  static contextType = StoreContext;

  render() {
    const { item, propsToCheck } = this.props;
    const { cellLineDetailsStore } = this.context;
    const cellLineItem = cellLineDetailsStore.cellLines(item.id);
    const validationInfo = cellLineDetailsStore.checkInputValidity(cellLineItem.id);
    const icon = propsToCheck.every((property) => !validationInfo.includes(property))
      ? null
      : (
        <div className="floating missing-property">
          <OverlayTrigger placement="top" overlay={<Tooltip id="missing-property">Required attributes are missing</Tooltip>}>
            <i className="fa fa-exclamation-triangle" />
          </OverlayTrigger>
        </div>
      );
    return icon;
  }
}
InvalidPropertyWarning.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.string.isRequired
  }).isRequired,
  propsToCheck: PropTypes.arrayOf(PropTypes.string).isRequired
};
