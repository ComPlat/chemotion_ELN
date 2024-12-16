require 'labimotion'
module ContainerHelpers
  extend Grape::API::Helpers

  def update_datamodel(container, _current_user = {})
    # TODO: check this logic, not sure this is still needed + containable_type should not be null
    root_container = if container[:is_new]
                       Container.create(
                         # name: "root",
                         container_type: container[:containable_type], # should be 'root'
                       )
                     else
                       Container.find_by id: container[:id]
                       # root_container.name = "root" #if it is created from client.side
                     end
    # root_container.save!
    # ODOT
    unless container[:description].nil? || root_container.nil?
      root_container[:description] = container[:description]
      root_container.save!
    end
    if container[:children] != nil && !container[:children].empty?
      create_or_update_containers(container[:children], root_container, current_user)
    end
    root_container
  end

  private

  def create_or_update_containers(children, parent_container, current_user={})
    return unless children
    return unless can_update_container(parent_container)

    children.each do |child|
      if child[:is_deleted]
        delete_containers_and_attachments(child) unless child[:is_new]
        next
      end

      extended_metadata = child[:extended_metadata]
      if child[:container_type] == 'analysis'
        extended_metadata['content'] = if extended_metadata.key?('content')
                                         extended_metadata['content'].to_json
                                       else
                                         '{"ops":[{"insert":""}]}'
                                       end
      end

      if child[:is_new]
        # Create container
        container = parent_container.children.create(
          name: child[:name],
          container_type: child[:container_type],
          description: child[:description],
          extended_metadata: extended_metadata,
        )
      else
        # Update container
        next unless container = Container.find_by(id: child[:id])

        if extended_metadata['analyses_compared'].present?
          analyses_compared = extended_metadata['analyses_compared']
          list_file = []
          list_file_names = []
          combined_image_filename = "#{container.name}.new_combined.png"
          created_by_user = -1

          analyses_compared.each do |attachment_info|
            attachment = Attachment.find_by(id: attachment_info['file']['id'])
            unless attachment.nil?
              created_by_user = attachment.created_by
              list_file_names.push(attachment.filename)
              list_file.push(attachment.abs_path)
            end
          end

          _, image = Chemotion::Jcamp::CombineImg.combine(
            list_file, 0, list_file_names, nil
          )

          unless image.nil?
            att = Attachment.find_by(filename: combined_image_filename, attachable_id: container.id)
            att.destroy! unless att.nil?
            att = Attachment.new(
              filename: combined_image_filename,
              created_by: created_by_user,
              created_for: created_by_user,
              file_path: image.path,
              attachable_type: 'Container',
              attachable_id: container.id,
            )
            att.save!
          end
        end

        container.update!(
          name: child[:name],
          container_type: child[:container_type],
          description: child[:description],
          extended_metadata: extended_metadata,
        )
      end

      create_or_update_attachments(container, child[:attachments]) if child[:attachments]

      if child[:container_type] == 'dataset' && child[:dataset].present? && child[:dataset]['changed']
        klass_id = child[:dataset]['dataset_klass_id']
        properties = child[:dataset]['properties']
        container.save_dataset(dataset_klass_id: klass_id, properties: properties, element: parent_container&.root&.containable, current_user: current_user) # rubocop:disable Layout/LineLength
      end
      create_or_update_containers(child[:children], container, current_user)
    end
  end

  def create_or_update_attachments(container, attachments)
    return if attachments.empty?

    can_update = can_update_container(container)
    can_edit = true
    return unless can_update

    attachments.each do |att|
      if att[:is_new]
        attachment = Attachment.where(key: att[:id], attachable: nil).last
      else
        attachment = Attachment.where(id: att[:id]).last
        container_id = attachment && attachment.container_id
        if container_id
          att_container = Container.find(container_id)
          can_edit = can_update_container(att_container)
        end
      end
      next unless attachment

      if att[:is_deleted] && can_edit
        attachment.destroy!
        next
      end
      attachment.update!(attachable_id: container.id, attachable_type: 'Container') if container.present?
    end
  end

  def delete_containers_and_attachments(container)
    Attachment.where_container(container[:id]).destroy_all
    if container[:children] && container[:children].length > 0
      container[:children].each do |tmp|
        delete_containers_and_attachments(tmp)
      end
    end
    Container.where(id: container[:id]).destroy_all
  end

  def can_update_container(container)
    if element = container.root.containable
      ElementPolicy.new(current_user, element).update?
    else
      true
    end
  end

  def comparable_info(object)
    return unless object.container_type == 'analysis'

    is_comparison = object.extended_metadata['is_comparison'].present? && object.extended_metadata['is_comparison'] == 'true'

    list_attachments = []
    list_dataset = []
    list_analyses = []
    layout = ''
    if object.extended_metadata['analyses_compared'].present?
      analyses_compared = JSON.parse(object.extended_metadata['analyses_compared'].gsub('=>', ':'))
      analyses_compared.each do |attachment_info|
        layout = attachment_info['layout']
        attachment = attachment_info['file']['id']
        dataset = attachment_info['dataset']['id']
        analyis = attachment_info['analysis']['id']
        list_attachments.push(attachment)
        list_dataset.push(dataset)
        list_analyses.push(analyis)
      end
    end

    {
      is_comparison: is_comparison,
      list_attachments: list_attachments,
      list_dataset: list_dataset,
      list_analyses: list_analyses,
      layout: layout,
    }
  end
end