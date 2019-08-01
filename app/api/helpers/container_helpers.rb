module ContainerHelpers
  extend Grape::API::Helpers

  def update_datamodel(container)

#TODO check this logic, not sure this is still needed + containable_type should not be null
    if container[:is_new]
      root_container = Container.create(
        #name: "root",
        container_type: container[:containable_type] #should be 'root'
      )
    else
      root_container = Container.find_by id: container[:id]
      #root_container.name = "root" #if it is created from client.side
    end
    #root_container.save!
#ODOT
    if container[:children] != nil && !container[:children].empty?
      create_or_update_containers(container[:children], root_container)
    end
    root_container
  end

  private

  def create_or_update_containers(children, parent_container)
    return unless children
    return unless can_update_container(parent_container)
    children.each do |child|
      if child[:is_deleted]
        delete_containers_and_attachments(child) unless child[:is_new]
        next
      end

      extended_metadata = child[:extended_metadata]
      if child[:container_type] == "analysis"
          extended_metadata["content"] = if extended_metadata.key?("content")
            extended_metadata["content"].to_json
          else
            "{\"ops\":[{\"insert\":\"\"}]}"
          end
      end

      if child[:is_new]
        #Create container
        container = parent_container.children.create(
          name: child[:name],
          container_type: child[:container_type],
          description: child[:description],
          extended_metadata: extended_metadata
        )
      else
        #Update container
        next unless container = Container.find_by(id: child[:id])
        container.update!(
          name: child[:name],
          container_type: child[:container_type],
          description: child[:description],
          extended_metadata: extended_metadata
        )
      end

      create_or_update_attachments(container, child[:attachments]) if child[:attachments]
      create_or_update_containers(child[:children], container)
    end
  end

  def create_or_update_attachments(container, attachments)
    return if attachments.empty?
    can_update = can_update_container(container)
    can_edit = true
    return unless can_update
    attachments.each do |att|
      if att[:is_new]
        attachment = Attachment.where(storage: 'tmp', key: att[:id]).last
      else
        attachment = Attachment.where(id: att[:id]).last
        container_id = attachment && attachment.container_id
        if container_id
          att_container = Container.find(container_id)
          can_edit = can_update_container(att_container)
        end
      end
      if attachment
        if att[:is_deleted] && can_edit
          attachment.destroy!
          next
        end
        #NB 2step update because moving store should be delayed job
        attachment.update!(attachable: container)
        primary_store = Rails.configuration.storage.primary_store

        attachment.update!(storage: primary_store) if att[:is_new]
      end
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

end #module
