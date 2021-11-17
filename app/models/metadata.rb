# == Schema Information
#
# Table name: metadata
#
#  id            :bigint           not null, primary key
#  collection_id :integer
#  metadata      :jsonb
#  deleted_at    :datetime
#  created_at    :datetime         not null
#  updated_at    :datetime         not null
#

class Metadata < ApplicationRecord
  acts_as_paranoid
  belongs_to :collection
end
