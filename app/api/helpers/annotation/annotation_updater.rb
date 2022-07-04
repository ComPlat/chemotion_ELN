# frozen_string_literal: true

class AnnotationUpdater
  def update_annotation(annotation_svg_string, attachment_id)
    att = Attachment.find(attachment_id)
    sanitized_svg_string = sanitize_svg_string(annotation_svg_string)
    save_svg_string_to_file_system(sanitized_svg_string, att)
  end

  def sanitize_svg_string(svg_string)
    svg_string
  end

  def save_svg_string_to_file_system(sanitized_svg_string, attachment)
    location = attachment.attachment_data['derivatives']['annotation']['id']
    f = File.new(location, 'w')
    f.write(sanitized_svg_string)
    f.close
    location
  end
end
