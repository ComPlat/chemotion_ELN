# frozen_string_literal: true

module Usecases
  module Attachments
    module Annotation
      class AnnotationUpdater
        require 'mini_magick'

        def initialize(thumbnailer = nil)
          @thumbnailer = thumbnailer || ThumbnailerWrapper.new
        end

        def update_annotation(annotation_svg_string, attachment_id)
          return if annotation_svg_string == 'undefined'

          attachment = Attachment.find(attachment_id)
          sanitized_svg_string = sanitize_svg_string(annotation_svg_string)
          save_svg_string_to_file_system(sanitized_svg_string, attachment)
          update_thumbnail(attachment, sanitized_svg_string)
          create_annotated_flat_image(attachment, sanitized_svg_string)
        end

        def sanitize_svg_string(svg_string) # rubocop:disable Metrics/AbcSize,Metrics/MethodLength
          scrubber = Rails::Html::PermitScrubber.new
          scrubber.tags = %w[svg image g title rect text path line ellipse]
          scrubber.attributes = %w[height id width href class fill stroke stroke-dasharray stroke-linecap transform
                                   stroke-linejoin stroke-width x y font-family font-size font-weight text-anchor
                                   space d x1 x2 y1 y2 cx cy rx ry]
          sanitized_svg_string = Loofah.xml_fragment(svg_string).scrub!(scrubber).to_s

          sanitize_rest_call = Loofah::Scrubber.new do |node|
            if node.name == 'image'
              rest_url = node.attributes['href'].value
              raise 'Link to image not valid' unless rest_url.match?(%r{^/api/v\d+/attachments/image/\d+})
            end
          end
          Loofah.xml_fragment(sanitized_svg_string).scrub!(sanitize_rest_call).to_s
        end

        def save_svg_string_to_file_system(sanitized_svg_string, attachment)
          location = attachment.attachment_data['derivatives']['annotation']['id']
          f = File.new(location, 'w')
          f.write(sanitized_svg_string)
          f.close
        end

        def update_thumbnail(attachment, svg_string)
          location_of_thumbnail = attachment.attachment_data['derivatives']['thumbnail']['id']
          tmp_thumbnail_location = "#{location_of_thumbnail.split('.')[0]}_thumb.svg"

          xml = replace_link_with_base64(attachment.attachment_data['id'], svg_string)
          File.write(tmp_thumbnail_location, xml.to_xml)

          thumbnail = @thumbnailer.create_thumbnail(tmp_thumbnail_location)

          FileUtils.move(thumbnail, location_of_thumbnail)
          FileUtils.rm_f(tmp_thumbnail_location)
        end

        def create_annotated_flat_image(attachment, svg_string) # rubocop:disable Metrics/AbcSize
          location_of_file = attachment.attachment_data['id']
          xml = replace_link_with_base64(location_of_file, svg_string)
          extention = File.extname(location_of_file)
          extention = '.png' if ['.tif', '.tiff'].include?(extention)
          annotated_image_location = "#{location_of_file.split('.')[0]}_annotated" + extention
          image = MiniMagick::Image.read(xml.to_s)
          image.format(extention.delete('.'))
          image.write(annotated_image_location)
          attachment.attachment_data['derivatives']['annotation']['annotated_file_location'] = annotated_image_location
          attachment.update_column(:attachment_data, attachment.attachment_data) # rubocop:disable Rails/SkipsModelValidations
        end

        def replace_link_with_base64(location_of_file, svg_string)
          extension = MIME::Types.type_for(location_of_file).first.content_type
          extension = 'image/png' if extension == 'image/tiff'
          base64 = "data:image/#{extension};base64,#{Base64.strict_encode64(File.binread(location_of_file))}"
          xml = Nokogiri::XML(svg_string)
          group = xml.xpath('//*[@id="original_image"]')
          group[0].attributes['href'].value = base64
          xml
        end

        class ThumbnailerWrapper
          def create_thumbnail(tmp_path)
            Thumbnailer.create(tmp_path)
          end
        end
      end
    end
  end
end
