class Literature < ActiveRecord::Base
  acts_as_paranoid
  has_many :literals

  validate :input_present?
  before_save :sanitize_doi, :sanitize_refs

  scope :by_element_attributes_and_cat, ->(id, type, cat) {
    joins(:literals).merge(Literal.by_element_attributes_and_cat(id, type, cat))
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
