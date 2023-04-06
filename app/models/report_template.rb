# frozen_string_literal: true

# == Schema Information
#
# Table name: report_templates
#
#  id            :integer          not null, primary key
#  name          :string           not null
#  report_type   :string           not null
#  created_at    :datetime         not null
#  updated_at    :datetime         not null
#  attachment_id :integer
#
# Indexes
#
#  index_report_templates_on_attachment_id  (attachment_id)
#
# Foreign Keys
#
#  fk_rails_...  (attachment_id => attachments.id)
#

class ReportTemplate < ApplicationRecord
  REPORT_TYPES = %w[
    standard
    spectrum
    supporting_information
    supporting_information_std_rxn
    rxn_list_xlsx
    rxn_list_csv
    rxn_list_html
  ].freeze

  belongs_to :attachment, foreign_key: :attachment_id, class_name: 'Attachment', dependent: :destroy, optional: true
  accepts_nested_attributes_for :attachment

  validates :name, :report_type, presence: true
end
