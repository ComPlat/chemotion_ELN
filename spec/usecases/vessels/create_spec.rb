# frozen_string_literal: true

require 'spec_helper'

RSpec.describe Usecases::Vessels::Create do
  describe 'execute!' do
    context 'when data is not valid' do
      it 'error message' do
      end

      it 'no vessel object was saved' do
      end
    end

    context 'when vessel template already exists' do
      it 'vessel was saved' do
      end

      it 'vessel template not saved' do
      end
    end

    context 'when vessel template does not exist' do
      it 'vessel was saved' do
      end

      it 'new vessel template was saved' do
      end
    end
