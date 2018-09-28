# frozen_string_literal: true

# Chemotion module
module Chemotion
  # UiAPI class
  class UiAPI < Grape::API
    resource :ui do
      desc 'Initialize UI'
      get 'initialize' do
        has_chem_spectra = Rails.configuration.spectra.chemspectra.url.present?
        has_nmrium_wrapper = Rails.configuration.spectra.nmriumwrapper.url.present?

        m_config = Rails.root.join('config/matrices.json')
        sfn_config = Rails.configuration.try(:sfn_config).try(:provider)
        converter_config = Rails.configuration.try(:converter).try(:url)
        radar_config = Rails.configuration.try(:radar).try(:url)
        collector_config = Rails.configuration.try(:datacollectors)
        collector_address = collector_config.present? && (
          collector_config.dig(:mailcollector, :aliases, -1) || collector_config.dig(:mailcollector, :mail_address)
        )

        {
          has_chem_spectra: has_chem_spectra,
          has_nmrium_wrapper: has_nmrium_wrapper,
          matrices: File.exist?(m_config) ? JSON.parse(File.read(m_config)) : {},
          klasses: Labimotion::ElementKlass.where(is_active: true, is_generic: true)&.pluck(:name) || [],
          structure_editors: Rails.configuration.structure_editors,
          has_sfn: sfn_config.present? && current_user.matrix_check_by_name('scifinderN'),
          has_converter: converter_config.present?,
          has_radar: radar_config.present?,
          molecule_viewer: Matrice.molecule_viewer,
          collector_address: collector_address.presence,
          third_party_apps: Entities::ThirdPartyAppEntity.represent(ThirdPartyApp.all),
          pg_cartridge_installed: Chemotion::Application.config.rdkit_installed || false,
        }
      end
    end
  end
end
