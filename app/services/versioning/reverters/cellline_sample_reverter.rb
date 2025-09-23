# frozen_string_literal: true

module Versioning
  module Reverters
    class CelllineSampleReverter < Versioning::Reverters::BaseReverter
      def self.scope
        CelllineSample.with_deleted
      end
    end
  end
end
