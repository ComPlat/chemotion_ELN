require 'rails_helper'

describe 'Report::Docx::ReactionDetail instance' do
  let(:tit)   { 'correct title' }
  let(:sta)   { 'Planned' }
  let(:sol)   { 'correct solvent' }
  let(:des)   { 'correct description' }
  let(:pur)   { '{TLC, Distillation}' }
  let(:rf)    { 'correct tlc_rf' }
  let(:t_sol) { 'correct tlc_solvents' }
  let(:t_des) { 'correct tlc_description' }
  let(:obs)   { 'correct observation' }
  let(:r1)    { create(:reaction, name: tit,
                                  status: sta,
                                  solvent: sol,
                                  description: des,
                                  purification: pur,
                                  rf_value: rf,
                                  tlc_solvents: t_sol,
                                  tlc_description: t_des,
                                  observation: obs) }
  let(:instance) { Report::Docx::ReactionDetail.new(reaction: r1) }

  context '.content' do
    let(:content) { instance.content }

    it "returns a Hash" do
      expect(content.class).to eq(Hash)
    end

    it "has a eps image" do
      expect(content[:image].class).to eq(Sablon::Image::Definition)
      expect(content[:image].name.split('.').last).to eq('eps')
    end

    it "has a correct status" do
      expect(content[:status].name).to include('png')
      expect(content[:status].name).to include(sta.downcase)
    end

    it "has correct content" do
      expect(content[:title]).to eq(tit)
      expect(content[:solvents]).to eq(sol)
      expect(content[:description]).to eq(des)
      expect(content[:tlc_rf]).to eq(rf)
      expect(content[:tlc_solvent]).to eq(t_sol)
      expect(content[:tlc_description]).to eq(t_des)
      expect(content[:observation]).to eq(obs)
      pur.tr('{}', '').split(',').each { |p| expect(content[:purification]).to include(p) }
    end
  end
end
