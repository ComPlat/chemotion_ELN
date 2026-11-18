class AddIndexPersonalTextTemplate < ActiveRecord::Migration[6.1]
  def change
    add_index :text_templates, %i[user_id name], unique: true,
              where: "type = 'PersonalTextTemplate'",
              name: 'index_personal_text_template'
  end
end
