# frozen_string_literal: true

# Chemotion module
module Chemotion
  # UiAPI class
  class UiAPI < Grape::API
    resource :ui do
      desc 'Initialize UI'
      params do
      end
      get 'initialize' do
        sconfig = Rails.configuration.try(:spectra).try(:url)
        m_config = Rails.root.join('config', 'matrices.json')
        k_config = Rails.root.join('config', 'klasses.json')
        {
          has_chem_spectra: sconfig.present?,
          matrices: File.exist?(m_config) ? JSON.parse(File.read(m_config)) : {},
          klasses: File.exist?(k_config) ? JSON.parse(File.read(k_config)) : []
        }
      end
    end
  end
end
