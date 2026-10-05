# frozen_string_literal: true

# Cf. Chemotion::ChemicalAPI extract_sds, which answers a cached SdsExtractor result.
module SdsExtractionHelpers
  extend Grape::API::Helpers

  # A failure of the PDF text service is a 503, with Retry-After when it gave one; of the sheet, a 422.
  def answer_sds_extraction(result)
    diagnostics = result['diagnostics']
    failure = diagnostics&.dig('errors')&.first
    return result unless failure

    if diagnostics['service_unavailable']
      retry_after = Chemotion::SdsExtractionCache.retry_after(diagnostics)
      error!({ error: failure, diagnostics: diagnostics }, 503,
             retry_after ? { 'Retry-After' => retry_after.to_s } : {})
    end
    error!({ error: failure, diagnostics: diagnostics }, 422)
  end
end
