# frozen_string_literal: true

module Reporter
  class WorkerSpectrum < Worker
    def initialize(args)
      super(args)
      @prd_atts = @report.prd_atts
    end

    private

    def substance
      @substance ||= {
        objs: contents,
      }
    end

    def contents
      product_attrs = extract_product_attrs(@objs)
      replace_att_objs(product_attrs)
      @contents ||= Spectrum::Document.new(
                      objs: product_attrs,
                      mol_serials: @mol_serials,
                      font_family: 'Times New Roman',
                    ).convert
    end

    def extract_product_attrs(objects)
      product_attrs = []
      objects.map do |obj|
        product_attrs << extract_products_attrs(obj) if obj[:role] != 'gp'
      end
      product_attrs
    end

    def extract_products_attrs(object)
      target_object = {}
      if object[:type] == 'reaction'
        object[:products].map do |prod|
          target_object[:prdId] = prod[:id]
          target_object[:iupac_name] = prod[:molecule][:iupac_name]
          target_object[:sum_formular] = prod[:molecule][:sum_formular]
          target_object[:molId] = prod[:molecule][:id]
          target_object[:showedName] = prod[:showed_name]
          target_object[:atts] = extract_attributes(prod)
        end
      end
      target_object
    end

    def extract_attributes(product)
      atts = []
      product[:container][:children][0][:children].map do |container|
        is_report = container[:extended_metadata][:report]
        return nil unless is_report

        kind = container[:extended_metadata][:kind]
        container[:children].map do |analysis|
          analysis[:attachments].map do |attach|
            attach[:kind] = kind
            atts << attach
          end
        end
      end
      atts
    end

    def replace_att_objs(product_attrs)
      product_attrs.map do |prd|
        att_objs = prd[:atts].map do |att|
          kind = att[:kind]
          att = Attachment.find(att[:id])
          can_dwnld = if att
                        element = att.container.root.containable
                        can_read = ElementPolicy.new(@author, element).read?
                        can_read && ElementPermissionProxy.new(@author, element, user_ids).read_dataset?
                      end
          can_dwnld ? { obj: att, kind: kind } : nil
        end
        prd[:atts] = att_objs
        prd
      end
    end
  end
end
