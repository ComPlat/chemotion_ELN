# frozen_string_literal: true

# == Schema Information
#
# Table name: info_support_links
#
#  id         :bigint           not null, primary key
#  enabled    :boolean          default(TRUE), not null
#  label      :string           not null
#  position   :integer          default(0), not null
#  url        :string           not null
#  created_at :datetime         not null
#  updated_at :datetime         not null
#
RSpec.describe InfoSupportLink, type: :model do
  describe 'validations' do
    it 'requires a label' do
      link = described_class.new(url: 'https://example.org')
      expect(link).not_to be_valid
      expect(link.errors[:label]).to be_present
    end

    it 'requires a url' do
      link = described_class.new(label: 'Local RDM')
      expect(link).not_to be_valid
      expect(link.errors[:url]).to be_present
    end

    it 'rejects urls without http(s) scheme' do
      link = described_class.new(label: 'Bad', url: 'ftp://nope.org')
      expect(link).not_to be_valid
      expect(link.errors[:url]).to be_present
    end

    it 'accepts https urls' do
      link = described_class.new(label: 'Local RDM', url: 'https://rdm.example.org')
      expect(link).to be_valid
    end
  end

  describe 'scopes' do
    let!(:enabled_link) { create(:info_support_link, enabled: true, position: 2) }
    let!(:disabled_link) { create(:info_support_link, enabled: false, position: 1) }
    let!(:other_enabled_link) { create(:info_support_link, enabled: true, position: 1) }

    it '.enabled returns only enabled rows' do
      expect(described_class.enabled).to contain_exactly(enabled_link, other_enabled_link)
      expect(described_class.enabled).not_to include(disabled_link)
    end

    it '.ordered sorts by position then id' do
      ordered = described_class.ordered.to_a
      expect(ordered.index(other_enabled_link)).to be < ordered.index(enabled_link)
    end
  end
end
