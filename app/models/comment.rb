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
#  resolver_name    :string
#
# Indexes
#
#  index_comment_on_user                                  (created_by)
#  index_comments_on_commentable_type_and_commentable_id  (commentable_type,commentable_id)
#  index_comments_on_section                              (section)
#

class Comment < ActiveRecord::Base
  COMMENTABLE_TYPE = %w[Sample Reaction Screen Wellplate ResearchPlan].freeze

  enum sample_section: {
    properties: 'sample_properties',
    analyses: 'sample_analyses',
    qc_curation: 'sample_qc_curation',
    results: 'sample_results',
    references: 'sample_references'
  }, _prefix: true

  enum reaction_section: {
    scheme: 'reaction_scheme',
    properties: 'reaction_properties',
    references: 'reaction_references',
    analyses: 'reaction_analyses',
    green_chemistry: 'reaction_green_chemistry'
  }, _prefix: true

  enum wellplate_section: {
    properties: 'wellplate_properties',
    analyses: 'wellplate_analyses',
    designer: 'wellplate_designer',
    list: 'wellplate_list'
  }, _prefix: true

  enum screen_section: {
    properties: 'screen_properties',
    analyses: 'screen_analyses'
  }, _prefix: true

  enum research_plan_section: {
    properties: 'research_plan_research_plan',
    analyses: 'research_plan_analyses',
    attachments: 'research_plan_attachments',
    references: 'research_plan_references',
    metadata: 'research_plan_metadata'
  }, _prefix: true

  enum header_section: {
    sample: 'sample_header',
    reaction: 'reaction_header',
    wellplate: 'wellplate_header',
    screen: 'screen_header',
    research_plan: 'research_plan_header'
  }, _prefix: true

  belongs_to :commentable, polymorphic: true

  validates :commentable, :section, :status, presence: true

  scope :pending, -> { where(status: 'Pending') }
  scope :resolved, -> { where(status: 'Resolved') }

  def resolved?
    status.eql? 'Resolved'
  end
end
