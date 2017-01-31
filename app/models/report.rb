class Report < ActiveRecord::Base
  acts_as_paranoid

  serialize :configs, Hash
  serialize :sample_settings, Hash
  serialize :reaction_settings, Hash
  serialize :objects, Array

  has_many :reports_users
  has_many :users, through: :reports_users

  default_scope { includes(:reports_users) }

  def create_docx
    Reporter::Worker.new(report: self).process
  end
  handle_asynchronously :create_docx
end
