module ContainerHelper

  def self.update_datamodel(user, container)
    if Container.exists?(:id => container.id)
      root_container = Container.find_by id: container.id
    else
      root_container = Container.new
      root_container.name = "root";
      root_container.save!
    end

    create_or_update_containers(user, container.children, root_container)

    return root_container
  end

private
  def self.create_or_update_containers(user, children, root_container)
    children.each do |child|
      if Container.exists?(:id => child.id)
        if child.is_deleted
          delete_containers_and_attachments(user, child)
        else
          #Update container
          tmp = Container.find_by id: child.id
          tmp.name = child.name
          tmp.save!
          create_or_update_attachments(user, tmp.id, child.attachments)
          create_or_update_containers(user, child.children, tmp)
        end
      else
        if !child.is_deleted
          #Create container
          tmp = Container.create! :name => child.name, :parent => root_container
          create_or_update_attachments(user, tmp.id, child.attachments)
          create_or_update_containers(user, child.children, tmp)
        end
      end
    end
  end

  def self.create_or_update_attachments(user, parent_container_id, attachments)
    attachments.each do |attachment|
      if Attachment.exists?(:id => attachment.id)
        currentAttachment = Attachment.find_by id: attachment.id
        currentAttachment.filename = attachment.filename
        currentAttachment.save!
      else
        begin
          storage = Filesystem.new
          file_id_filename = attachment.id + attachment.filename
          storage.move_from_temp_to_storage(user, file_id_filename, true)

          newAttachment = Attachment.new

          newAttachment.identifier = file_id_filename
          newAttachment.filename = attachment.filename
          newAttachment.container_id = parent_container_id
          newAttachment.save!
        rescue Exception => e
          puts "ERROR: Can not create attachment: " + e.message
        end
      end
    end
  end

  def self.delete_containers_and_attachments(user, container)
    attachments = Attachment.where(container_id: container.id)

    storage = Filesystem.new
    attachments.each do |attach|
      storage.delete(user, attach)
    end
    Attachment.where(container_id: container.id).destroy_all

    if container.children.length > 0
      container.children.each do |tmp|
        delete_containers_and_attachments(user, tmp)
      end
    end
    Container.where(id: container.id).destroy_all
  end

end #module
