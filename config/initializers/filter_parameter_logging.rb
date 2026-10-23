# Be sure to restart your server when you modify this file.

# Configure sensitive parameters which will be filtered from the log file.
# credentials, api_key, secret and token: inventory integration connection secrets.
Rails.application.config.filter_parameters += %i[password credentials api_key secret token]
