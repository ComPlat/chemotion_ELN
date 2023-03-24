# == Schema Information
#
# Table name: vessels
#
#  id          :bigint           not null, primary key
#  user_id     :integer
#  name        :string
#  created_by  :integer
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#  deleted_at  :datetime
#  vessel_type :string
#  material    :string
#  volume      :float
#  description :text
#  short_label :string
#
class Vessel < ApplicationRecord
end
