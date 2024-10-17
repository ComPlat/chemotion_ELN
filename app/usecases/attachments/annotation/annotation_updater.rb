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

        def sanitize_svg_string(svg_string)
          scrubber = Rails::Html::PermitScrubber.new
          scrubber.tags = %w[svg image g title rect text path line ellipse]
          scrubber.attributes = %w[height id width href class fill stroke stroke-dasharray stroke-linecap transform
                                   stroke-linejoin stroke-width x y font-family font-size font-weight text-anchor
                                   space d x1 x2 y1 y2 cx cy rx ry text-decoration opacity fill-opacity]
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
          location = attachment.attachment(:annotation).url
          f = File.new(location, 'w')
          f.write(sanitized_svg_string)
          f.close
        end

        def update_thumbnail(attachment, svg_string)
          return if attachment.attachment(:thumbnail).blank?

          location_of_thumbnail = attachment.attachment(:thumbnail).url
          tmp_thumbnail_location = "#{location_of_thumbnail.split('.')[0]}_thumb.svg"
          xml = replace_link_with_base64(attachment.attachment.url, svg_string, attachment.attachment.mime_type)
          File.write(tmp_thumbnail_location, xml.to_xml)

          thumbnail = @thumbnailer.create_thumbnail(tmp_thumbnail_location)

          FileUtils.move(thumbnail, location_of_thumbnail)
          FileUtils.rm_f(tmp_thumbnail_location)
        end

        def create_annotated_flat_image(attachment, svg_string) # rubocop:disable Metrics/AbcSize
          location_of_file = attachment.attachment.url

          xml = replace_link_with_base64(location_of_file, svg_string, attachment.attachment.mime_type)
          extention = File.extname(attachment.filename)
          extention = '.png' if ['.tif', '.tiff', '.svg'].include?(extention)
          annotated_image_location = "#{location_of_file.split('.')[0]}_annotated" + extention
          image = MiniMagick::Image.read(xml.to_s)
          image.format(extention.delete('.'))
          image.write(annotated_image_location)

          attachment.attachment_data['derivatives']['annotation']['annotated_file_location'] =
            "#{attachment.attachment_data['id']}_annotated#{extention}"
          attachment.update_column(:attachment_data, attachment.attachment_data) # rubocop:disable Rails/SkipsModelValidations
        end

        def replace_link_with_base64(location_of_file, svg_string, mime_type)
          mime_type = 'image/png' if mime_type == 'image/tiff'
          base64 = "data:/#{mime_type};base64,#{Base64.strict_encode64(File.binread(location_of_file))}"
          xml = Nokogiri::XML(svg_string)
          group = xml.xpath('//*[@id="original_image"]')
          group[0].attributes['href'].value = base64
          xml
        end

        def updated_annotated_string(annotation_data, attachment_id)
          annotation_data = annotation_data.gsub(
            %r{/api/v1/attachments/image/([0-9])*},
            "/api/v1/attachments/image/#{attachment_id}",
          )
          update_annotation(annotation_data, attachment_id)
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
