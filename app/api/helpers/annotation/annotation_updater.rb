# frozen_string_literal: true

class AnnotationUpdater
  require 'mini_magick'

  def initialize(thumbnailer = nil)
    @thumbnailer = thumbnailer || ThumbnailerWrapper.new
  end

  def update_annotation(annotation_svg_string, attachment_id)
    att = Attachment.find(attachment_id)
    sanitized_svg_string = sanitize_svg_string(annotation_svg_string)
    save_svg_string_to_file_system(sanitized_svg_string, att)
    update_thumbnail(att, sanitized_svg_string)
    create_annotated_flat_image(att, sanitized_svg_string)
  end

  def sanitize_svg_string(svg_string) # rubocop:disable Metrics/AbcSize,Metrics/MethodLength
    scrubber = Rails::Html::PermitScrubber.new
    scrubber.tags = %w[svg image g title rect text path line ellipse]
    scrubber.attributes = %w[height id width href class fill stroke stroke-dasharray stroke-linecap
                             stroke-linejoin stroke-width x y font-family font-size font-weight text-anchor space d
                             x1 x2 y1 y2 cx cy rx ry]
    sanitized_svg_string = Loofah.xml_fragment(svg_string).scrub!(scrubber).to_s
    sanitize_rest_call = Loofah::Scrubber.new do |node|
      if node.name == 'image'
        rest_url = node.attributes['href'].value
        raise 'Link to image not valide' unless rest_url.match?(%r{^/api/v\d+/attachments/image/\d+})
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

  def update_thumbnail(attachment, sanitized_svg_string) # rubocop:disable Metrics/AbcSize,Metrics/MethodLength
    location_of_thumbnail = attachment.attachment_data['derivatives']['thumbnail']['id']
    location_of_file = attachment.attachment_data['id']
    base64 = "data:image/png;base64,#{Base64.encode64(File.binread(location_of_file))}"
    xml = Nokogiri::XML(sanitized_svg_string)
    group = xml.xpath('//*[@id="original_image"]')
    group[0].attributes['href'].value = base64
    tmp_thumbnail_location = "#{location_of_thumbnail.split('.')[0]}_thumb.svg"
    File.write(tmp_thumbnail_location, xml.to_xml)
    thumbnail = @thumbnailer.create_thumbnail("#{location_of_thumbnail.split('.')[0]}_thumb.svg")
    FileUtils.move(thumbnail, location_of_thumbnail)
    FileUtils.rm_f(tmp_thumbnail_location)
  end

  def create_annotated_flat_image(attachment, sanitized_svg_string)  # rubocop:disable Metrics/AbcSize
    location_of_file = attachment.attachment_data['id']
    base64 = "data:image/png;base64,#{Base64.encode64(File.binread(location_of_file))}"
    xml = Nokogiri::XML(sanitized_svg_string)
    group = xml.xpath('//*[@id="original_image"]')
    group[0].attributes['href'].value = base64
    tmp_annotated_image_location = "#{location_of_file.split('.')[0]}_annotated.png"
    image = MiniMagick::Image.read(xml.to_s)
    image.format('png')
    image.write(tmp_annotated_image_location)
  end

  class ThumbnailerWrapper
    def create_thumbnail(tmp_path)
      Thumbnailer.create(tmp_path)
    end
  end
end
