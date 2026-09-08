# frozen_string_literal: true

module Usecases
  module Wellplates
    # The rules a wellplate grid has to satisfy, in one place so that every path
    # which sets +width+/+height+ enforces the same ones. Living in a single use
    # case is what previously let the create endpoint accept a grid the resize
    # endpoint would refuse.
    module Dimensions
      # Largest grid dimension, matching {WellPosition}'s own bound and
      # {Usecases::Wellplates::TemplateCreation}'s +max+.
      MAX_DIMENSION = 100

      module_function

      # @param width [Integer]
      # @param height [Integer]
      # @raise [Usecases::Wellplates::Errors::InvalidDimensionsError] for an
      #   out-of-bounds dimension, or one dimension zero while the other is not
      # @return [void]
      def validate!(width:, height:)
        { 'width' => width, 'height' => height }.each do |name, value|
          next if value.between?(0, MAX_DIMENSION)

          raise Errors::InvalidDimensionsError,
                "Wellplate #{name} of #{value} must be between 0 and #{MAX_DIMENSION}."
        end

        # An unsized wellplate is 0x0. One dimension alone at zero yields a
        # wellplate with no wells but a non-zero edge, which the designer renders
        # as headers around an empty grid and which no resize can repair.
        return unless width.zero? ^ height.zero?

        raise Errors::InvalidDimensionsError,
              'A wellplate size of 0 requires both width and height to be 0.'
      end
    end
  end
end
