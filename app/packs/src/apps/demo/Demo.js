import React, { Component } from 'react';
import Button from 'ui/Button';
import ButtonGroup from 'ui/ButtonGroup';

import { Tooltip, OverlayTrigger } from 'react-bootstrap';

class Demo extends Component {
  constructor(props) {
    super(props);
    this.state = {
      buttons: [
        {
          variant: 'primary', size: 'large', square: false, title: 'Primary Large', withIcon: false
        },
        {
          variant: 'primary', size: 'large', square: true, title: 'Primary Large Square', withIcon: false
        },
        {
          variant: 'primary', size: 'large', square: false, title: 'Primary Large with Icon', withIcon: true
        },
        {
          variant: 'secondary', size: 'large', square: false, title: 'Secondary Large', withIcon: false
        },
        {
          variant: 'secondary', size: 'large', square: true, title: 'Secondary Large Square', withIcon: false
        },
        {
          variant: 'secondary', size: 'large', square: false, title: 'Secondary Large with Icon', withIcon: true
        },
        {
          variant: 'tertiary', size: 'large', square: false, title: 'Tertiary Large', withIcon: false
        },
        {
          variant: 'tertiary', size: 'large', square: true, title: 'Tertiary Large Square', withIcon: false
        },
        {
          variant: 'tertiary', size: 'large', square: false, title: 'Tertiary Large with Icon', withIcon: true
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

  render() {
    return (
      <div style={{ padding: '50px' }}>
        <h1 style={{
          textAlign: 'center', marginBottom: '40px', fontSize: '32px', color: '#333', fontWeight: 'bold'
        }}
        >
          Component Demo
        </h1>
        <h2 style={{
          textAlign: 'center', marginBottom: '40px', fontSize: '28px', color: '#555'
        }}
        >
          Buttons
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
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
              <h3 style={{ fontSize: '16px', color: '#777', marginBottom: '10px' }}>{btn.title}</h3>
              <div>
                <Button
                  variant={btn.variant}
                  size="xLarge"
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
                {`<Button variant="${btn.variant}"`
                + ` size="${btn.size}" square={${btn.square}}>${this.renderButtonContent(btn)}</Button>`}
              </pre>
            </div>
          ))}
        </div>
        <div>
          <ButtonGroup>
            <Button
              variant="secondary"
              size="xLarge"
            >
              Button1
            </Button>
            <Button
              variant="primary"
              size="xLarge"
              square
              tooltip="Hi!"
              tooltipPosition="top"
            >
              Button2
            </Button>
          </ButtonGroup>
        </div>
      </div>
    );
  }
}

export default Demo;
