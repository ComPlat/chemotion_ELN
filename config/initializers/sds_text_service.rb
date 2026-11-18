# frozen_string_literal: true

# This initializer loads the optional configuration for:
#   the PDF text service that reads safety data sheets (Chemotion::SdsTextService)
#
# No config/sds_text_service.yml, or an empty :url:, leaves Ghostscript running locally.
# A file that is present but unusable marks the service misconfigured: safety sheet
# extraction is then refused, never silently moved back into this container.

default_timeout = 30

# Specific
validations = lambda do |config, service|
  settings = config.send(service)
  raise ArgumentError, "no settings for the #{Rails.env} environment" unless settings
  next settings.desc = 'no url - Ghostscript runs locally' if settings.url.blank?

  url = URI.parse(settings.url)
  raise ArgumentError, "Invalid URL: #{url}" unless url.host && %w[http https].include?(url.scheme)

  settings.timeout = Integer(settings.timeout || default_timeout)
  raise ArgumentError, "Invalid timeout: #{settings.timeout}" unless settings.timeout.positive?

  # set description
  settings.desc = "service hosted at: #{url}"
end

# Generic initialization
service = File.basename(__FILE__, '.rb').to_sym # Service name
service_setter = :"#{service}=" # Service setter
ref = "Initializing #{service}:" # Message prefix

Rails.application.configure do
  if File.exist?(Rails.root.join("config/#{service}.yml"))
    begin
      config.send(service_setter, config_for(service)) # Load config/.yml
      validations.call(config, service) # Validate configuration
    # Rescue:
    # - RuntimeError is raised if the yml file cannot be parsed
    # - ArgumentError, TypeError and URI::InvalidURIError if a value is unusable
    rescue RuntimeError, NoMethodError, ArgumentError, TypeError, URI::InvalidURIError => e
      Rails.logger.warn "#{ref} Error while loading configuration #{e.message}"
      config.send(service_setter, ActiveSupport::OrderedOptions.new.merge!(
                                    misconfigured: true,
                                    desc: 'configuration invalid - safety sheet extraction refused',
                                  ))
    end
  else
    config.send(service_setter, ActiveSupport::OrderedOptions.new.merge!(
                                  desc: 'not configured - Ghostscript runs locally',
                                ))
  end
  Rails.logger.info "#{ref} #{config.send(service).desc}"
end
