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
        chem_spectra_config = Rails.configuration.try(:spectra).try(:url)
        has_chem_spectra = chem_spectra_config.present?
        has_nmrium_wrapper = false
        unless Rails.configuration.spectra.chemspectra.nil?
          chem_spectra = Rails.configuration.spectra.chemspectra
          has_chem_spectra = !chem_spectra[:url].nil?
        end
        unless Rails.configuration.spectra.nmriumwrapper.nil?
          nmrium_wrapper = Rails.configuration.spectra.nmriumwrapper
          has_nmrium_wrapper = !nmrium_wrapper.url.nil?
        end
        m_config = Rails.root.join('config', 'matrices.json')
        sfn_config = Rails.configuration.try(:sfn_config).try(:provider)
        {
          has_chem_spectra: has_chem_spectra,
          has_nmrium_wrapper: has_nmrium_wrapper,
          matrices: File.exist?(m_config) ? JSON.parse(File.read(m_config)) : {},
          klasses: ElementKlass.where(is_active: true, is_generic: true)&.pluck(:name) || [],
          structure_editors: Rails.configuration.structure_editors,
          has_sfn: sfn_config.present? && current_user.matrix_check_by_name('scifinderN')
        }
      end
    end
  end
end
