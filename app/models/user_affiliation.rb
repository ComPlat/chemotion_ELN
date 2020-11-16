# == Schema Information
#
# Table name: user_affiliations
#
#  id             :integer          not null, primary key
#  user_id        :integer
#  affiliation_id :integer
#  created_at     :datetime
#  updated_at     :datetime
#  deleted_at     :datetime
#  from           :date
#  to             :date
#  main           :boolean
#

class UserAffiliation < ApplicationRecord
  acts_as_paranoid
  belongs_to :user
  belongs_to :affiliation

  attr_accessor :from_month, :to_month
  validate :from_to, on: :update

  private

  def from_to
    %w(from to).each do |month|
      date = self.send(month + '_month')
      if date && date.match(/-?\d{1,4}-\d{2}/)
        self[month] = Date.strptime(date, '%Y-%m')
      end
    end
    if to && from && to < from
      errors.add(:to, 'to-date should be later than from-date')
    end
  end
end
