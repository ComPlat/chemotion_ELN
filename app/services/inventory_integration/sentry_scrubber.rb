# frozen_string_literal: true

module InventoryIntegration
  # Sentry before_send and before_breadcrumb hooks: masks integration secrets, e.g. a key in the
  # path of an outgoing request that the http breadcrumb logger records.
  module SentryScrubber
    class << self
      def event(event, _hint = nil)
        event.message = InventoryIntegration::Redactor.redact(event.message) if event.message
        event.extra = InventoryIntegration::Redactor.redact(event.extra) if event.extra
        scrub_exceptions(event)
        scrub_request(event.request)
        event.breadcrumbs&.each { |breadcrumb| self.breadcrumb(breadcrumb) }
        event
      end

      def breadcrumb(breadcrumb, _hint = nil)
        breadcrumb.message = InventoryIntegration::Redactor.redact(breadcrumb.message) if breadcrumb.message
        breadcrumb.data = InventoryIntegration::Redactor.redact(breadcrumb.data) if breadcrumb.data
        breadcrumb
      end

      private

      def scrub_exceptions(event)
        return unless event.respond_to?(:exception) && event.exception

        exceptions = event.exception.values
        exceptions.each { |exception| exception.value = InventoryIntegration::Redactor.redact(exception.value) }
      end

      def scrub_request(request)
        return unless request

        request.url = InventoryIntegration::Redactor.redact(request.url) if request.url
        request.query_string = InventoryIntegration::Redactor.redact(request.query_string) if request.query_string
      end
    end
  end
end
