import 'whatwg-fetch';

export default class MoleculeSvgFetcher {
  /**
   * Render SVG from molfile using ketchersvc and save to molecule
   * @param {String} molfile - The molecule molfile
   * @returns {Promise} Promise that resolves to { success: boolean, molecule_svg_file: string, svg_path: string, error?: string }
   */
  static renderSvgFromMolfile(molfile) {
    return fetch('/api/v1/molecules/render_svg', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        molfile
      })
    }).then((response) => {
      return response.json();
    }).catch((errorMessage) => {
      console.error('Error calling render_svg API:', errorMessage);
      return { success: false, error: errorMessage.message || 'Network error' };
    });
  }
}
