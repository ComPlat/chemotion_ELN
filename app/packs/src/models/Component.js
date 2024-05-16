/* eslint-disable no-underscore-dangle */
/* eslint-disable camelcase */
import React from 'react';
import _ from 'lodash';
import Sample from 'src/models/Sample';


export default class Component extends Sample {
    constructor(props) {
        super(props);
    }

    setAmount(amount, totalVolume) {
        if (!amount.unit || isNaN(amount.value)) { return }

        if (amount.unit === 'l') {
            this.amount_value = amount.value;
            this.amount_unit = amount.unit;
            this.concn = this.amount_value * this.starting_molarity_value / totalVolume;
            this.molarity_value = this.concn;
        } else if (amount.unit === 'g') {
            this.amount_value = amount.value;
            this.amount_unit = amount.unit;
            if (totalVolume && this.amount_mol) {
                this.concn = this.amount_mol / totalVolume;
                this.molarity_value = this.concn;
            }

            if (this.amount_value === 0) {
                this.molarity_value = this.concn = 0
            }
        }
    }

    setMolarity(amount, totalVolume, concType) {
        if (!amount.unit || isNaN(amount.value) || amount.unit !== 'mol/l') { return }

        if (concType !== 'startingConc') {
            this.concn = amount.value;
            this.molarity_value = amount.value;
            this.molarity_unit = amount.unit
        } else {
            this.starting_molarity_value = amount.value;
            this.starting_molarity_unit = amount.unit;
        }
        if (totalVolume && this.concn && this.starting_molarity_value) {
            this.amount_value = this.concn * totalVolume / this.starting_molarity_value;
            this.amount_unit = 'l';
        } else if (!this.concn && this.amount_l > 0 && this.starting_molarity_value) {
            this.concn = this.amount_l * this.starting_molarity_value / totalVolume;
            this.molarity_value = this.concn;
        } else if (this.material_group === 'solid' && this.concn && totalVolume) {
            const mols = this.concn * totalVolume
            this.amount_value = this.molecule_molecular_weight * mols;
            this.amount_unit =  'g'
        } else if (this.concn === 0) {
            this.amount_value = 0;
        }
    }

    updateRatio(newRatio, materialGroup, adjustAmount, totalVolume) {
        if (this.equivalent === newRatio) { return }

        const newMols = (newRatio / this.equivalent) * this.amount_mol;
        
        this.equivalent = newRatio;

        if (materialGroup === 'liquid') {
            if (adjustAmount) {
                const concentration = this.molarity_value;
                const updatedVolume = newMols / concentration;
                this.amount_value = updatedVolume;
                this.amount_unit = 'l'
            } else {
                const concentration = newMols / this.amount_l;
                this.concn = concentration;
                this.molarity_value = concentration;
                this.molarity_unit = 'M'
            }
        } else if (materialGroup === 'solid') {
                const mass = newMols * this.molecule_molecular_weight;
                this.amount_value = mass;
                this.amount_unit = 'g';

                this.concn = newMols / totalVolume;
                this.molarity_value = this.concn;
        }
    }

    serializeComponent() {
        return {
          id: this.id,
          name: this.name,
          position: this.position,
          component_properties: {
            target_amount_value: this.target_amount_value,
            target_amount_unit: this.target_amount_unit,
            molarity_unit: this.molarity_unit,
            molarity_value: this.molarity_value,
            starting_molarity_value: this.starting_molarity_value,
            starting_molarity_unit: this.starting_molarity_unit,
            molecule_id: this.molecule.id,
            equivalent: this.equivalent,
            parent_id: this.parent_id,
            material_group: this.material_group,
            reference: this.reference,
          }
         }
      }
}