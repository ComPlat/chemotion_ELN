import React, {Component} from 'react';
import {Popover, Overlay} from 'react-bootstrap';
import SVG from 'react-inlinesvg';

const style = {
  width: 280,
  height: 200
};

export default class WellOverlay extends Component {
  render() {
    const {show, well, target, handleClose} = this.props;
    const {sample} = well;
    let title = '';
    let text = '';
    if (sample) {
      const {name, molecule} = sample;
      title = name;
      const svgPath = `/images/molecules/${molecule.molecule_svg_file}`;
      text = (
        <div>
          <SVG className="molecule-mid" src={svgPath}/>
          <strong>{molecule.sum_formular}</strong>
        </div>
      );
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
              </div>
          </Popover>
        </Overlay>
      </div>
    );
  }
}
