# frozen_string_literal: true

WebMock.disable_net_connect!(
  allow_localhost: true,
  allow: [
    'chromedriver.storage.googleapis.com',
    'github.com', # /mozilla/geckodriver/releases'
    's3.amazonaws.com'
  ]
)
