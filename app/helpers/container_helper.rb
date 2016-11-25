module ContainerHelper

  def self.update_datamodel(user, container)
    if !container.is_new #Container.exists?(id: container.id)
      root_container = Container.find_by id: container.id
      root_container.name = "root" #if it is created from client.side
    else
      root_container = Container.new
      root_container.name = "root"
      root_container.container_type = container.container_type
    end
    root_container.save!

    create_or_update_containers(user, container.children, root_container)

    return root_container
  end

  def self.export_datamodel(user, container)

  end

  def self.create_root_container
    root_con = Container.new
    root_con.name = "root"
    root_con.container_type = "root"
    root_con.save!

    analyses_con = Container.create! :container_type => "analyses", :parent => root_con

    return root_con
  end

private
  def self.read_Attachments(user, folder, container)
    path = File.join(folder, container.name) #wenn leer neue namen

    container.attachments.each do |attachment|
    end

    container.children.each do |child|
      read_Attachments(user, path, child)
    end

  end

  def self.create_or_update_containers(user, children, root_container)
    children.each do |child|
      if !child.is_new #Container.exists?(id: child.id)
        if child.is_deleted
          delete_containers_and_attachments(user, child)
        else
          #Update container
          oldcon = Container.find_by id: child.id
          oldcon.name = child.name
          oldcon.container_type = child.container_type
          oldcon.description = child.description
          oldcon.extended_metadata = child.extended_metadata

          oldcon.save!

          create_or_update_attachments(user, oldcon.id, child.attachments)
          create_or_update_containers(user, child.children, oldcon)
        end
      else
        if !child.is_deleted
          #Create container
          newcon = Container.create! :name => child.name, :parent => root_container
          newcon.container_type = child.container_type
          newcon.description = child.description
          newcon.extended_metadata = child.extended_metadata

          newcon.save!

          create_or_update_attachments(user, newcon.id, child.attachments)
          create_or_update_containers(user, child.children, newcon)
        end
      end
    end
  end

  def self.create_or_update_attachments(user, parent_container_id, attachments)
    attachments.each do |attachment|
      if !attachment.is_new #Attachment.exists?(id: attachment.id)
        if !attachment.is_deleted
          #update
          currentAttachment = Attachment.find_by id: attachment.id
          currentAttachment.filename = attachment.filename
          currentAttachment.save!
        else
          #delete
          storage = Filesystem.new
          storage.delete(user, attachment)
          Attachment.where(id: attachment.id).destroy_all
        end
      else
        if !attachment.is_deleted
          #create
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
