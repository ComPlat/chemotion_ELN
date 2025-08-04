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
require 'rails_helper'

RSpec.describe 'Person', type: :model do
  describe 'creation' do
    let(:person) { create(:person) }

    it 'is possible to create a valid user-person' do
      expect(person.valid?).to eq true
      expect(person.type).to eq 'Person'
    end

    it 'creates an All & chemotion-repository.net collection' do
      expect(person.collections.pluck(:label)).to match_array ['All', 'chemotion-repository.net']
    end

    context 'when several groups contain the person,' do
      # let(:user) { create(:user) }
      let(:g1) { build(:group, users: [person]) }
      let(:g2) { build(:group, users: [person]) }

      before do
        g1.save!
        g2.save!
      end

      it 'has many groups' do
        expect(person.groups).not_to be_empty
        expect(person.groups).to match_array [g1, g2]
      end
    end

    context 'the user administrates several groups' do
      let(:p2) { create(:person) }
      let(:g1) { build(:group, admins: [person]) }
      let(:g2) { build(:group, admins: [person, p2]) }

      before do
        g1.save!
        g2.save!
      end

      it 'has many administrated_accounts' do
        expect(person.administrated_accounts).not_to be_empty
        expect(person.administrated_accounts).to match_array [g1, g2]
      end
    end

    context 'the person is in groups with shared collections' do
      let(:g1) { build(:group, users: [person]) }
      let(:c1) { build(:collection, user: g1) }

      before do
        g1.save!
        c1.save!
      end

      it 'has (unlocked) collections through the group' do
        expect(person.group_collections).not_to be_empty
        expect(person.group_collections).to match_array [c1]
        expect(person.all_collections.unlocked).to match_array [c1]
      end
    end
  end
end
