import React, { Component } from 'react';
import { Jumbotron } from 'react-bootstrap';
import ReactMarkdown from 'react-markdown';

function Message(props) {
  const input = props.post;
  if (input != null && input !== undefined) {
    return (<Jumbotron>
      <ReactMarkdown children={input} />
    </Jumbotron>);
  }
  return null;
}

class WelcomeMessage extends Component {
  state = {
    post: null
  }
  componentDidMount() {
    fetch('welcome-message.md')
      .then((res) => {
        if (res.ok) {
          return res.text();
        }
        return null;
      }).then(post => this.setState(state => ({ ...state, post })))
      .catch((errorMessage) => { console.error(errorMessage); });
  }
  render() {
    const { post } = this.state;
    return (
      <Message post={post} />
    );
  }
}
export default WelcomeMessage;
