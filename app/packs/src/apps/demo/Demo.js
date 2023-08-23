import React, { Component } from 'react';
import Button from 'ui/Button';

class Demo extends Component {
  constructor(props) {
    super(props);
    this.state = {
      buttons: [
        {
          variant: 'primary', option: 'main', square: false, title: 'Primary Main', withIcon: false
        },
        {
          variant: 'primary', option: 'main', square: true, title: 'Primary Main Square', withIcon: false
        },
        {
          variant: 'primary', option: 'main', square: false, title: 'Primary Main with Icon', withIcon: true
        },
        {
          variant: 'secondary', option: 'main', square: false, title: 'Secondary Main', withIcon: false
        },
        {
          variant: 'secondary', option: 'main', square: true, title: 'Secondary Main Square', withIcon: false
        },
        {
          variant: 'secondary', option: 'main', square: false, title: 'Secondary Main with Icon', withIcon: true
        },
        {
          variant: 'tertiary', option: 'main', square: false, title: 'Tertiary Main', withIcon: false
        },
        {
          variant: 'tertiary', option: 'main', square: true, title: 'Tertiary Main Square', withIcon: false
        },
        {
          variant: 'tertiary', option: 'main', square: false, title: 'Tertiary Main with Icon', withIcon: true
        },
      ]
    };
  }

  renderButtonContent(btn) {
    if (btn.square) {
      return <i className="fa fa-plus" />;
    }
    if (btn.withIcon) {
      return (
        <>
          Button&nbsp;
          <i className="fa fa-plus" />
        </>
      );
    }
    return 'Button';
  }

  renderButton(btn, index) {
    return (
      <div
        key={index}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          marginBottom: '10px',
          justifyContent: 'space-between'
        }}
      >
        <h3
          style={{
            fontSize: '16px',
            color: '#777',
            right: '0',
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'center'
          }}
        >
          {btn.title}
        </h3>

        <div
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <Button variant={btn.variant} option={btn.option} square={btn.square} style={{ margin: '0 20px' }}>
            {this.renderButtonContent(btn)}
          </Button>
        </div>

        <pre
          style={{
            background: '#e9e9e9',
            padding: '12px',
            borderRadius: '4px',
            fontSize: '14px',
            left: '0',
            display: 'flex',
            justifyContent: 'flex-start'
          }}
        >
          {`<Button variant="${btn.variant}" option="${btn.option}" square={${btn.square}}>${this.renderButtonContent(btn)}</Button>`}
        </pre>
      </div>
    );
  }


  render() {
    return (
      <div
        style={{
          padding: '50px',
          backgroundColor: '#f9f9f9',
          minHeight: '100vh',
          fontFamily: 'Arial, sans-serif'
        }}
      >
        <h1
          style={{
            textAlign: 'center',
            marginBottom: '40px',
            fontSize: '32px',
            color: '#333',
            fontWeight: 'bold'
          }}
        >
          Component Demo
        </h1>
        <h2
          style={{
            textAlign: 'center',
            marginBottom: '40px',
            fontSize: '28px',
            color: '#555'
          }}
        >
          Buttons
        </h2>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}
        >
          {this.state.buttons.map((btn, index) => (
            <div
              key={index}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                margin: '20px',
                textAlign: 'center'
              }}
            >
              <h3
                style={{
                  fontSize: '16px',
                  color: '#777',
                  marginBottom: '10px'
                }}
              >
                {btn.title}
              </h3>
              <div
                style={{
                  position: 'relative'
                }}
              >
                <Button
                  variant={btn.variant}
                  option={btn.option}
                  square={btn.square}
                  style={{
                    margin: '0 20px'
                  }}
                >
                  {this.renderButtonContent(btn)}
                </Button>
              </div>
              <pre
                style={{
                  background: '#e9e9e9',
                  padding: '12px',
                  borderRadius: '4px',
                  fontSize: '14px',
                  display: 'flex',
                  justifyContent: 'flex-start',
                  maxWidth: '400px',
                  marginTop: '10px'
                }}
              >
                {`<Button variant="${btn.variant}" option="${btn.option}" square={${btn.square}}>${this.renderButtonContent(btn)}</Button>`}
              </pre>
            </div>
          ))}
        </div>
      </div>
    );
  }
}

export default Demo;

