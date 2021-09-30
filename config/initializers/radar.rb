begin
  radar_config = Rails.application.config_for :radar

  Rails.application.configure do
    config.radar = ActiveSupport::OrderedOptions.new
    config.radar.url = radar_config[:url]
    config.radar.client_id = radar_config[:client_id]
    config.radar.client_secret = radar_config[:client_secret]
    config.radar.redirect_url = radar_config[:redirect_url]
    config.radar.username = radar_config[:username]
    config.radar.password = radar_config[:password]
    config.radar.contract_id = radar_config[:contract_id]
    config.radar.workspace_id = radar_config[:workspace_id]
    config.radar.email = radar_config[:email]
    config.radar.backlink = radar_config[:backlink]
    config.radar.publisher = radar_config[:publisher]
    config.radar.resource = radar_config[:resource]
    config.radar.resourceType = radar_config[:resourceType]
    config.radar.softwareName = radar_config[:softwareName]
    config.radar.softwareVersion = radar_config[:softwareVersion]
  end
rescue StandardError => e
  puts e.message
  Rails.application.configure do
    config.radar = nil
  end
end
