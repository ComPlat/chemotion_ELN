# frozen_string_literal: true

if File.exist? Rails.root.join('config', 'node_service.yml')
  node_config = Rails.application.config_for(:node_service)
  transport = node_config[:transport]
  endpoint = node_config[:endpoint]

  Rails.application.configure do
    config.node_service = ActiveSupport::OrderedOptions.new
    config.node_service.transport = transport
    config.node_service.endpoint = endpoint
  end

  # if Rails.env.development?
  #   path = "#{Rails.root.to_path}/lib/node_service/nodeService.js"
  #   pid = spawn("nvm use; node #{path} #{host} #{port}")
  #   Process.detach(pid)
  # end
end
