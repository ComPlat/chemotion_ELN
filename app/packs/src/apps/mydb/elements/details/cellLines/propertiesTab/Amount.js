import React from 'react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { observer } from 'mobx-react';
import PropTypes from 'prop-types';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
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
    const {scientificNotation}=this.state;
    const inputComponent=scientificNotation?this.renderScientificRepresentation() :this.renderDecimalRepresentation();

    return (
      <div>
        <div className="floating">
          {inputComponent}
        </div>
        <div>
        <OverlayTrigger placement="top" overlay={<Tooltip id="detailed-info-button">Switch representation mode</Tooltip>}>
        <Button
          className="button-right"
          bsSize="xsmall"
          onClick={(event) => {
            event.stopPropagation();
            this.setState({scientificNotation:!scientificNotation})
          }}
        >
          <i className="fa fa-plus" aria-hidden="true" />
        </Button>
      </OverlayTrigger>

        </div>
      </div>
    );
  }

  renderScientificRepresentation(){
    const { cellLineDetailsStore } = this.context;
    const { cellLineId } = this.props;
    const cellLineItem = cellLineDetailsStore.cellLines(cellLineId);

    let mantissa=String(cellLineItem.amount)
    let exponent=0;
    while(mantissa.length>1&&mantissa.slice(-1)==="0"){
        exponent=exponent+1;
        mantissa=mantissa.slice(0,-1);
    }

    while(mantissa.split('.')[0].length>1){
      exponent=exponent+1;
      let x = Number(mantissa);
      mantissa=String(x/10)
    }
    
    

    return (
      <div>
        <div className="floating scientific-input">
        <FormControl
          className="floating"
          type="number"
          defaultValue={Number(mantissa)}
          value={Number(mantissa)}
          onChange={(e) => {
          console.log("Ich ändere die Mantisse")
          }}
        />
        </div>
        <div className="floating scientific-input-fixed">e</div>
        <div className="floating scientific-input">
        <FormControl 
          defaultValue={exponent}
          value={exponent}
          onChange={(e) => {
            if(!Number(e.target.value)){
              return;
            }
          console.log("Ich ändere den exponenten")
          }}
        />
        </div>
      </div>
    );
  }

  renderDecimalRepresentation(){
    const { cellLineDetailsStore } = this.context;
    const { cellLineId } = this.props;
    const cellLineItem = cellLineDetailsStore.cellLines(cellLineId);

    return (
      <FormControl
      className={this.getStyleClass(cellLineItem)}
      defaultValue={cellLineItem.amount}
      onChange={(e) => {
        if(!Number(e.target.value)){
          return;
        }
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
