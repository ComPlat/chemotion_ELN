# frozen_string_literal: true

module Versioning
  module Reverters
    class LiteralReverter < Versioning::Reverters::BaseReverter
      REVERTIBLE_FIELDS = %w[litype deleted_at].freeze

      def self.scope
        Literal.with_deleted
      end

      # only the citation type and the deletion can be changed by the user, the literature fields are shared
      def call
        self.fields = fields.select { |field| field['name'].in?(REVERTIBLE_FIELDS) }
        super
      end
    end
  end
end
