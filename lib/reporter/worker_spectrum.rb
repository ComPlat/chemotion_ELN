module Reporter
  class WorkerSpectrum < Worker
    def initialize(args)
      super(args)
      @prd_atts = @report.prd_atts
    end

    private

    def substance
      @substance ||= {
        objs: contents
      }
    end

    def contents
      replace_att_objs
      @contents ||= Spectrum::Document.new(
                      objs: @prd_atts,
                      mol_serials: @mol_serials,
                      font_family: 'Times New Roman'
                    ).convert
    end

    def replace_att_objs
      @prd_atts.map do |prd|
        att_objs = prd['atts'].map do |att|
          kind = att['kind']
          att = Attachment.find(att['id'])
          can_dwnld = if att
            element = att.container.root.containable
            can_read = ElementPolicy.new(@author, element).read?
            can_read && ElementPermissionProxy.new(@author, element, user_ids).read_dataset?
          end
          can_dwnld ? { obj: att, kind: kind } : nil
        end
        prd['atts'] = att_objs
        prd
      end
    end
  end
end
