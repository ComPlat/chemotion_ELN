# frozen_string_literal: true

module Versioning
  module Reverters
    # chemical_data is reverted to the stored value the history sends, like any other column.
    class ChemicalReverter < BaseReverter
      def self.scope
        Chemical
      end
    end
  end
end
