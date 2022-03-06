# frozen_string_literal: true

# == Schema Information
#
# Table name: comments
#
#  id               :bigint           not null, primary key
#  content          :string
#  created_by       :integer          not null
#  section          :string
#  commentable_id   :integer
#  commentable_type :string
#  created_at       :datetime         not null
#  updated_at       :datetime         not null
#  status           :string           default("Pending")
#  submitter        :string
#
# Indexes
#
#  index_comment_on_user                                  (created_by)
#  index_comments_on_commentable_type_and_commentable_id  (commentable_type,commentable_id)
#  index_comments_on_section                              (section)
#

class Comment < ActiveRecord::Base
  enum sample_section: {
    properties: 'sample_properties',
    analyses: 'sample_analyses',
    qc_curation: 'sample_qc_curation',
    results: 'sample_results'
  }, _prefix: true

  enum reaction_section: {
    scheme: 'scheme',
    properties: 'properties',
    analyses: 'analyses',
    green_chemistry: 'green_chemistry'
  }, _prefix: true

  belongs_to :commentable, polymorphic: true

  validates :commentable, :section, :status, presence: true

  scope :pending, -> { where(status: 'Pending') }
  scope :resolved, -> { where(status: 'Resolved') }

  def resolved?
    status.eql? 'Resolved'
  end
end
