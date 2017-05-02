module ElementCodes
  extend ActiveSupport::Concern

  included do
    after_create :create_code_log
    after_destroy :destroy_code_logs

    def source_class() @source_class||=self.class.name.demodulize.underscore end

    def code_logs
       CodeLog.where(source: source_class).
         where(source_id: id).order(created_at: 'DESC')
    end

    def code_log() code_logs.first end


    # [ "bar_code", "qr_code", "bruker_code"].each do |type|
    #     define_method("#{type}s"){code_logs.where(code_type: type)}
    #     define_method(type){code_logs.where(code_type: type).first}
    # end

    class << self
      def source_class() to_s.demodulize.underscore end

      def code_logs() CodeLog.where(source: source_class) end

      # ["bar_code", "qr_code", "bruker_code"].each do |type|
      #   define_method("#{type}s".to_sym){code_logs.where(code_type: type)}
      # end

    end
  end

  def is_container_but_not_analysis
    source_class == "container" && self.container_type != "analysis"
  end

  def create_code_log
    return if is_container_but_not_analysis
    CodeLog.create(source: source_class, source_id: id)
  end

  def destroy_code_logs
    code_logs.destroy_all
  end



end
