class CreatePartnerApp < ActiveRecord::Migration[5.2]
  def change
    create_table :partner_apps do |t|
      t.string :name
      t.string :url
    end
  end
end
