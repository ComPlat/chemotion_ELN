# frozen_string_literal: true

# == Schema Information
#
# Table name: users
#
#  id                        :integer          not null, primary key
#  account_active            :boolean
#  allocated_space           :bigint           default(0)
#  confirmation_sent_at      :datetime
#  confirmation_token        :string
#  confirmed_at              :datetime
#  consumed_timestep         :integer
#  counters                  :hstore           not null
#  current_sign_in_at        :datetime
#  current_sign_in_ip        :inet
#  deleted_at                :datetime
#  email                     :string           default(""), not null
#  encrypted_otp_secret      :string
#  encrypted_otp_secret_iv   :string
#  encrypted_otp_secret_salt :string
#  encrypted_password        :string           default(""), not null
#  failed_attempts           :integer          default(0), not null
#  first_name                :string           not null
#  last_name                 :string           not null
#  last_sign_in_at           :datetime
#  last_sign_in_ip           :inet
#  layout                    :hstore           not null
#  locked_at                 :datetime
#  matrix                    :integer          default(0)
#  name                      :string
#  name_abbreviation         :string(12)
#  otp_backup_codes          :string           is an Array
#  otp_required_for_login    :boolean
#  providers                 :jsonb
#  reaction_name_prefix      :string(3)        default("R")
#  remember_created_at       :datetime
#  reset_password_sent_at    :datetime
#  reset_password_token      :string
#  sign_in_count             :integer          default(0), not null
#  type                      :string           default("Person")
#  unconfirmed_email         :string
#  unlock_token              :string
#  used_space                :bigint           default(0)
#  created_at                :datetime         not null
#  updated_at                :datetime         not null
#  selected_device_id        :integer
#
# Indexes
#
#  index_users_on_confirmation_token    (confirmation_token) UNIQUE
#  index_users_on_deleted_at            (deleted_at)
#  index_users_on_email                 (email) UNIQUE
#  index_users_on_name_abbreviation     (name_abbreviation) UNIQUE WHERE (name_abbreviation IS NOT NULL)
#  index_users_on_reset_password_token  (reset_password_token) UNIQUE
#  index_users_on_unlock_token          (unlock_token) UNIQUE
#
require 'rails_helper'

RSpec.describe 'Group', type: :model do
  describe 'creation' do
    let(:group) { create(:group) }

    it 'is possible to create a valid group(user)' do
      expect(group.valid?).to eq true
      expect(group.type).to eq 'Group'
    end

    it 'creates an All collection' do
      expect(group.collections.pluck(:label)).to match_array ['All']
    end
  end

  describe 'association with users' do
    let(:u1) { create(:user) }
    let(:u2) { create(:user) }
    let(:group) { create(:group, users: [u1, u2]) }

    it 'is possible to create a valid group with users' do
      expect(group.valid?).to eq true
      expect(group.type).to eq 'Group'
      expect(group.users).not_to be_empty
      expect(group.users).to match_array [u1, u2]
    end
  end

  describe 'association with admins' do
    let(:p1) { create(:person) }
    let(:p2) { create(:person) }
    let(:group) { create(:group, admins: [p1]) }

    it 'is possible to create a valid group with users' do
      expect(group.valid?).to eq true
      expect(group.admins).not_to be_empty
      expect(group.admins).to match_array [p1]
    end

    it 'a person can be an admin without being a member' do
      group = create(:group, admins: [p1], users: [p2])
      expect(group.administrated_by?(p1)).to be true
      expect(group.users).not_to include(p1)
    end
  end

  describe '#sole_admin?' do
    let(:sole_admin) { create(:person) }
    let(:other_person) { create(:person) }

    context 'with a single admin' do
      let(:group) { create(:group, admins: [sole_admin]) }

      it 'is true for that admin and false for anyone else' do
        expect(group.sole_admin?(sole_admin.id)).to be true
        expect(group.sole_admin?(other_person.id)).to be false
      end
    end

    context 'with more than one admin' do
      let(:group) { create(:group, admins: [sole_admin, other_person]) }

      it 'is false for either admin' do
        expect(group.sole_admin?(sole_admin.id)).to be false
        expect(group.sole_admin?(other_person.id)).to be false
      end
    end
  end
end
