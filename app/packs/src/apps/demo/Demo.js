/* eslint-disable react/no-array-index-key */
/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { useState } from 'react';
import Button from 'ui/Button';
import ButtonGroup from 'ui/ButtonGroup';

function Demo() {
  const [activeTab, setActiveTab] = useState('Introduction');
  const [variant, setVariant] = useState('primary');
  const [size, setSize] = useState('xLarge');
  const [square, setSquare] = useState(false);
  const [tooltip, setTooltip] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState('top');
  const [buttonText, setButtonText] = useState('Button');

  const [groupButtons, setGroupButtons] = useState([
    {
      size: 'xLarge',
      variant: 'primary',
      text: '1',
      square: false,
      tooltip: null,
      tooltipPosition: 'top',
    },
    {
      size: 'xLarge',
      variant: 'secondary',
      text: '2',
      square: false,
      tooltip: null,
      tooltipPosition: 'top',
    },
  ]);

  const updateGroupButton = (index, key, value) => {
    const newGroupButtons = [...groupButtons];
    newGroupButtons[index][key] = value;
    setGroupButtons(newGroupButtons);
  };

  const addGrpButton = () => {
    setGroupButtons([
      ...groupButtons,
      {
        size: 'xLarge',
        variant: 'primary',
        text: 'btn',
        square: false,
        tooltip: null,
        tooltipPosition: 'top',
      },
    ]);
  };

  const renderIntroduction = () => (
    <div className="demo-section introduction-section">
      <p>Welcome to the chemotion components library showcase.</p>
      <p>
        Here you will find a variety of UI components tailored to the chemotion
        eln.
      </p>
      <p>
        All components are based on standard HTML elements, use pure css for
        styling and are fully responsive.
      </p>
      <p>
        Use the sidebar to navigate between the interactive tabs and explore
        different components and their features.
      </p>
    </div>
  );

  const renderButtonDemo = () => (
    <div className="demo-section">
      <div className="controls">
        <label>
          Text:
          <input
            type="text"
            value={buttonText}
            onChange={(e) => setButtonText(e.target.value)}
          />
        </label>
        <label>
          Variant:
          <select onChange={(e) => setVariant(e.target.value)} value={variant}>
            <option value="primary">Primary</option>
            <option value="secondary">Secondary</option>
            <option value="tertiary">Tertiary</option>
          </select>
        </label>
        <label>
          Size:
          <select onChange={(e) => setSize(e.target.value)} value={size}>
            <option value="xLarge">Extra Large</option>
            <option value="large">Large</option>
            <option value="medium">Medium</option>
            <option value="small">Small</option>
          </select>
        </label>
        <label>
          Square:
          <select
            onChange={(e) => setSquare(e.target.value === 'true')}
            value={square.toString()}
          >
            <option value="true">Set</option>
            <option value="false">Unset</option>
          </select>
        </label>
        <label>
          Tooltip:
          <input
            type="text"
            value={tooltip}
            onChange={(e) => setTooltip(e.target.value)}
          />
        </label>
        <label>
          Tooltip Position:
          <select
            onChange={(e) => setTooltipPosition(e.target.value)}
            value={tooltipPosition}
          >
            <option value="top">Top</option>
            <option value="bottom">Bottom</option>
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
        </label>
      </div>
      <div className="button-container">
        <Button
          variant={variant}
          size={size}
          square={square}
          tooltip={tooltip}
          tooltipPosition={tooltipPosition}
        >
          {buttonText}
        </Button>
      </div>
      <pre>
        {`<Button variant="${variant}" size="${size}" square={${square}}`
          + ` tooltip="${tooltip}" tooltipPosition="${tooltipPosition}">${buttonText}</Button>`}
      </pre>
    </div>
  );

  const renderButtonGroupDemo = () => (
    <div className="demo-section">
      <button type="button" onClick={addGrpButton}>
        Add
      </button>
      <div className="controls">
        {groupButtons.map((btn, index) => (
          <div className="button-group-control" key={index}>
            <h4 className="button-index-header">
              Button&nbsp;
              {index + 1}
              :
            </h4>
            <div className="button-controls">
              <label>
                Text:
                <input
                  type="text"
                  value={btn.text}
                  onChange={(e) => updateGroupButton(index, 'text', e.target.value)}
                />
              </label>
              <label>
                Variant:
                <select
                  onChange={(e) => updateGroupButton(index, 'variant', e.target.value)}
                  value={btn.variant}
                >
                  <option value="primary">Primary</option>
                  <option value="secondary">Secondary</option>
                  <option value="tertiary">Tertiary</option>
                </select>
              </label>
              <label>
                Size:
                <select
                  onChange={(e) => updateGroupButton(index, 'size', e.target.value)}
                  value={btn.size}
                >
                  <option value="xLarge">Extra Large</option>
                  <option value="large">Large</option>
                  <option value="medium">Medium</option>
                  <option value="small">Small</option>
                </select>
              </label>
              <label>
                Square:
                <select
                  onChange={(e) => updateGroupButton(
                    index,
                    'square',
                    e.target.value === 'true'
                  )}
                  value={btn.square.toString()}
                >
                  <option value="true">Set</option>
                  <option value="false">Unset</option>
                </select>
              </label>
              <label>
                Tooltip:
                <input
                  type="text"
                  value={btn.tooltip}
                  onChange={(e) => updateGroupButton(index, 'tooltip', e.target.value)}
                />
              </label>
              <label>
                Tooltip Position:
                <select
                  onChange={(e) => updateGroupButton(index, 'tooltipPosition', e.target.value)}
                  value={btn.tooltipPosition}
                >
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                </select>
              </label>
            </div>
          </div>
        ))}
      </div>
      <div className="button-container">
        <ButtonGroup>
          {groupButtons.map((btn, index) => (
            <Button
              key={index}
              variant={btn.variant}
              size={btn.size}
              square={btn.square}
              tooltip={btn.tooltip}
              tooltipPosition={btn.tooltipPosition}
            >
              {btn.text}
            </Button>
          ))}
        </ButtonGroup>
      </div>
      <pre>
        {`<ButtonGroup>\n${groupButtons
          .map(
            (btn) => `  <Button variant="${btn.variant}" size="${btn.size}" square={${btn.square}} `
              + `tooltip="${btn.tooltip}" tooltipPosition="${btn.tooltipPosition}">${btn.text}</Button>\n`
          )
          .join('')}</ButtonGroup>`}
      </pre>
    </div>
  );

  return (
    <div className="demo-container">
      <aside className="sidebar">
        <button
          type="button"
          onClick={() => setActiveTab('Introduction')}
          className={activeTab === 'Introduction' ? 'active' : ''}
        >
          Introduction
        </button>
        <h3 className="sidebars-header">Components</h3>
        <button
          type="button"
          onClick={() => setActiveTab('Button')}
          className={activeTab === 'Button' ? 'active' : ''}
        >
          Button
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ButtonGroup')}
          className={activeTab === 'ButtonGroup' ? 'active' : ''}
        >
          Button Group
        </button>
      </aside>
      <main className="main-content">
        <div
          className={`tab-content ${
            activeTab === 'Introduction' ? 'active' : ''
          }`}
        >
          {renderIntroduction()}
        </div>
        <div
          className={`tab-content ${activeTab === 'Button' ? 'active' : ''}`}
        >
          {renderButtonDemo()}
        </div>
        <div
          className={`tab-content ${
            activeTab === 'ButtonGroup' ? 'active' : ''
          }`}
        >
          {renderButtonGroupDemo()}
        </div>
      </main>
    </div>
  );
}

export default Demo;
