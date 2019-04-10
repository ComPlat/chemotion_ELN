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
        return { has_chem_spectra: sconfig.present? }
      end
    end
  end
end
