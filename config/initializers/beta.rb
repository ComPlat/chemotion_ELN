beta_yml = Rails.root.join('config', 'beta.yml')
beta_config = File.exist?(beta_yml) ? beta_config = Rails.application.config_for(:beta) : {}

Rails.application.configure do
#  config.beta = ActiveSupport::OrderedOptions.new
  config.beta = beta_config
end
