/**
 * Collection.js is small but yet powerfull localstorage based database.
 *
 * @author Dawid Kraczowski <crac>
 * @thanks: Dawid Winiarczyk <morriq>
 * @license MIT
 * @version 1.1.0
 */
var Collection = (function() {

    try {
        localStorage.setItem('collection.js', 1);
        localStorage.removeItem('collection.js');
    } catch(e) {
        throw new Error('Local storage is not supported!');
    }

    /**
     * Checks if given value is an array
     * @param {*} object
     * @returns {boolean}
     * @private
     */
    function _isArray(object) {
        return Object.prototype.toString.call(object) === '[object Array]';
    }

    /**
     * Checks if given value is an object
     * @param {*} object
     * @returns {boolean}
     * @private
     */
    function _isObject(object) {
        return typeof object === 'object';
    }

    /**
     * Checks if given value is a function
     * @param {*} object
     * @returns {boolean}
     * @private
     */
    function _isFunction(object) {
        return typeof object === 'function';
    }

    /**
     * Checks if given value is a string
     * @param {*} object
     * @returns {boolean}
     * @private
     */
    function _isString(object) {
        return typeof object === 'string';
    }

    /**
     * Clones object and returns its copy.
     * Copies Objects, Arrays, Functions and primitives.
     *
     * @param {Object} object
     * @private
     */
    function _cloneObject(object) {
        var copy;
        var property;
        var type;

        if (!_isObject(object) || object === null) {
            copy = object;
            return copy;
        }

        if (_isArray(object)) {
            copy = [];
            for (var i = 0, l = object.length; i < l; i++) {
                copy[i] = _cloneObject(object[i]);
            }
            return copy;
        }

        try {
            copy = new object.constructor();
        } catch (e) {
            copy = {};
        }

        for (property in object) {
            if (!object.hasOwnProperty(property)) {
                continue;
            }

            if (_isObject(object[property]) && object[property] !== null) {
                copy[property] = _cloneObject(object[property]);
            } else {
                copy[property] = object[property];
            }
        }
        return copy;
    }

    /**
     * Gets collection's meta data
     * @param {Collection} collectionObj
     * @returns {*}
     * @private
     */
    function _getMeta(collectionObj) {
        var meta = window.localStorage.getItem(collectionObj.name + '_meta');
        if (meta) {
            return JSON.parse(meta);
        }

        return {
            name: collectionObj.name,
            length: 0,
            lastId: 0,
            map: []
        };
    }

    /**
     * Saves collection's meta data
     * @param {Collection} collectionObj
     * @private
     */
    function _saveMeta(collectionObj) {
        window.localStorage.setItem(collectionObj.name + '_meta', JSON.stringify(collectionObj._meta));
    }

    /**
     * Removes item from collection
     * This function is only used as an internal helper
     * @param {Collection} collectionObj
     * @param {Object} entity
     * @returns {*}
     * @private
     */
    function _removeFromCollection(collectionObj, entity) {
        var index = -1;
        for (var i = 0; i < collectionObj.length; i++) {
            if (collectionObj[i] === entity) {
                index = i;
                break;
            }
        }

        if (index === -1) {
            return null;
        }

        Array.prototype.splice.call(collectionObj, index, 1);

        return entity;
    }

    /**
     * Resets collection status
     * @param {Collection} collectionObj
     * @private
     */
    function _resetCollection(collectionObj) {
        Array.prototype.splice.call(collectionObj, 0, collectionObj.length);
    }

    /**
     * Rewrites internal entities to collection
     * @param {Collection} collectionObj
     * @private
     */
    function _rewriteData(collectionObj) {
        _resetCollection(collectionObj);
        var i = 0;
        for (var k in collectionObj._data) {
            collectionObj[i++] = collectionObj._data[k];
        }
        collectionObj.length = i;
    }

    /**
     * Creates new collection object
     * @param name collection's name
     * @param reader function called when data is loaded from localstorage
     * @param writer function called before data is saved to localstorage
     * @constructor
     */
    function Collection(name, reader, writer) {

        var writer = _isFunction(writer) ? writer : null;
        var reader = _isFunction(reader) ? reader : null;

        Object.defineProperties(this, {
            name: {
                enumerable: false,
                writable: false,
                value: name
            },
            _cursor: {
                enumerable: false,
                writable: true,
                value: 0
            },
            _meta: {
                enumerable: false,
                writable: true,
                value: {}
            },
            _data: {
                enumerable: false,
                writable: true,
                value: {}
            },
            _query : {
                enumerable: false,
                writable: true,
                value: null
            },
            _writer : {
                enumerable: false,
                writable: false,
                configurable: true,
                value: writer
            },
            _reader : {
                enumerable: false,
                writable: false,
                configurable: true,
                value: reader
            },
            length: {
                writable: true,
                value: 0
            }

        });
        this.read();
    }
    Object.defineProperties(Collection.prototype, {
        id: {
            enumerable: false,
            writable: true
        },
        read: {
            enumerable: false,
            writable: true
        },
        save: {
            enumerable: false,
            writable: true
        },
        remove: {
            enumerable: false,
            writable: true
        },
        find: {
            enumerable: false,
            writable: true
        },
        drop: {
            enumerable: false,
            writable: true
        },
        sort: {
            enumerable: false,
            writable: true
        },
        group: {
            enumerable: false,
            writable: true
        }
    });

    /**
     * Reads collection from local storage
     * @param {Function} [reader]
     */
    Collection.prototype.read = function(reader) {
        if (_isFunction(reader)) {//define reader
            Object.defineProperty(this, '_reader', {
                enumerable: false,
                writable: false,
                configurable: true,
                value: reader
            });
        }

        this._meta = _getMeta(this);

        if (this._meta.length === 0) {
            return;
        }
        var data = {};
        this.length = this._meta.length;
        for (var i = 0; i < this._meta.length; i++) {
            var id = this._meta.map[i];
            var entity = JSON.parse(window.localStorage.getItem(this.name + '_' + id));
            data[id] = this._reader ? this._reader(entity) : entity;
            if (!_isObject(data[id])) {
                if (data[id] === false) {
                    delete data[id];
                    continue;
                }
                throw new Error('reader function must return an object or false');
            }
            //never allow for overriding id
            Object.defineProperty(data[id], '_id', {
                enumerable: false,
                writable: false,
                configurable: false,
                value: id
            });
            this[i] = data[id];
        }
        this._data = data;
    };

    /**
     * Gets entity  by its id
     * @param {Number} id
     * @returns {Object}
     */
    Collection.prototype.id = function(id) {
        return this._data.hasOwnProperty(id) ? this._data[id] : null;
    };

    /**
     * Saves or updates entity in the collection
     * @param {Object} item
     * @returns {Number|false} entity's id if object was saved otherwise false
     */
    Collection.prototype.save = function(item) {

        var store = _isFunction(this._writer) ? this._writer(_cloneObject(item)) : item;
        if (!_isObject(store)) {
            if (store === false) {
                return false;
            }
            throw new Error('writer function must return an object or false');
        }

        if (item._id) {
            if (!this._data.hasOwnProperty(item._id)) {
                throw new Error('Could not find entity with id ' + item._id + ' in collection ' + this.name);
            }

            if (item.propertyIsEnumerable('_id')) {
                Object.defineProperty(item, '_id', {
                    enumerable: false,
                    writable: false,
                    value: item._id
                });
            }

            this._data[item._id] = item;
            //update collection's item
            for (var i = 0; i < this.length; i++) {
                if (this[i]._id === item._id) {
                    this[i] = item;
                    break;
                }
            }
            window.localStorage.setItem(this.name + '_' + item._id, JSON.stringify(store));
            return item._id;
        }
        //never allow for overriding id
        Object.defineProperty(item, '_id', {
            enumerable: false,
            writable: false,
            configurable: false,
            value: ++this._meta.lastId
        });

        this._data[item._id] = item;
        window.localStorage.setItem(this.name + '_' + item._id, JSON.stringify(store));
        this._meta.map.push(item._id);

        if (_isFunction(this._query)) {
            if (this._query(item)) {
                this[this.length] = item;
                this.length++;
            }
        } else {
            this[this.length] = item;
            this.length++;
        }

        this._meta.length++;
        _saveMeta(this);

        return item._id;
    };

    /**
     * Removes entity from the collection
     * @param {Object} item
     * @returns {boolean} true if entity was removed otherwise false
     */
    Collection.prototype.remove = function(item) {
        var id;
        if (_isObject(item)) {
            if (item.hasOwnProperty('_id')) {
                id = item._id;
            } else {
                return false;
            }
        } else {
            id = item;
        }

        if (!this._data.hasOwnProperty(id)) {
            return false;
        }

        localStorage.removeItem(this.name + '_' + id);
        _removeFromCollection(this, this._data[id]);
        delete this._data[id];
        this._meta.length--;
        this._meta.map.splice(this._meta.map.indexOf(id), 1);
        _saveMeta(this);
    };

    /**
     * Finds matching entities and updates the collection
     * @param {Function} query optional filter function
     * @param {Function} sort optional sorting function
     * @return {Collection}
     */
    Collection.prototype.find = function(query, sort) {

        if (!_isFunction(query)) {

            if (_isFunction(sort)) {
                _resetCollection(this);
                var arr = [];
                for (var key in this._data) {
                    arr.push(this._data[key]);
                }
                arr.sort(sort);
                for (var i = 0, l = arr.length; i < l; i++) {
                    this[i] = arr[i];
                }
                this.length = arr.length;
            } else if (this._query === null) {
                return this;
            } else {
                this._query = null;
                _rewriteData(this);
            }
            return this;
        } else {
            this._query = query;
        }

        _resetCollection(this);

        var arr = [];
        for (var key in this._data) {
            var item = this._data[key];
            if (this._query(item)) {
                arr.push(item);
            }
        }
        if (_isFunction(sort)) {
            arr.sort(sort);
        }

        for (var i = 0, l = arr.length; i < arr.length; i++) {
            this[i] = arr[i];
        }
        this.length = arr.length;
        return this;
    };

    /**
     * Sorts the collection
     * @param {Function} sort sorting function
     * @return {Collection}
     */
    Collection.prototype.sort = function(sort) {
        var arr = [];
        for (var i = 0; i < this.length; i++) {
            arr.push(this[i]);
        }
        arr.sort(sort);
        _resetCollection(this);
        for (var i = 0, l = arr.length; i < l; i++) {
            this[i] = arr[i];
        }
        this.length = arr.length;
        return this;
    };

    /**
     * Groups all collection's entities by property and returns
     * object containing grouped entities
     * @param {String} property property by which collection will be grouped
     * @return {Object}
     */
    Collection.prototype.group = function(property) {
        var grouped = {};

        for (var i = 0; i < this.length; i++) {
            var prop = _isString(this[i][property]) ? this[i][property] : '_ungrouped';
            if (prop === '_ungrouped' && !grouped.hasOwnProperty('_ungrouped')) {
                Object.defineProperty(grouped, '_ungrouped', {
                    enumerable: false,
                    value: []
                });
            }
            grouped[prop] = grouped[prop] || [];
            grouped[prop].push(this[i]);
        }

        return grouped;
    };

    /**
     * Destroys entire collection
     */
    Collection.prototype.drop = function() {
        for (var i in this._data) {
            localStorage.removeItem(this.name + '_' + i);
        }
        localStorage.removeItem(this.name + '_meta');
        _resetCollection(this);
        this._data = {};
        this._meta = _getMeta(this);
    };


    return Collection;
})();