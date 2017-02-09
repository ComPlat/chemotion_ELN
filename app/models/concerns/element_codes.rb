module ElementCodes
  extend ActiveSupport::Concern

  included do
    before_create :create_bar_and_qr_code
    after_create :create_bar_and_qr_code_logs
    after_destroy :destroy_code_logs
  end

  private

    def create_bar_and_qr_code
      self.bar_code = Chemotion::CodeCreator.create_bar_code
      self.qr_code = Chemotion::CodeCreator.create_qr_code
    end

    def create_bar_and_qr_code_logs
      source = self.class.name.demodulize.underscore

      CodeLog.create(code_type: "bar_code", value: self.bar_code, source: source, source_id: self.id)
      CodeLog.create(code_type: "qr_code", value: self.qr_code, source: source, source_id: self.id)
    end

    def destroy_code_logs
      CodeLog.find_by(value: self.bar_code, code_type: "bar_code").destroy
      CodeLog.find_by(value: self.qr_code, code_type: "qr_code").destroy
    end
end
