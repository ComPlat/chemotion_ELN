import React, {Component} from 'react'
import {Table, ListGroup, ListGroupItem, Button} from 'react-bootstrap';
import LiteraturesForm from './LiteraturesForm';

export default class ReactionDetailsLiteratures extends Component {
  handleLiteratureRemove(literature) {
    const {reaction, onReactionChange} = this.props;
    reaction.removeLiterature(literature);
    onReactionChange(reaction);
  }

  handleLiteratureAdd(literature) {
    const {reaction, onReactionChange} = this.props;
    // TODO add url validation!
    reaction.addLiterature(literature);
    onReactionChange(reaction);
  }

  removeButton(literature) {
    return <Button
      bsSize="small"
      bsStyle="danger"
      onClick={() => this.handleLiteratureRemove(literature)}
      >
      <i className="fa fa-trash-o"></i>
    </Button>
  }

  literatureRows(literatures) {
    return literatures.map((literature, key) => {
      return (
        <tr key={key}>
          <td className="padding-right">{literature.title}</td>
          <td className="padding-right">
            <a href={this.literatureUrl(literature)} target="_blank">{literature.url}</a>
          </td>
          <td>
            {this.removeButton(literature)}
          </td>
        </tr>
      )
    });
  }

  literatureUrl(literature) {
    const { url } = literature;
    if(url.match(/https?\:\/\//)) {
      return url;
    } else {
      return `//${url}`;
    }
  }

  render() {
    const {reaction} = this.props;
    return (
      <ListGroup fill>
        <ListGroupItem>
          <Table>
            <thead><tr>
              <th width="33%">Title</th>
              <th width="61%">URL</th>
              <th width="6%"></th>
            </tr></thead>
            <tbody>
              {this.literatureRows(reaction.literatures)}
            </tbody>
          </Table>
        </ListGroupItem>
        <ListGroupItem>
          <LiteraturesForm
            onLiteratureAdd={literature => this.handleLiteratureAdd(literature)}
            />
        </ListGroupItem>
      </ListGroup>
    );
  }

}

ReactionDetailsLiteratures.propTypes = {
  reaction: React.PropTypes.object,
  onReactionChange: React.PropTypes.func
}
