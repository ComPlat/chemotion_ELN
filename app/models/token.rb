# == Schema Information
#
# Table name: tokens
#
#  id            :bigint           not null, primary key
#  token         :string
#  refresh_token :string
#  client_id     :string
#  client_name   :string
#  created_at    :datetime
#  updated_at    :datetime
#  user_id       :bigint
#
# Indexes
#
#  index_tokens_on_user_id  (user_id)
#
# Foreign Keys
#
#  fk_rails_...  (user_id => users.id)
#


class Token < ApplicationRecord
    belongs_to :user
end
