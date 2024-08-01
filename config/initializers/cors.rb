Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins '*'
    resource '/public/*', headers: :any, methods: :get
    resource '/api/v1/public/*', headers: :any, methods: [:get, :post, :put, :patch, :options, :head]
  end
end
