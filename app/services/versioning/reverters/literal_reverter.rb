# frozen_string_literal: true

module Versioning
  module Reverters
    class LiteralReverter < Versioning::Reverters::BaseReverter
      def self.scope
        Literal.with_deleted
      end
    end
  end
end
