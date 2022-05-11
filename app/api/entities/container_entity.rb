# frozen_string_literal: true

module Entities
  class ContainerEntity < ApplicationEntity
    expose :big_tree, merge: true

    private

    def big_tree(container = object)
      dataset_ids = {}
      bt = container.attributes.slice('id', 'container_type', 'name')
      bt['children'] = container.hash_tree[container].map do |c1, c2s|
        as = c1.attributes.slice('id', 'container_type', 'name')
        ## mapping analysis element
        as['children'] = c2s.map do |c2, c3s|
          a = c2.attributes.slice('id', 'container_type', 'name', 'description')
          a['extended_metadata'] = get_extended_metadata(c2)
          dids = []
          ## mapping datasets
          a['children'] = c3s.map do |c3, _|
            ds = c3.attributes.slice('id', 'container_type', 'name', 'description')
            dids << ds['id']
            ds['extended_metadata'] = get_extended_metadata(c3)
            ds
          end
          dataset_ids[a['id']] = dids
          a['preview_img'] = dids
          a
        end
        as
      end

      attachments = Attachment.where_container(dataset_ids.values.flatten).to_a
      code_logs = CodeLog.where(source_id: dataset_ids.keys, source: 'container').to_a

      bt.dig('children', 0, 'children')&.each do |analysis|
        analysis['preview_img'] = preview_img(dataset_ids[analysis['id']], attachments)
        analysis['code_log'] = code_logs.find { |cl| cl.source_id == analysis['id'] }.attributes
        analysis['children'].each do |ds_entity|
          atts = attachments.select { |a| a.attachable_id == ds_entity['id'] }
          ds_entity['attachments'] = Entities::AttachmentEntity.represent(atts)
          gds = Dataset.find_by(element_type: 'Container', element_id: ds_entity['id'])
          ds_entity['dataset'] = Entities::DatasetEntity.represent(gds) if gds.present?
        end
      end
      bt
    end

    def preview_img(container_ids, attachments)
      attachments = attachments.select do |a|
        a.thumb == true && a.attachable_type == 'Container' && container_ids.include?(a.attachable_id)
      end
      
      image_atts = attachments.select do |a_img|
        a_img&.content_type&.match(Regexp.union(%w[jpg jpeg png tiff]))
      end

      image_atts = image_atts.sort_by{ |a_img| a_img[:id] }.reverse

      attachment = image_atts[0] || attachments[0]

      preview = attachment.read_thumbnail if attachment
      result = if preview
        { preview: Base64.encode64(preview), id: attachment.id, filename: attachment.filename }
      else
        { preview: 'not available', id: nil, filename: nil }
      end
      result
    end

    def get_extended_metadata(container)
      ext_mdata = container.extended_metadata || {}
      ext_mdata['report'] = (ext_mdata['report'] == 'true') || (ext_mdata == true)
      ext_mdata['content'] = JSON.parse(ext_mdata['content'])  if ext_mdata['content'].present?
      ext_mdata['hyperlinks'] = JSON.parse(ext_mdata['hyperlinks']) if ext_mdata['hyperlinks'].present?
      ext_mdata
    end
  end
end
