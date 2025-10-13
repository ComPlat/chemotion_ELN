# frozen_string_literal: true

module Chemotion
  # API for fetching data from CAS and PubChem
  class CasLookupAPI < Grape::API
    resource :cas_lookup do
      desc 'Fetch SMILES by CAS number'
      params do
        requires :cas_number, type: String, desc: 'CAS Registry Number'
      end

      post :lookup do
        error!('CAS number is required', 400) if params[:cas_number].blank?

        begin
          result = Chemotion::CasLookupService.fetch_by_cas(params[:cas_number])
          present result, with: Entities::CasLookupEntity
        rescue StandardError => e
          error_message = e.message || 'Failed to fetch by CAS number'
          Rails.logger.error "CAS lookup failed: #{error_message}"
          error!({ error: error_message }, 500)
        end
      end
    end

    # Entity for CAS lookup response
    module Entities
      class CasLookupEntity < Grape::Entity
        expose :smiles, documentation: { type: 'String', desc: 'SMILES string' }
        expose :cas, documentation: { type: 'String', desc: 'CAS Registry Number' }
        expose :source, documentation: { type: 'String', desc: 'Source (cas or pubchem)' }
      end
    end
  end
end
