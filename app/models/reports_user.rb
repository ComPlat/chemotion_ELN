class ReportsUser < ActiveRecord::Base
  acts_as_paranoid

  belongs_to :user, dependent: :destroy
  belongs_to :report, dependent: :destroy
end
