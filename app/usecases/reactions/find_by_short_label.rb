# frozen_string_literal: true

module Usecases
  module Reactions
    class FindByShortLabel
      attr_accessor :result
      attr_reader :short_label, :current_user

      def initialize(short_label, current_user)
        @current_user = current_user
        @short_label = short_label
        @result = {
          reaction_id: nil,
          collection_id: nil,
        }
        find_reaction
      end

      private

      def find_reaction
        reaction = current_user.reactions.find_by(short_label: short_label)
        return unless reaction

        collections_containing_reaction = current_user.collections.ids & reaction.collections.ids
        return if collections_containing_reaction.none?

        self.result = {
          reaction_id: reaction.id,
          collection_id: collections_containing_reaction.first,
        }
      end
    end
  end
end
