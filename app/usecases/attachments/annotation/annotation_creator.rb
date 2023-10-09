# frozen_string_literal: true

module Usecases
  module Attachments
    module Annotation
      class AnnotationCreator
        def initialize(image_analyzer = nil)
          @image_analyzer = image_analyzer || MiniMagickImageAnalyser.new
        end

        def create_derivative(tmp_path, original_file, db_id, result, _record)
          tmp_file = create_tmp_file(tmp_path, File.basename(original_file, '.*'))
          dimensions = get_image_dimension(original_file)
          svg_string = create_annotation_string(dimensions[:width], dimensions[:height], db_id)
          File.write(tmp_file.path, svg_string)
          result[:annotation] = File.open(tmp_file.path, 'rb')
          result
        end

        def create_tmp_file(tmp_path, original_file_name)
          annotation_tmp_path = "#{Pathname.new(tmp_path).dirname}/#{original_file_name}.annotation.svg"
          Tempfile.new(annotation_tmp_path, encoding: 'ascii-8bit')
        end

        def get_image_dimension(original)
          @image_analyzer.get_image_dimensions(original.path)
        end

        def create_annotation_string(width, height, id)
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
                  xlink:href="/api/v1/attachments/image/#{id}"
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
end
