# frozen_string_literal: true

# Helper for associated sample
module GenericHelpers
  extend Grape::API::Helpers

  def fetch_properties_uploads(properties) # rubocop:disable  Metrics/AbcSize,Metrics/MethodLength
    uploads = []
    properties['layers'].each_key do |key|
      layer = properties['layers'][key]
      field_uploads = layer['fields'].select { |ss| ss['type'] == 'upload' }
      field_uploads.each do |field|
        ((field['value'] && field['value']['files']) || []).each do |file|
          uploads.push({ layer: key, field: field['field'], uid: file['uid'], filename: file['filename'] })
        end
      end
    end
    uploads
  end

  def update_properties_upload(element, properties, att, pa) # rubocop:disable  Metrics/AbcSize,Naming/MethodParameterName
    return if pa.nil?

    idx = properties['layers'][pa[:layer]]['fields'].index { |fl| fl['field'] == pa[:field] }
    fidx = properties['layers'][pa[:layer]]['fields'][idx]['value']['files'].index { |fi| fi['uid'] == pa[:uid] }
    properties['layers'][pa[:layer]]['fields'][idx]['value']['files'][fidx]['aid'] = att.id
    properties['layers'][pa[:layer]]['fields'][idx]['value']['files'][fidx]['uid'] = att.identifier
    element.update_columns(properties: properties) # rubocop:disable  Rails/SkipsModelValidations
  end

  def create_uploads(type, id, files, param_info, user_id) # rubocop:disable  Metrics/AbcSize,Metrics/CyclomaticComplexity,Metrics/MethodLength,Metrics/PerceivedComplexity
    return if files.nil? || param_info.nil? || files.empty? || param_info.empty?

    attach_ary = []
    map_info = JSON.parse(param_info)
    map_info&.keys&.each do |key| # rubocop:disable  Metrics/BlockLength
      next if map_info[key]['files'].empty?

      case type
      when 'Segment'
        element = Segment.find_by(element_id: id, segment_klass_id: key)
      when 'Element'
        element = Element.find_by(id: id)
      end
      next if element.nil?

      uploads = fetch_properties_uploads(element.properties)

      map_info[key]['files'].each do |fobj|
        file = (files || []).select { |ff| ff['filename'] == fobj['uid'] }&.first
        pa = uploads.select { |ss| ss[:uid] == file[:filename] }&.first || nil
        next unless (tempfile = file[:tempfile])

        att = Attachment.new(
          bucket: file[:container_id],
          filename: fobj['filename'],
          file_path: file[:tempfile].path,
          created_by: user_id,
          created_for: user_id,
          content_type: file[:type],
          attachable_type: map_info[key]['type'],
          attachable_id: element.id,
        )

        ActiveRecord::Base.transaction do
          att.save!

          update_properties_upload(element, element.properties, att, pa)
          attach_ary.push(att.id)
        ensure
          tempfile.close
          tempfile.unlink
        end
      end
      element.send("#{type.downcase}s_revisions")&.last&.destroy!
      element.save!
    end
    attach_ary
  end

  def create_attachments(files, del_files, type, id, identifier, user_id) # rubocop:disable  Metrics/AbcSize,Metrics/MethodLength,Metrics/ParameterLists
    attach_ary = []

    (files || []).each_with_index do |file, index|
      next unless (tempfile = file[:tempfile])

      att = Attachment.new(
        bucket: file[:container_id],
        filename: file[:filename],
        file_path: file[:tempfile].path,
        created_by: user_id,
        created_for: user_id,
        content_type: file[:type],
        identifier: identifier[index],
        attachable_type: type,
        attachable_id: id,
      )

      ActiveRecord::Base.transaction do
        att.save!
        attach_ary.push(att.id)

      ensure
        tempfile.close
        tempfile.unlink
      end
    end
    unless (del_files || []).empty?
      Attachment.where('id IN (?) AND attachable_type = (?)', del_files.map!(&:to_i),
                       type).update_all(attachable_id: nil) # rubocop:disable  Rails/SkipsModelValidations
    end
    attach_ary
  end
end
