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
