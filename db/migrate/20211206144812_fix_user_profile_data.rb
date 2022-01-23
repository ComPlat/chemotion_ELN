class FixUserProfileData < ActiveRecord::Migration[5.2]
  def change
    Profile.where(data: '{}').find_each { |p| p.update(data: {}) }
  end
end
