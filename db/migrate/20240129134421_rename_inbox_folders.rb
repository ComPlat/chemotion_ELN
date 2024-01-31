# frozen_string_literal: true

class RenameInboxFolders < ActiveRecord::Migration[6.1]
  def change
    Container.where("container_type ilike 'sender_%'")
             .find_each do |inbox|
               device_name = device_name_from_container(inbox)
               next unless device_name

               inbox.update_columns(name: device_name)
             end
  end

  private

  def device_id_from_container(container)
    container.container_type.split('_').last.to_i
  end

  def device_name_from_container(container)
    device_id = device_id_from_container(container)
    Device.find(device_id)&.name
  rescue ActiveRecord::RecordNotFound
    nil
  end
end
