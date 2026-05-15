import ApiClient from 'src/api_clients/ChemotionApiClient';

export default class MoleculeSvgFetcher {
  /**
   * Render SVG from molfile using ketchersvc and save to molecule
   * @param {String} molfile - The molecule molfile
   * @returns {Promise} Promise that resolves to { success: boolean, molecule_svg_file: string, svg_path: string, error?: string }
   */
  static renderSvgFromMolfile(molfile) {
    return ApiClient.postJson('/api/v1/molecules/render_svg', {
      body: molfile,
      handleResponseError: (exception) => {
        console.error('Error calling render_svg API:', exception);
        return { success: false, error: exception.message || 'Network error' };
      },
    });
  }
}
