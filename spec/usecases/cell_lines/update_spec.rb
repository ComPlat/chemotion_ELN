# frozen_string_literal: true

require 'spec_helper'

RSpec.describe Usecases::CellLines::Update do
  describe 'execute!' do
    context 'when data is not valid' do
      it 'error message delivered' do
      end

      it 'original cell line sample was not changed' do
      end

      it 'original cell line material was not changed' do
      end
    end

    context 'when cell line material was not changed' do
      it 'cell line sample has changed' do
      end

      it 'cell line material has not changed' do
      end
    end

    context 'when cell line material was changed' do
      it 'cell line sample has changed' do
      end

      it 'cell line material has changed' do
      end
    end
  end
end
