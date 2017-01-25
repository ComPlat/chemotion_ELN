module BrukerNMR
  extend ActiveSupport::Concern

  included do
    before_create :create_analyses_codes
    before_update :create_analyses_codes
  end

  def create_analyses_codes
    return if analyses.empty? || !analyses_changed?

    # update dump
    new_analyses = analyses.each do |a|
      if analysis_needs_code?(a)
        if analysis_is_nmr?(a)
          bar_code_bruker = Chemotion::CodeCreator.create_bar_code_bruker
          a["bar_code_bruker"] = bar_code_bruker
          CodeLog.create(code_type: "bar_code_bruker", value: bar_code_bruker, source: "analysis", source_id: self.id, analysis_id: a["id"])
        else
          bar_code = Chemotion::CodeCreator.create_bar_code
          qr_code = Chemotion::CodeCreator.create_qr_code
          a["bar_code"] = bar_code
          a["qr_code"] = qr_code
          CodeLog.create(code_type: "bar_code", value: bar_code, source: "analysis", source_id: self.id, analysis_id: a["id"])
          CodeLog.create(code_type: "qr_code", value: qr_code, source: "analysis", source_id: self.id, analysis_id: a["id"])
        end
      end
    end

    self.analyses = new_analyses
  end

  private

    def analyses_changed?
      self.changes.key?(:analyses_dump)
    end

    def analysis_needs_code?(a)
      a["bar_code"].nil? && a["qr_code"].nil? && a["bar_code_bruker"].nil?
    end

    def analysis_is_nmr?(a)
      a["kind"].include?("NMR")
    end
end
