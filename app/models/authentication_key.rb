# == Schema Information
#
# Table name: authentication_keys
#
#  id         :integer          not null, primary key
#  token      :string           not null
#  user_id    :integer
#  ip         :inet
#  fqdn       :string
#  role       :string
#  created_at :datetime
#  updated_at :datetime
#
# Indexes
#
#  index_authentication_keys_on_user_id  (user_id)
#

class AuthenticationKey < ActiveRecord::Base
  belongs_to :user
end
