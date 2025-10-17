# frozen_string_literal: true

module Entities
  class PostTranslationalModificationsEntity < ApplicationEntity
    expose! :id
    expose! :phosphorylation_enabled
    expose! :phosphorylation_ser_enabled
    expose! :phosphorylation_ser_details
    expose! :phosphorylation_thr_enabled
    expose! :phosphorylation_thr_details
    expose! :phosphorylation_tyr_enabled
    expose! :phosphorylation_tyr_details

    expose! :glycosylation_enabled
    expose! :glycosylation_n_linked_asn_enabled
    expose! :glycosylation_n_linked_asn_details
    expose! :glycosylation_o_linked_lys_enabled
    expose! :glycosylation_o_linked_lys_details
    expose! :glycosylation_o_linked_ser_enabled
    expose! :glycosylation_o_linked_ser_details
    expose! :glycosylation_o_linked_thr_enabled
    expose! :glycosylation_o_linked_thr_details

    expose! :acetylation_enabled
    expose! :acetylation_lysin_number

    expose! :hydroxylation_enabled
    expose! :hydroxylation_lys_enabled
    expose! :hydroxylation_lys_details
    expose! :hydroxylation_pro_enabled
    expose! :hydroxylation_pro_details

    expose! :methylation_enabled
    expose! :methylation_arg_enabled
    expose! :methylation_arg_details
    expose! :methylation_glu_enabled
    expose! :methylation_glu_details
    expose! :methylation_lys_enabled
    expose! :methylation_lys_details

    expose! :other_modifications_enabled
    expose! :other_modifications_details
    
    expose! :deleted_at
    expose_timestamps
  end
end
