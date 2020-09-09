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
        {
          has_chem_spectra: sconfig.present?,
          matrices: File.exist?(m_config) ? JSON.parse(File.read(m_config)) : {}
        }
      end
    end
  end
end
