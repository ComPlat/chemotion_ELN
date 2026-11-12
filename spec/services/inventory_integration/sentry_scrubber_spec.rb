# frozen_string_literal: true

require 'rails_helper'

describe InventoryIntegration::SentryScrubber do
  after { InventoryIntegration::Redactor.reset! }

  it 'is the before_send and before_breadcrumb hook, masking message, exception, request and breadcrumbs' do
    InventoryIntegration::Redactor.register('s3cr3t-value')
    event = Sentry::ErrorEvent.new(configuration: Sentry.configuration)
    event.message = 'failed with s3cr3t-value'
    event.add_exception_interface(RuntimeError.new('GET /rest.cgi/s3cr3t-value/x'), mechanism: Sentry::Mechanism.new)
    event.send(:add_request_interface, Rack::MockRequest.env_for('https://eln.example.org/p?key=s3cr3t-value'))
    breadcrumb = Sentry::Breadcrumb.new(message: 'GET s3cr3t-value', data: { url: 'https://h/s3cr3t-value' })

    scrubbed = Sentry.configuration.before_send.call(event, {})
    Sentry.configuration.before_breadcrumb.call(breadcrumb, {})
    expect(scrubbed.to_hash.to_json).not_to include('s3cr3t-value')
    expect([breadcrumb.message, breadcrumb.data[:url]]).to eq ['GET [FILTERED]', 'https://h/[FILTERED]']
  end
end
