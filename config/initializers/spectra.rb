# frozen_string_literal: true

if File.exist? Rails.root.join('config', 'spectra.yml')
  spectra_config = Rails.application.config_for :spectra

  Rails.application.configure do
    config.spectra = ActiveSupport::OrderedOptions.new

    config.spectra.chemspectra = ActiveSupport::OrderedOptions.new

    if !spectra_config[:url].nil? && !spectra_config[:port].nil?
      Rails.logger.info(
        "Chemspectra configuration that use 'url' and 'port' will deprecated soon" \
        "Please update 'spectra.yml' file to use Rails.configuration.spectra.chemspectra.url instead."
      )
      url = spectra_config[:url]
      port = spectra_config[:port]
      config.spectra.chemspectra.url = "http://#{url}:#{port}"
    end
    
    unless spectra_config[:chemspectra].nil?
      chemspectra_object = spectra_config[:chemspectra]
      config.spectra.chemspectra.url = chemspectra_object[:url]
    end

    unless spectra_config[:nmriumwrapper].nil?
      config.spectra.nmriumwrapper = ActiveSupport::OrderedOptions.new
      nmrium_wrapper_object = spectra_config[:nmriumwrapper]
      config.spectra.nmriumwrapper.url = nmrium_wrapper_object[:url]
    end
  end
end
