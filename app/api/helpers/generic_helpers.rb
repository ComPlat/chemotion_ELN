# frozen_string_literal: true

# Helper for associated sample
module GenericHelpers
  extend Grape::API::Helpers

  def fetch_properties_uploads(properties)
    uploads = []
    properties['layers'].keys.each do |key|
      layer = properties['layers'][key]
      field_uploads = layer['fields'].select { |ss| ss['type'] == 'upload' }
      field_uploads.each do |field|
        (field['value'] && field['value']['files'] || []).each do |file|
          uploads.push({ layer: key, field: field['field'], uid: file['uid'], filename: file['filename'] })
        end
      end
    end
    uploads
  end

  def update_properties_upload(element, properties, att, pa)
    return if pa.nil?

    idx = properties['layers'][pa[:layer]]['fields'].index { |fl| fl['field'] == pa[:field] }
    fidx = properties['layers'][pa[:layer]]['fields'][idx]['value']['files'].index { |fi| fi['uid'] == pa[:uid] }
    properties['layers'][pa[:layer]]['fields'][idx]['value']['files'][fidx]['aid'] = att.id
    properties['layers'][pa[:layer]]['fields'][idx]['value']['files'][fidx]['uid'] = att.identifier
    element.update_columns(properties: properties)
  end

  def create_uploads(type, id, files, param_info, user_id)
    return if files.nil? || param_info.nil? || files.empty? || param_info.empty?

    attach_ary = []
    map_info = JSON.parse(param_info)
    map_info&.keys&.each do |key|
      next if map_info[key]['files'].empty?

      if type == 'Segment'
        element = Segment.find_by(element_id: id, segment_klass_id: key)
      elsif type == 'Element'
        element = Element.find_by(id: id)
      end
      next if element.nil?

      uploads = fetch_properties_uploads(element.properties)

      map_info[key]['files'].each do |fobj|
        file = (files || []).select { |ff| ff['filename'] == fobj['uid'] }&.first
        pa = uploads.select { |ss| ss[:uid] == file[:filename] }&.first || nil
        if (tempfile = file[:tempfile])
          a = Attachment.new(
            bucket: file[:container_id],
            filename: fobj['filename'],
            file_path: file[:tempfile],
            created_by: user_id,
            created_for: user_id,
            content_type: file[:type],
            attachable_type: map_info[key]['type'],
            attachable_id: element.id
          )
          begin
            a.save!

            update_properties_upload(element, element.properties, a, pa)
            attach_ary.push(a.id)
          ensure
            tempfile.close
            tempfile.unlink
          end
        end
      end
      element.send("#{type.downcase}s_revisions")&.last&.destroy!
      element.save!
    end
    attach_ary
  end

  def create_attachments(files, del_files, type, id, user_id)
    attach_ary = []
    (files || []).each do |file|
      if (tempfile = file[:tempfile])
        a = Attachment.new(
          bucket: file[:container_id],
          filename: file[:filename],
          file_path: file[:tempfile],
          created_by: user_id,
          created_for: user_id,
          content_type: file[:type],
          attachable_type: type,
          attachable_id: id
        )
        begin
          a.save!
          attach_ary.push(a.id)
        ensure
          tempfile.close
          tempfile.unlink
        end
      end
    end
    Attachment.where('id IN (?) AND attachable_type = (?)', del_files.map!(&:to_i), type).update_all(attachable_id: nil) unless (del_files || []).empty?
    attach_ary
  end
end
