import React from 'react'
import {Table} from 'react-bootstrap';


export default class ReactionDetailsLiteratures extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      literatures: props.literatures || [],
      reaction_id: props.reaction_id
    }
  }

  _displayLiteratureRows() {
    let {literatures} = this.state;
    return literatures.map((element) => {
      return (
        <tr>
          <td> {element.title} </td>
          <td> {element.url} </td>
        </tr>
      )
    });
  }

  render() {
    return (
      <Table width="100%">
        <thead>
          <th> Title </th>
          <th> URL </th>
        </thead>
        <tbody>
          {this._displayLiteratureRows()}
        </tbody>
      </Table>
    );
  }

}