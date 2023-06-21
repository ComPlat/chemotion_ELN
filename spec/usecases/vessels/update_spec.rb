# frozen_string_literal: true

require 'spec_helper'

RSpec.describe Usecases::Vessels::Update do
  describe 'execute!' do
    context 'when data is not valid' do
      it 'error message delivered' do
      end

      it 'original vessel was not changed' do
      end

      it 'original vessel template was not changed' do
      end
    end

    context 'when vessel template was not changed' do
      it 'cell line sample has changed' do
      end

      it 'vessel template has not changed' do
      end
    end

    context 'when vessel template was changed' do
      it 'vessel has changed' do
      end

      it 'vessel template has changed' do
      end
    end
  end
end