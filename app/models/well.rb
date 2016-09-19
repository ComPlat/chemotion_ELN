class Well < ActiveRecord::Base
  acts_as_paranoid
  belongs_to :wellplate
  belongs_to :sample

  def self.get_samples_in_wellplates(wellplate_ids)
    self.where(wellplate_id: wellplate_ids).pluck(:sample_id).compact.uniq
  end
end
