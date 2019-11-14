# == Schema Information
#
# Table name: profiles
#
#  id                 :integer          not null, primary key
#  show_external_name :boolean          default(FALSE)
#  user_id            :integer          not null
#  deleted_at         :datetime
#  created_at         :datetime         not null
#  updated_at         :datetime         not null
#  data               :jsonb
#  curation           :integer          default(2)
#
# Indexes
#
#  index_profiles_on_deleted_at  (deleted_at)
#  index_profiles_on_user_id     (user_id)
#

class Profile < ActiveRecord::Base
  acts_as_paranoid

  belongs_to :user

  scope :novnc, -> { where("\"data\"->>'novnc' is distinct from null") }

  def computed_props
    data&.dig('computed_props')
  end

  def enable_computed_props
    if data.nil?
      self.data = { computed_props: { enable: true } }
    else
      data['computed_props'] = {} if data['computed_props'].nil?
      data['computed_props']['enable'] = true
    end

    save!
  end

  def disabled_computed_props
    if data.nil?
      self.data = { computed_props: { enable: false } }
    else
      data['computed_props'] = {} if data['computed_props'].nil?
      data['computed_props']['enable'] = false
    end

    save!
  end
end
