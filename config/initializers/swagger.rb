GrapeSwaggerRails.options.before_action do
  GrapeSwaggerRails.options.app_url = request.protocol + request.host_with_port
end

GrapeSwaggerRails.options.url = Rails.env.development? ? '/api/v1/swagger_doc' : '/swagger_doc.json'
GrapeSwaggerRails.options.app_url  = "#{ENV['APPLICATION_URL']}"

