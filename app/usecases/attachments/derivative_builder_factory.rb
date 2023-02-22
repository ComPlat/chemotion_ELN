# frozen_string_literal: true

# Class for creating a builder for a specific derivative

module Usecases
  module Attachments
    class DerivativeBuilderFactory
      def initialize(supported_formats_map = nil)
        @supported_formats_map = supported_formats_map || {
          'Usecases::Attachments::Thumbnail::ThumbnailCreator' =>
          Usecases::Attachments::Thumbnail::ThumbnailCreator.supported_formats,
          'Usecases::Attachments::Annotation::AnnotationCreator' => %w[bmp jpg png svg tif tiff],
          'Usecases::Attachments::Converter::FileConverter' => %w[tif tiff],
        }
      end

      def create_derivative_builders(data_type_in)
        builders = []
        data_type = data_type_in.sub('.', '').downcase
        possible_creators.each do |creator|
          builders.append(creator.constantize.new) if @supported_formats_map[creator].include? data_type
        end

        builders
      end

      def possible_creators
        %w[Usecases::Attachments::Thumbnail::ThumbnailCreator
           Usecases::Attachments::Annotation::AnnotationCreator
           Usecases::Attachments::Converter::FileConverter]
      end
    end
  end
end
