# frozen_string_literal: true

# == Schema Information
#
# Table name: devices
#
#  id                                :bigint           not null, primary key
#  account_active                    :boolean          default(FALSE)
#  datacollector_authentication      :string
#  datacollector_dir                 :string
#  datacollector_host                :string
#  datacollector_key_name            :string
#  datacollector_method              :string
#  datacollector_number_of_files     :string
#  datacollector_user                :string
#  datacollector_user_level_selected :boolean          default(FALSE)
#  deleted_at                        :datetime
#  email                             :string
#  first_name                        :string
#  last_name                         :string
#  name                              :string
#  name_abbreviation                 :string
#  novnc_password                    :string
#  novnc_target                      :string
#  novnc_token                       :string
#  serial_number                     :string
#  verification_status               :string           default("none")
#  visibility                        :boolean          default(FALSE)
#  created_at                        :datetime         not null
#  updated_at                        :datetime         not null
#
# Indexes
#
#  index_devices_on_deleted_at         (deleted_at)
#  index_devices_on_email              (email) UNIQUE
#  index_devices_on_name_abbreviation  (name_abbreviation) UNIQUE WHERE (name_abbreviation IS NOT NULL)
#
require 'rails_helper'

RSpec.describe Device do
  let(:user) { create(:person) }
  let(:device) { create(:device) }
  let(:device_with_novnc) { create(:device, :novnc_settings) }

  before do
    device.people << user
    device.save
  end

  it 'handles user device relationship correctly' do
    expect(device.users).to eq Person.where id: user.id
  end

  describe '.encrypt_novnc_password' do
    before do
      device_with_novnc.update!({ novnc_password: 'testen' })
    end

    it 'returns an encryted novnc password' do
      expect(device_with_novnc.novnc_password).not_to eq('testen')
    end
  end

  describe '.decrypted_novnc_password' do
    before do
      device_with_novnc.update!({ novnc_password: 'testen' })
    end

    it 'returns a decrypted novnc password' do
      expect(device_with_novnc.decrypted_novnc_password).to eq('testen')
    end
  end
end
