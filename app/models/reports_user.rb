# == Schema Information
#
# Table name: reports_users
#
#  id            :integer          not null, primary key
#  user_id       :integer
#  report_id     :integer
#  downloaded_at :datetime
#  deleted_at    :datetime
#  created_at    :datetime         not null
#  updated_at    :datetime         not null
#
# Indexes
#
#  index_reports_users_on_deleted_at  (deleted_at)
#  index_reports_users_on_report_id   (report_id)
#  index_reports_users_on_user_id     (user_id)
#

class ReportsUser < ApplicationRecord
  acts_as_paranoid

  belongs_to :user, dependent: :destroy
  belongs_to :report, dependent: :destroy
end
