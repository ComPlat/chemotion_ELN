module ContainerHelper

  def self.update_datamodel(container)
    if container.is_new
      root_container = Container.create(name: "root", container_type: container.containable_type)
    else
      root_container = Container.find_by id: container.id
      root_container.name = "root" #if it is created from client.side
    end
    root_container.save!

    if container.children != nil
      create_or_update_containers(container.children, root_container)
    end

    #root-Container can not contain attachments!!

    return root_container
  end

  def self.create_root_container
    root_con = Container.create(name: "root", container_type: "root")
    root_con.children.create(container_type: "analyses")

    return root_con
  end

private

  def self.create_or_update_containers(children, root_container)
    children.each do |child|
      if !child.is_new
        if child.is_deleted
          delete_containers_and_attachments(child)
        else
          #Update container
          oldcon = Container.find_by id: child.id
          oldcon.name = child.name
          oldcon.container_type = child.container_type
          oldcon.description = child.description

          extended_metadata = child.extended_metadata
          if child.container_type == "analysis"
              extended_metadata["content"] = if extended_metadata.key?("content")
                extended_metadata["content"].to_json
              else
                "{\"ops\":[{\"insert\":\"\"}]}"
              end
          end
          oldcon.extended_metadata = extended_metadata

          oldcon.save!

          create_or_update_attachments(oldcon.id, child.attachments)
          create_or_update_containers(child.children, oldcon)
        end
      end
      if child.is_new
        if !child.is_deleted
          #Create container
          newcon = root_container.children.create(
            name: child.name,
            container_type: child.container_type,
            description: child.description
          )

          extended_metadata = child.extended_metadata
          if child.container_type == "analysis"
              extended_metadata["content"] = if extended_metadata.key?("content")
                extended_metadata["content"].to_json
              else
                "{\"ops\":[{\"insert\":\"\"}]}"
              end
          end
          newcon.extended_metadata = extended_metadata

          newcon.save!

          create_or_update_attachments(newcon.id, child.attachments)
          create_or_update_containers(child.children, newcon)
        end
      end
    end
  end

  def self.create_or_update_attachments(container_id, attachments)
    attachments.each do |att|
      if att.is_new
        attachment = Attachment.where(storage: 'tmp', key: att.id).last
      else
        attachment = Attachment.where( id: att.id).last
      end
      if attachment
        return  attachment.destroy! if att.is_deleted
        attachment.update!(container_id: container_id)
        #NB 2step update because moving store should be delayed job
        attachment.update!(storage: 'local' ) if att.is_new
      end
    end
  end

  def self.delete_containers_and_attachments(container)
    Attachment.where(container_id: container.id).destroy_all

    if container.children.length > 0
      container.children.each do |tmp|
        delete_containers_and_attachments(tmp)
      end
    end
    Container.where(id: container.id).destroy_all
  end

end #module
