import React, { Component } from 'react';
import ReactMarkdown from 'react-markdown';

class WelcomeMessage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      post: null
    };
  }

  async componentDidMount() {
    try {
      const res = await fetch(`welcome-message.md?${Date.now()}`); // Prevent caching
      if (!res.ok) return null;

      const post = await res.text();
      this.setState({ post });
    } catch (e) {
      console.error(e);
    }
  }

  render() {
    const { post } = this.state;
    return post && (
      <div className="bg-light p-5 m-3">
        <ReactMarkdown>
          {post}
        </ReactMarkdown>
      </div>
    );
  }
}

export default WelcomeMessage;
