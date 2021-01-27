# This file is used by Rack-based servers to start the application.
# require 'rack/cors'
# require 'grape'

# use Rack::Cors do
#  allow do
#    origins '*'
#    resource '*', headers: :any, methods: [ :get, :post, :put, :delete, :options ]
#  end
# end


require ::File.expand_path('../config/environment', __FILE__)
run Rails.application
