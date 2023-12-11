# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    class ReactionEntity < Grape::Entity
      expose(:id, :short_label, :reaction_svg_file)

      expose(:value)

      private

      def value
        object.id
      end
    end
  end
end
