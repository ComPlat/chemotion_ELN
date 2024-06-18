/* eslint-disable no-underscore-dangle */
/* eslint-disable camelcase */
import React from 'react';
import _ from 'lodash';
import Sample from 'src/models/Sample';


export default class Component extends Sample {
    constructor(props) {
        super(props);
    }

    get has_density() {
        return this.density > 0 && this.starting_molarity_value === 0;
    }

    get amount_mol() {
        return this._amount_mol
    }

    set amount_mol(amount_mol) {
        this._amount_mol = amount_mol;
    }

    get amount_g() {
        return this._amount_g;
    }
    set amount_g(amount_g) {
        return this._amount_g = amount_g;
    }

    get amount_l() {
        return this._amount_l
    }
    set amount_l(amount_l) {
        return this._amount_l = amount_l;
    }

    setAmount(amount, totalVolume) {
        if (!amount.unit || isNaN(amount.value)) { return }
        if (this.density && this.density > 0) {
            this.setAmountDensity(amount, totalVolume)
        } else {
            this.setAmountConc(amount, totalVolume)
        }
    }

    setAmountDensity(amount, totalVolume) {
        this.amount_l = amount.value;
        this.starting_molarity_value = 0;
        const purity = this.purity || 1.0;
        if (this.material_group === 'liquid') {
            this.amount_g = (this.amount_l * 1000) * this.density;
            this.amount_mol = (this.amount_g * purity) / this.molecule_molecular_weight;
            this.molarity_value = this.concn = this.amount_mol / (totalVolume * purity);
        }
    }

    setAmountConc(amount, totalVolume) {
        const purity = this.purity || 1.0;
        if (amount.unit === 'l') {
            this.amount_l = amount.value;
            this.amount_mol = this.starting_molarity_value * this.amount_l * purity
            this.concn = this.molarity_value = this.amount_mol / (totalVolume * purity);
            this.molarity_unit = 'M';
        } else if (amount.unit === 'g') {
            this.amount_g = amount.value;
            this.amount_mol = (this.amount_g * purity) / this.molecule_molecular_weight;
            if (totalVolume) {
                this.molarity_value = this.concn = this.amount_mol / (totalVolume * purity);
                this.molarity_unit = 'M';
            }

            if (this.amount_l === 0 || this.amount_g === 0) {
                this.molarity_value = this.concn = 0;
            }
        }
    }

    setConc(amount, totalVolume, concType, updateVolume) {
        if (!amount.unit || isNaN(amount.value) || amount.unit !== 'mol/l') { return }

        if (this.density && this.density > 0 && concType !== 'startingConc') {
            this.setMolarityDensity(amount, totalVolume)
        } else {
            this.setMolarity(amount, totalVolume, concType, updateVolume)
        }
    }

    setMolarityDensity(amount, totalVolume) {
        const purity = this.purity || 1.0;
        this.molarity_value = this.concn = amount.value;
        this.molarity_unit = amount.unit;
        this.starting_molarity_value = 0;

        this.amount_mol = this.molarity_value * totalVolume * purity;
        this.amount_g = (this.molecule_molecular_weight * this.amount_mol) / purity
        this.amount_l = (this.amount_g / this.density) / 1000;
    }

    setMolarity(amount, totalVolume, concType, updateVolume) {
        const purity = this.purity || 1.0;
        if (concType !== 'startingConc') {
            this.concn = amount.value;
            this.molarity_value = amount.value;
            this.molarity_unit = amount.unit
        } else {
            this.starting_molarity_value = amount.value;
            this.starting_molarity_unit = amount.unit;
        }
        if (this.material_group === 'liquid' && updateVolume) {
            this.amount_mol = this.molarity_value * totalVolume * purity;
            this.amount_l = this.amount_mol / (this.starting_molarity_value * purity);
        } else if (this.material_group === 'liquid' && !updateVolume) {
            this.amount_mol = this.starting_molarity_value * this.amount_l * purity
            this.concn = this.molarity_value = this.amount_mol / (totalVolume * purity);
        } else if (this.material_group === 'solid' && this.concn && totalVolume) {
            this.amount_mol = this.molarity_value * totalVolume * purity;
            this.amount_g = this.molecule_molecular_weight * (this.amount_mol / purity);
        } else if (this.concn === 0) {
            this.amount_g = 0;
            this.amount_l = 0;
        }

        this.density = 0;
    }

    setDensity(density, updateVolume, totalVolume) {
        const purity = this.purity || 1.0;
        if (!density.unit || isNaN(density.value) || density.unit !== 'g/ml') { return }

        this.density = density.value;
        this.starting_molarity_value = 0;

        if (updateVolume) {
            this.amount_mol = this.molarity_value * totalVolume * purity;
            this.amount_g = this.amount_mol * this.molecule_molecular_weight / purity;
            this.amount_l = (this.amount_g / this.density) / 1000;
        } else {
            this.amount_g = (this.amount_l * 1000) * this.density;
            this.amount_mol = this.amount_g * purity / this.molecule_molecular_weight;
            this.concn = this.molarity_value = this.amount_mol / (totalVolume * purity);
        }
    }

    updateRatio(newRatio, materialGroup, adjustAmount, totalVolume) {
        if (this.equivalent === newRatio) { return }

        const newMols = (newRatio / this.equivalent) * this.amount_mol;
        this.amount_mol = newMols;
        
        this.equivalent = newRatio;

        if (materialGroup === 'liquid') {
            if (adjustAmount) {
                const concentration = this.molarity_value;
                const updatedVolume = newMols / concentration;
                this.amount_l = updatedVolume;
            } else {
                const concentration = newMols / this.amount_l;
                this.concn = concentration;
                this.molarity_value = concentration;
                this.molarity_unit = 'M'
            }
        } else if (materialGroup === 'solid') {
                this.amount_g = newMols * this.molecule_molecular_weight;

                this.concn = newMols / totalVolume;
                this.molarity_value = this.concn;
        }
    }

    setPurity(purity, totalVolume) {
        if (!isNaN(purity) && purity >= 0 && purity <= 1) {
          this.purity = purity;
          this.amount_mol = this.molarity_value * totalVolume * this.purity;
        }
    }
    
    serializeComponent() {
        return {
          id: this.id,
          name: this.name,
          position: this.position,
          component_properties: {
            amount_mol: this.amount_mol,
            amount_l: this.amount_l,
            amount_g: this.amount_g,
            density: this.density,
            molarity_unit: this.molarity_unit,
            molarity_value: this.molarity_value,
            starting_molarity_value: this.starting_molarity_value,
            starting_molarity_unit: this.starting_molarity_unit,
            molecule_id: this.molecule.id,
            equivalent: this.equivalent,
            parent_id: this.parent_id,
            material_group: this.material_group,
            reference: this.reference,
            purity: this.purity,
          }
         }
      }
}