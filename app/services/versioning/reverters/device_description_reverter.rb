# frozen_string_literal: true

module Versioning
  module Reverters
    class DeviceDescriptionReverter < Versioning::Reverters::BaseReverter
      def self.scope
        DeviceDescription.with_deleted
      end
    end
  end
end
