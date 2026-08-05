# frozen_string_literal: true

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins '*'
    resource '/api/v1/public/*', headers: :any, methods: %i[get post options]
    resource '/api/v1/collections/imports/*', headers: :any, methods: %i[post options], credentials: false
  end

  if Rails.env.development?
    allow do
      # Allow requests from Storybook (default port 6006)
      origins 'http://localhost:6006'
      resource '/assets/*',
               headers: :any,
               methods: %i[get options]
    end
  end
end
