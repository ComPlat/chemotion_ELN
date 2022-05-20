# frozen_string_literal: true

module Usecases
  module Samples
    class FindByShortLabel
      attr_accessor :result
      attr_reader :short_label, :current_user

      def initialize(short_label, current_user)
        @current_user = current_user
        @short_label = short_label
        @result = {
          sample_id: nil,
          collection_id: nil
        }
        find_sample
      end

      private

      def find_sample
        sample = current_user.samples.find_by(short_label: short_label)
        return unless sample

        collections_containing_sample = current_user.collections.ids & sample.collections.ids
        return if collections_containing_sample.none?

        self.result = {
          sample_id: sample.id,
          collection_id: collections_containing_sample.first
        }
      end
    end
  end
end
