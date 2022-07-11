# frozen_string_literal: true

# Class for creating a builder for a specific derivative
class DerivativeBuilderFactory
  require 'helpers/annotation/annotation_creator'
  require 'helpers/thumbnail/thumbnail_creator'

  def initialize(supported_formats_map = nil)
    @supported_formats_map = supported_formats_map || {
      'ThumbnailCreator' => ThumbnailCreator.supported_formats,
      'AnnotationCreator' =>
        %w[jpg png svg]
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
    %w[ThumbnailCreator AnnotationCreator]
  end
end
