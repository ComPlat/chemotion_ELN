import React, { Component } from 'react';
import { Jumbotron } from 'react-bootstrap';
import ReactMarkdown from 'react-markdown';

function Message(props) {
  const { post } = props;
  if (post != null && post !== undefined) {
    return (
      <Jumbotron>
        <ReactMarkdown children={post} />
      </Jumbotron>
    );
  }
  return null;
}

class WelcomeMessage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      post: null
    };
  }

  componentDidMount() {
    fetch(`welcome-message.md?${Date.now()}`) // Prevent caching
      .then((res) => {
        if (res.ok) {
          return res.text();
        }
        return null;
      }).then((post) => this.setState((state) => ({ ...state, post })))
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
