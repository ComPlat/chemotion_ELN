import React from 'react';

export default class ElementalComposition extends React.Component {
  elementsList(data) {
    const keys = Object.keys(data);
    if (keys.length === 0) {
      return (
        <p>
          Sorry, it was not possible to calculate the elemental
          compositon. Check data please.
        </p>
      );
    }

    return keys.map((key) => {
      const value = data[key];
      return (
        <span key={key}>
          <span className="fw-bold">
            {key}
          </span>
          {' '}
          {Number(value).toFixed(2)}
        </span>
      );
    });
  }

  render() {
    const { elemental_composition: { description, data, loading } } = this.props;

    return (
      <table>
        <thead>
          <tr>
            <th>{description}</th>
            <th style={{ width: '20%' }}>
              {loading && 'Loading (mmol/g)'}
            </th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td className="d-flex justify-content-start gap-3">
              {this.elementsList(data)}
            </td>
            <td>
              {loading && loading.toFixed(2)}
            </td>
          </tr>
        </tbody>
      </table>
    );
  }
}
