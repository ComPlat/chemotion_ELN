# frozen_string_literal: true

require 'rails_helper'

RSpec.describe CelllineSample do
  let(:sample) { create(:cellline_sample) }

  context 'when empty cell line sample created' do
    it 'root container exists' do
      expect(sample.container).not_to be_nil
    end
  end
end
