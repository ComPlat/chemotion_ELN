class ConvertTemplateToProfile < ActiveRecord::Migration
  class User < ActiveRecord::Base
    has_one :profile
  end

  class Profile < ActiveRecord::Base
    belongs_to :user
  end
 
  def up
    if column_exists?(:users, :is_templates_moderator)
	    User.where(type: 'Person').joins(:profile).find_each do |u|
        profile = u.profile
	next unless profile
        data = profile.data || {}
        next if data['is_templates_moderator'].present?
        data['is_templates_moderator'] = u.is_templates_moderator || false
        profile.update_columns(data: data)
      end
      remove_column(:users, :is_templates_moderator)
    end
  end

  def down
    add_column(:users, :is_templates_moderator, :boolean, default: false) unless column_exists?(:users, :is_templates_moderator)
  end
end
