class RefactorLiteraturesRemoval < ActiveRecord::Migration[4.2]
  def self.up
    remove_column :literatures, :reaction_id if column_exists? :literatures, :reaction_id
  end

  def self.down
    add_column :literatures, :reaction_id unless column_exists? :literatures, :reaction_id
    Literature.reset_column_information
    Literal.find_each do |lit|
      next unless lit.element_type == 'Reaction'
      r = Reaction.find_by(id: lit.element_id)
      l = Literature.find_by(id: lit.literature_id)
      l.update_column(reaction_id: r.id)
    end
  end
end
