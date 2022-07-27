# frozen_string_literal: true

class AnnotationUpdater
  def initialize(thumbnailer = nil)
    @thumbnailer = thumbnailer || ThumbnailerWrapper.new
  end

  def update_annotation(annotation_svg_string, attachment_id)
    att = Attachment.find(attachment_id)
    sanitized_svg_string = sanitize_svg_string(annotation_svg_string)
    save_svg_string_to_file_system(sanitized_svg_string, att)
    update_thumbnail(att,sanitized_svg_string)
  end

  def sanitize_svg_string(svg_string)
    svg_string
  end

  def save_svg_string_to_file_system(sanitized_svg_string, attachment)
    location = attachment.attachment_data['derivatives']['annotation']['id']
    f = File.new(location, 'w')
    f.write(sanitized_svg_string)
    f.close
  end

  def update_thumbnail(attachment,sanitized_svg_string)
    location_of_thumbnail = attachment.attachment_data['derivatives']['thumbnail']['id']
    location_of_file = attachment.attachment_data['id']
    base64 = 'data:image/png;base64,' + Base64.encode64(File.open(location_of_file, 'rb').read)
    xml = Nokogiri::XML(sanitized_svg_string)
    group = xml.xpath('//*[@id="original_image"]')
    group[0].attributes['href'].value = base64
    tmp_thumbnail_location=location_of_thumbnail.split('.')[0] + '_thumb.svg'
    File.write(tmp_thumbnail_location, xml.to_xml)
    thumbnail = @thumbnailer.create_thumbnail(location_of_thumbnail.split('.')[0] + '_thumb.svg')
    FileUtils.move(thumbnail, location_of_thumbnail)
    File.delete(tmp_thumbnail_location) if File.exist?(tmp_thumbnail_location)
  end

  class ThumbnailerWrapper
    def create_thumbnail(tmp_path)
      Thumbnailer.create(tmp_path)
    end
  end
end
