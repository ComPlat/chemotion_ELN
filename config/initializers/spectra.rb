# frozen_string_literal: true

if File.exist? Rails.root.join('config', 'spectra.yml')
  spectra_config = Rails.application.config_for :spectra

  Rails.application.configure do
    config.spectra = ActiveSupport::OrderedOptions.new

    unless spectra_config[:chemspectra].nil?
      config.spectra.chemspectra = spectra_config[:chemspectra]
    end

    unless spectra_config[:nmriumwrapper].nil?
      config.spectra.nmriumwrapper = spectra_config[:nmriumwrapper]
    end

    Rails.logger.info('*** This will be deprecated soon. Please update your spectra.yml ***')
    config.spectra.url = spectra_config[:url]
    config.spectra.port = spectra_config[:port]
  end
end
