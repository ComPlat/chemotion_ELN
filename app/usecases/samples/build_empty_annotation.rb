# frozen_string_literal: true

module Usecases
  module Samples
    class BuildEmptyAnnotation
      attr_reader :sample

      def initialize(sample:)
        @sample = sample
      end

      def generate!
        dimensions = MiniMagickImageAnalyser.new.get_image_dimensions(
          Rails.root.join('public', 'images', 'samples', sample.sample_svg_file)
        )

        create_annotation_string(dimensions[:width], dimensions[:height])
      end

      private

      def create_annotation_string(width, height)
        <<~ENDOFSTRING
        <svg
          width="#{width}"
          height="#{height}"
          xmlns="http://www.w3.org/2000/svg"
          xmlns:svg="http://www.w3.org/2000/svg"
          xmlns:xlink="http://www.w3.org/1999/xlink"
        >
          <g
            class="layer"
            id="background"
          >
            <title>Image</title>
            <image
              height="#{height}"
              width="#{width}"
              id="original_image"
              xlink:href="/images_samples/#{sample.sample_svg_file}"
            />
          </g>
          <g
            class="layer"
            id="annotation"
          >
            <title>Annotation</title>
          </g>
        </svg>
        ENDOFSTRING
      end
    end
  end
end
