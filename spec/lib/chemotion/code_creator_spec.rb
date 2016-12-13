require 'rails_helper'

RSpec.describe 'CodeCreator' do
  subject { Chemotion::CodeCreator }

  describe 'code creation' do
    it 'create functions return a string' do
      expect(subject.create_bar_code).to be_a(String)
      expect(subject.create_qr_code).to be_a(String)
    end
  end
end
