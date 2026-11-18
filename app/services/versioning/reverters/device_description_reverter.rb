# frozen_string_literal: true

module Versioning
  module Reverters
    # The json columns are reverted to the stored values the history sends, like any other column.
    class DeviceDescriptionReverter < Versioning::Reverters::BaseReverter
      def self.scope
        DeviceDescription.with_deleted
      end
    end
  end
end
