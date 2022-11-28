class AddAttachmentsCountToContainers < ActiveRecord::Migration[5.2]
  def change
    add_column :containers, :attachments_count, :integer

    Container.all.each do |container|
      Container.reset_counters(container.id, :attachments)
    end
  end
end
