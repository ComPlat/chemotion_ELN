# == Schema Information
#
# Table name: literatures
#
#  id         :integer          not null, primary key
#  deleted_at :datetime
#  doi        :string
#  isbn       :string
#  refs       :jsonb
#  title      :string
#  url        :string
#  created_at :datetime         not null
#  updated_at :datetime         not null
#
# Indexes
#
#  index_literatures_on_deleted_at  (deleted_at)
#

class Literature < ApplicationRecord
  has_logidze
  acts_as_paranoid
  has_many :literals

  validate :input_present?
  before_save :sanitize_doi, :sanitize_refs

  scope :by_element_attributes_and_cat, lambda { |id, type, cat|
    joins(:literals).merge(Literal.by_element_attributes_and_cat(id, type, cat))
  }

  scope :group_by_element, lambda {
    select('literatures.*, count(distinct literals.element_id)').group('literatures.id')
  }

  scope :with_user_info, lambda {
    joins('inner join users on users.id = literals.user_id')
      .select('literatures.*, literals.id as literal_id, literals.user_id, literals.litype, (users.first_name || chr(32) || users.last_name) as user_name')
  }

  scope :with_element_and_user_info, lambda {
    joins(
      <<~SQL,
        inner join users on users.id = literals.user_id
        left join samples on literals.element_type = 'Sample' and literals.element_id = samples.id
        left join reactions on literals.element_type = 'Reaction' and literals.element_id = reactions.id
      SQL
    ).select(
      <<~SQL,
        literatures.*
        , literals.id as literal_id
        , literals.element_type, literals.element_id, literals.litype
        , literals.user_id, (users.first_name || chr(32) || users.last_name) as user_name
        , coalesce(reactions.short_label, samples.short_label ) as short_label
        , coalesce(reactions.name, samples.name ) as name, samples.external_label
        , coalesce(reactions.updated_at, samples.updated_at) as element_updated_at
      SQL
    )
  }

  def input_present?
    return if %w[doi url title].any? { |attr| self[attr].present? }

    errors.add :base, 'At least one (title, doi, url) input should not be blank?'
  end

  # format doi

  private

  def sanitize_doi
    return unless doi
    return unless doi_changed?

    doi =~ /(?:\s*10\.)(\S+)/
    self.doi = "10.#{::Regexp.last_match(1)}" if ::Regexp.last_match(1).present?
  end

  def sanitize_refs
    self.refs ||= {}
    bt = self.refs['bibtex']
    self.refs['bibtex'] = bt.gsub(/,\s*,/, ',') if bt
  end
end
