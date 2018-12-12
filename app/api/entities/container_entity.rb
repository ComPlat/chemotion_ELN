module Entities
  class ContainerEntity < Grape::Entity
    expose :big_tree, merge: true

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
      code_logs =  CodeLog.where(source_id: dataset_ids.keys, source: 'container').to_a

      bt.dig('children',0,'children')&.each do |analysis|
        analysis['preview_img'] = preview_img(dataset_ids[analysis['id']], attachments)
        analysis['code_log'] = code_logs.find {|cl| cl.source_id == analysis['id']}.attributes
        analysis['children'].each do |dataset|
          atts = attachments.select { |a| a.attachable_id == dataset['id'] }
          dataset['attachments'] = Entities::AttachmentEntity.represent(atts)
        end
      end
      bt
    end

    private
    def preview_img(container_ids, attachments)
      attachment = attachments.find { |a|
        a.thumb == true && a.attachable_type == 'Container' && container_ids.include?(a.attachable_id)
      }
      preview = attachment.read_thumbnail if attachment
      preview && Base64.encode64(preview) || "not available"
    end

    def get_extended_metadata(container)
      ext_mdata = container.extended_metadata || {}
      ext_mdata['report'] = (ext_mdata['report'] == 'true') || (ext_mdata == true)
      if ext_mdata['content'].present?
        ext_mdata['content'] = JSON.parse(ext_mdata['content'])
      end
      ext_mdata
    end
  end
end
