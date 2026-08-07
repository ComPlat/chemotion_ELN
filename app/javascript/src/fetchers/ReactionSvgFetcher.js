import ApiClient from 'src/api_clients/ChemotionApiClient';

export default class ReactionSvgFetcher {
  static fetchByMaterialsSvgPaths(
    materialsSvgPaths,
    temperature,
    solvents,
    duration,
    conditions,
    productsOnly = false,
    showYield = true
  ) {
    const body = {
      materials_svg_paths: materialsSvgPaths,
      temperature,
      duration,
      solvents,
      conditions: (typeof conditions === 'string') ? conditions : '',
      products_only: productsOnly,
      show_yield: showYield,
    };

    return ApiClient.postJson('/api/v1/reaction_svg', { body });
  }
}
