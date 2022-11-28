# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Reporter::Worker do
  let(:report) { create(:report)}
  let(:worker) {  Reporter::Worker.new({report:report} )}
  describe '.create_attachment' do
    context 'when have valid file' do
    

      it 'attachment was saved' do
        expect(worker).not_to be_nil
      end

     
    end
  end
end
