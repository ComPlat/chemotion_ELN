# frozen_string_literal: true

# == Schema Information
#
# Table name: users
#
#  id                     :integer          not null, primary key
#  account_active         :boolean
#  allocated_space        :bigint           default(0)
#  confirmation_sent_at   :datetime
#  confirmation_token     :string
#  confirmed_at           :datetime
#  counters               :hstore           not null
#  current_sign_in_at     :datetime
#  current_sign_in_ip     :inet
#  deleted_at             :datetime
#  email                  :string           default(""), not null
#  encrypted_password     :string           default(""), not null
#  failed_attempts        :integer          default(0), not null
#  first_name             :string           not null
#  jti                    :string
#  last_name              :string           not null
#  last_sign_in_at        :datetime
#  last_sign_in_ip        :inet
#  layout                 :hstore           not null
#  locked_at              :datetime
#  matrix                 :integer          default(0)
#  name                   :string
#  name_abbreviation      :string(12)
#  providers              :jsonb
#  reaction_name_prefix   :string(3)        default("R")
#  remember_created_at    :datetime
#  reset_password_sent_at :datetime
#  reset_password_token   :string
#  sign_in_count          :integer          default(0), not null
#  type                   :string           default("Person")
#  unconfirmed_email      :string
#  unlock_token           :string
#  used_space             :bigint           default(0)
#  created_at             :datetime         not null
#  updated_at             :datetime         not null
#  selected_device_id     :integer
#
# Indexes
#
#  index_users_on_confirmation_token    (confirmation_token) UNIQUE
#  index_users_on_deleted_at            (deleted_at)
#  index_users_on_email                 (email) UNIQUE
#  index_users_on_jti                   (jti)
#  index_users_on_name_abbreviation     (name_abbreviation) UNIQUE WHERE (name_abbreviation IS NOT NULL)
#  index_users_on_reset_password_token  (reset_password_token) UNIQUE
#  index_users_on_unlock_token          (unlock_token) UNIQUE
#

module ReactionProcessEditor
  class ApiUser < ::User
  end
end
