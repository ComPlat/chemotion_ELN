# == Schema Information
#
# Table name: literatures
#
#  id         :integer          not null, primary key
#  title      :string
#  url        :string
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  deleted_at :datetime
#  refs       :jsonb
#  doi        :string
#  isbn       :string
#
# Indexes
#
#  index_literatures_on_deleted_at  (deleted_at)
#

class Literature < ActiveRecord::Base
  acts_as_paranoid
  has_many :literals

  validate :input_present?
  before_save :sanitize_doi, :sanitize_refs

  scope :by_element_attributes_and_cat, ->(id, type, cat) {
    joins(:literals).merge(Literal.by_element_attributes_and_cat(id, type, cat))
  }

  scope :group_by_element, -> {
    select("literatures.*, count(distinct literals.element_id)").group('literatures.id')
  }

  scope :add_user_info, -> {
    joins("inner join users on users.id = literals.user_id")
    .select("literatures.*, literals.id as literal_id, literals.user_id, (users.first_name || chr(32) || users.last_name) as user_name")
  }

  scope :add_element_and_user_info, -> {
    joins(
      <<~SQL
      inner join users on users.id = literals.user_id
      left join samples on literals.element_type = 'Sample' and literals.element_id = samples.id
      left join reactions on literals.element_type = 'Reaction' and literals.element_id = reactions.id
      SQL
    ).select(
      <<~SQL
      literatures.*
      , literals.id as literal_id
      , literals.element_type, literals.element_id
      , literals.user_id, (users.first_name || chr(32) || users.last_name) as user_name
      , coalesce(reactions.short_label, samples.short_label ) as short_label
      , coalesce(reactions.name, samples.name ) as name, samples.external_label
      , coalesce(reactions.updated_at, samples.updated_at) as element_updated_at
      SQL
    )
  }

  def input_present?
    unless %w(doi url title).any? { |attr| self[attr].present? }
      errors.add :base, "At least one (title, doi, url) input should not be blank?"
    end
  end

  # format doi

  private

  def sanitize_doi
    return unless self.doi
    return unless self.doi_changed?
    self.doi.match(/(?:\s*10\.)(\S+)/)
    self.doi = "10.#{$1}" if $1.present?
  end

  def sanitize_refs
    self.refs ||= {}
    bt = self.refs['bibtex']
    self.refs['bibtex'] = bt.gsub(/,\s*,/,',') if bt
  end
end
