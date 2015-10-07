'use strict';

var Base = require('./base');
var Proxy = require('harmony-proxy');
var StringUtils = require('./string_utils');
var Symbol = require('es6-symbol');
var pluralize = require('pluralize');

var _base = Symbol('base');
var _changes = Symbol('changes');
var _validations = Symbol('validations');
var _associations = Symbol('associations');

class ActiveRecord  {
  constructor(){
    var self = this;
    this[_changes] = {};
    this[_validations] = {};
    this[_associations] = {all:[],belongsTo:[],hasMany:[],hasOne:[],hasAndBelongsToMany:[]};
    this[_base] = new Base(this[_validations]);
    this.errors = [];
  }

  static establishConnection(options){
    var Adapter = require('./lib/adapters/'+options.adapter+'_adapter.js');
    ActiveRecord.persistance = new Adapter();
  }

  static create(props){
    var instance = new this();
    var proxy = new Proxy(instance,instance[_base]);
    if(this.persistance){
      this.persistance.create(instance,instance[_changes],props);
    }
    createFindByMethod(this,'id');
    return proxy;
  }

  belongsTo(Model,options){
    var name = StringUtils.toSnakeCase(Model.name);
    let column = name+'Id';
    let a = {model:Model,options:options,column:column,type:'belongsTo'};
    this[_associations].belongsTo.push(a);
    this[_associations].all.push(a);
  }

  hasMany(Model,options){
    let column = pluralize(StringUtils.toSnakeCase(Model.name));
    let a = {model:Model,options:options,column:column,type:'hasMany'};
    this[_associations].hasMany.push(a);
    this[_associations].all.push(a);
    this[column] = [];
  }

  hasOne(Model,options){
    let column = StringUtils.toSnakeCase(Model.name);
    let a = {model:Model,options:options,column:column,type:'hasOne'};
    this[_associations].hasMany.push(a);
    this[_associations].all.push(a);
  }

  hasAndBelongsToMany(Model,options){
    let column = pluralize(StringUtils.toSnakeCase(Model.name));
    let a = {model:Model,options:options,column:column,type:'hasAndBelongsToMany'};
    this[_associations].hasAndBelongsToMany.push(a);
    this[_associations].all.push(a);
  }

  validate(field,options) {
    if(Array.isArray(field)){
      var self = this;
      field.forEach(function(item){
        self.validate(item,options);
      })
    }else{
      this[_validations][field] = options;
    }
  }

  save(options){
    if(!this.errors.length){
      // TODO: validate presence and allow_blank
      if(this.constructor.persistance){
        this.constructor.persistance.update(this,this[_changes],null);
      }
      if(!this.errors.length){
        this[_changes] = {};
      }
    }
    return !this.errors.length;
  }

  changeProp(prop,value){
    this[prop] = this[_changes][prop] = value;
  }

  addIndex(column){
    if(this.constructor.persistance){
      this.constructor.persistance.addIndex(this, column);
    }
    createFindByMethod(this.constructor,column);
  }

  static find(where){
    if(this.persistance){
      return this.persistance.find(this.name,where);
    }
  }

}

var createFindByMethod = function(Model,column){
  Model['findBy' + StringUtils.toTitleCase(column)] = function(value, where){
    where = where || {};
    where[column] = value;
    return Model.find(where);
  };
};

module.exports = ActiveRecord;
