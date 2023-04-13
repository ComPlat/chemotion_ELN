import Vessel from "../../../../../app/packs/src/models/Vessel";
import expect from 'expect';
const assert = require('assert');

describe('Vessel', async () => {
  describe('createEmpty()', () =>{
    context('when collection is valid', () =>{
      it('new empty vessel item created', () => {
        const vessel=Vessel.buildEmpty(0);              
        expect(vessel.collection_id).toBe(0)
     });        
 });  
 context('when collection id is not given', () => {   
     it('error was thrown', () => {
         expect(() => Vessel.buildEmpty()).toThrowError("collection id is not valid: undefined");
     });        
 });   
 context('when collection id is not a number', () => {   
     it('error was thrown', () => {
         expect(() => Vessel.buildEmpty('dummy')).toThrowError("collection id is not valid: dummy");
     });        
 });        
});
});