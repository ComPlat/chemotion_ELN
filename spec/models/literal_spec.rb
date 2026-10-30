# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Literal do
  describe 'literatures_by_element (the literature column of the export)' do
    let(:sample) { create(:sample) }
    let(:kept) { create(:literature) }
    let(:removed) { create(:literature) }

    def literatures_of(element)
      described_class.connection
                     .select_value("SELECT literatures_by_element('Sample', #{element.id.to_i})")
                     .to_s.split(',').map(&:to_i)
    end

    it 'does not list removed references' do
      create(:literal, literature: kept, element: sample)
      2.times { create(:literal, literature: removed, element: sample).destroy! }

      expect(literatures_of(sample)).to eq [kept.id]
    end
  end
end
