# == Schema Information
#
# Table name: elements
#
#  id               :integer          not null, primary key
#  name             :string
#  element_klass_id :integer
#  properties       :jsonb
#  created_by       :integer
#  created_at       :datetime
#  updated_at       :datetime
#  deleted_at       :datetime
#

class Element < ActiveRecord::Base
  acts_as_paranoid
  include ElementUIStateScopes
  include Collectable
  include AnalysisCodes
  include Taggable

  scope :by_name, ->(query) { where('name ILIKE ?', "%#{sanitize_sql_like(query)}%") }

  belongs_to :element_klass
  has_many :collections_elements, dependent: :destroy
  has_many :collections, through: :collections_elements

  has_one :container, :as => :containable

  accepts_nested_attributes_for :collections_elements

  def analyses
    self.container ? self.container.analyses : []
  end

end
