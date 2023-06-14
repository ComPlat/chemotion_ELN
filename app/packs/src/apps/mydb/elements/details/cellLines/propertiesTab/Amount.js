import React from 'react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { observer } from 'mobx-react';
import PropTypes from 'prop-types';
import {
  FormControl
} from 'react-bootstrap';

class Amount extends React.Component {
  static contextType = StoreContext;

  constructor(props) {
    super(props);
    this.state = {
      scientificNotation: false
    };
  }

  render() {
    const { cellLineDetailsStore } = this.context;
    const { cellLineId } = this.props;
    const cellLineItem = cellLineDetailsStore.cellLines(cellLineId);

    return (
      <FormControl
        className={this.getStyleClass(cellLineItem)}
        type="number"
        defaultValue={cellLineItem.amount}
        onChange={(e) => {
          cellLineDetailsStore.changeAmount(cellLineId, Number(e.target.value));
        }}
        value={cellLineItem.amount}
      />
    );
  }

  getStyleClass(cellLineItem) {
    return cellLineItem.isAmountValid() ? '' : 'invalid-input';
  }
}

export default observer(Amount);

Amount.propTypes = {
  cellLineId: PropTypes.number.isRequired,
};
