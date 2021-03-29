# == Schema Information
#
# Table name: datasets
#
#  id               :integer          not null, primary key
#  dataset_klass_id :integer
#  element_type     :string
#  element_id       :integer
#  properties       :jsonb
#  created_at       :datetime         not null
#  updated_at       :datetime
#

class Dataset < ActiveRecord::Base
  belongs_to :dataset_klass
  belongs_to :element, polymorphic: true
end
