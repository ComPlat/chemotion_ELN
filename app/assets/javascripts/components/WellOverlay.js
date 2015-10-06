import React, {Component} from 'react';
import {Button, Popover, Overlay, Table} from 'react-bootstrap';
import SVG from 'react-inlinesvg';


export default class WellOverlay extends Component {
  render() {
    const {show, well, target, handleClose, removeSampleFromWell} = this.props;
    const {sample, readout} = well;
    const style = {
      width: 240,
      height: 20,
      textAlign: 'center'
    };
    let title = "Empty";
    let text = "";
    let readoutNode = "";
    if (sample) {
      const {name, molecule} = sample;
      const svgPath = `/images/molecules/${molecule.molecule_svg_file}`;
      title = <div>
                {name} : {molecule.sum_formular}
                <div className="pull-right" style={{marginTop: '-3px', marginRight: '-8px'}}>
                  <Button bsSize="xsmall" bsStyle="danger" onClick={() => removeSampleFromWell(well)}>
                    <span className="fa fa-trash-o"></span>
                  </Button>
                </div>
              </div>;

      style.height = 220;
      text = <div><SVG className="molecule-mid" src={svgPath}/><br/></div>;
    }
    if(readout != ""){
      style.height = style.height + 80;
      readoutNode = <div style={{width:"240px", textAlign: 'left'}}>
        <strong>Readout: </strong>{readout}
      </div>;
    }
    return (
      <div>
        <Overlay
          show={show}
          target={target}
          placement="top"
          onHide={() => handleClose()}
          >
          <Popover title={title}>
            <div style={style}>
              {text}
              {readoutNode}
            </div>
          </Popover>
        </Overlay>
      </div>
    );
  }
}
