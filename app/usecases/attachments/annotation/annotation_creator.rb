# frozen_string_literal: true

module Usecases
  module Attachments
    module Annotation
      class AnnotationCreator
        require_relative 'mini_magick_image_analyser'

        def initialize(image_analyzer = nil)
          @image_analyzer = image_analyzer || MiniMagickImageAnalyser.new
        end

        def create_derivative(tmp_path, original_file, db_id, result, _record)
          tmp_file = create_tmp_file(tmp_path, File.basename(original_file, '.*'))
          dimension = get_image_dimension(original_file)
          svg_string = create_annotation_string(dimension[0], dimension[1], db_id)
          File.write(tmp_file.path, svg_string)
          result[:annotation] = File.open(tmp_file.path, 'rb')
          result
        end

        def create_tmp_file(tmp_path, original_file_name)
          annotation_tmp_path = "#{Pathname.new(tmp_path).dirname}/#{original_file_name}.annotation.svg"
          Tempfile.new(annotation_tmp_path, encoding: 'ascii-8bit')
        end

        def get_image_dimension(original)
          @image_analyzer.get_image_dimension(original.path)
        end

        def create_annotation_string(height, width, id)
          "<svg width=\"#{width}\" height=\"#{height}\" " \
            'xmlns="http://www.w3.org/2000/svg" ' \
            'xmlns:svg="http://www.w3.org/2000/svg" ' \
            'xmlns:xlink="http://www.w3.org/1999/xlink"> ' \
            '<g class="layer"> <title>Image</title>' \
            "<image height=\"#{height}\" id=\"original_image\" " \
            "width=\"#{width}\" " \
            "xlink:href=\"/api/v1/attachments/image/#{id}\"/>" \
            '</g><g id="annotation" class="layer"><title>Annotation</title>' \
            '</g> </svg>'
        end
      end
    end
  end
end
