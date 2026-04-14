GrapeSwaggerRails.options.before_action do
  GrapeSwaggerRails.options.app_url = request.protocol + request.host_with_port
end

GrapeSwaggerRails.options.url = Rails.env.development? ? '/api/v1/swagger_doc' : '/swagger_doc.json'
GrapeSwaggerRails.options.app_url  = "#{ENV['APPLICATION_URL']}"

# The grape-swagger-rails gem's view has inline <script> tags without a CSP
# nonce, which the app-wide policy blocks. Disable CSP on the engine's
# controller so the Swagger UI page can load its bundled scripts.
Rails.application.config.to_prepare do
  GrapeSwaggerRails::ApplicationController.content_security_policy false
end
