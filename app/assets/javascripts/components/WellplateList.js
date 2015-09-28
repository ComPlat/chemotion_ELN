import React, {Component} from 'react';
import {Table} from 'react-bootstrap';
import SVG from 'react-inlinesvg';

export default class WellplateList extends Component {
  render() {
    const {wells} = this.props;
    return (
      <div>
        <Table bordered hover>
          <th width="5%">#</th>
          <th width="25%">Name</th>
          <th width="20%">Position (x,y)</th>
          <th width="20%">Sum-Formula</th>
          <th width="30%">Molecule</th>
          {wells.map((well, key) => {
            const id = key + 1;
            const {sample, position} = well;
            const positions = `(${position.x}, ${position.y})`;
            let svgPath = '';
            let name = '';
            let sum_formular = '';
            let svgNode = '';
            if (sample) {
              svgPath = `/images/molecules/${sample.molecule.molecule_svg_file}`;
              svgNode = <SVG className="molecule-mid" src={svgPath}/>;
              name = sample.name;
              sum_formular = sample.molecule.sum_formular;
            }
            return <tr key={key}>
              <td>{id}</td>
              <td>{name}</td>
              <td>{positions}</td>
              <td>{sum_formular}</td>
              <td>{svgNode}</td>
            </tr>
          })}
        </Table>
      </div>
    );
  }
}
