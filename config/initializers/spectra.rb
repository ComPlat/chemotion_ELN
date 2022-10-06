# frozen_string_literal: true

if File.exist? Rails.root.join('config', 'spectra.yml')
  spectra_config = Rails.application.config_for :spectra

  Rails.application.configure do
    config.spectra = ActiveSupport::OrderedOptions.new
    config.spectra.url = spectra_config[:url]
    config.spectra.port = spectra_config[:port]
    config.spectra.nmrdisplayer = spectra_config[:nmrdisplayer]
  end
end
