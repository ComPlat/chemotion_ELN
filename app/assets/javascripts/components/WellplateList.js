import React, {Component} from 'react';
import {Table, Input} from 'react-bootstrap';
import SVG from 'react-inlinesvg';

export default class WellplateList extends Component {
  handleReadoutOfWellChange(event, well) {
    const readout = event.target.value;
    const {wells, handleWellsChange} = this.props;
    const wellId = wells.indexOf(well);
    wells[wellId] = {
      ...well,
      readout
    };
    handleWellsChange(wells);
  }

  render() {
    const {wells} = this.props;
    return (
      <div>
        <Table bordered hover>
          <th width="5%">#</th>
          <th width="5%">Position</th>
          <th width="20%">Name</th>
          <th width="20%">Sum-Formula</th>
          <th width="20%">Molecule</th>
          <th width="30%">Readout</th>
          {wells.map((well, key) => {
            const id = key + 1;
            const {sample, position, readout} = well;
            const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
            const positionY = alphabet[position.y-1];
            const positions = positionY + position.x;
            let svgPath = '';
            let name = '';
            let sum_formular = '';
            let svgNode = '';
            const style = {
              position: 'absolute',
              height: '100%',
              width: '100%',
              left: 0,
              top: 0
            };
            const inputContainerStyle = {
              position: 'relative',
              height: 0,
              width: '100%',
              padding: 0,
              paddingBottom: '5%'
            };
            if (sample) {
              svgPath = `/images/molecules/${sample.molecule.molecule_svg_file}`;
              svgNode = <SVG className="molecule-mid" src={svgPath}/>;
              name = sample.name;
              sum_formular = sample.molecule.sum_formular;
              inputContainerStyle.paddingBottom = '20%'
            }
            return <tr key={key}>
              <td>{id}</td>
              <td>{positions}</td>
              <td>{name}</td>
              <td>{sum_formular}</td>
              <td>{svgNode}</td>
              <td style={inputContainerStyle}>
                <Input
                  type="textarea"
                  style={style}
                  value={readout}
                  onChange={event => this.handleReadoutOfWellChange(event, well)}
                  />
              </td>
            </tr>
          })}
        </Table>
      </div>
    );
  }
}
