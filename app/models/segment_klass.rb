# == Schema Information
#
# Table name: segment_klasses
#
#  id                  :integer          not null, primary key
#  element_klass_id    :integer
#  label               :string           not null
#  desc                :string
#  properties_template :jsonb
#  is_active           :boolean          default(TRUE), not null
#  place               :integer          default(100), not null
#  created_by          :integer
#  created_at          :datetime
#  updated_at          :datetime
#  deleted_at          :datetime
#  uuid                :string
#  properties_release  :jsonb
#  released_at         :datetime
#

class SegmentKlass < ApplicationRecord
  acts_as_paranoid
  include GenericKlassRevisions
  belongs_to :element_klass
  has_many :segments, dependent: :destroy
  has_many :segment_klasses_revisions, dependent: :destroy

  def self.gen_klasses_json
    klasses = where(is_active: true)&.pluck(:name) || []
  rescue ActiveRecord::StatementInvalid, PG::ConnectionBad, PG::UndefinedTable
    klasses = []
  ensure
    File.write(
      Rails.root.join('config', 'segment_klass.json'),
      klasses&.to_json || []
    )
  end

end
