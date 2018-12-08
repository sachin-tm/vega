import lookup from './lookup';
import {ingest, isTuple, Transform, tupleid} from 'vega-dataflow';
import {array, error, inherits} from 'vega-util';
import {hierarchy} from 'd3-hierarchy';

 /**
  * Nest tuples into a tree structure, grouped by key values.
  * @constructor
  * @param {object} params - The parameters for this operator.
  * @param {Array<function(object): *>} params.keys - The key fields to nest by, in order.
  * @param {boolean} [params.generate=false] - A boolean flag indicating if
  *   non-leaf nodes generated by this transform should be included in the
  *   output. The default (false) includes only the input data (leaf nodes)
  *   in the data stream.
  */
export default function Nest(params) {
  Transform.call(this, null, params);
}

Nest.Definition = {
  "type": "Nest",
  "metadata": {"treesource": true, "changes": true},
  "params": [
    { "name": "keys", "type": "field", "array": true },
    { "name": "generate", "type": "boolean" }
  ]
};

var prototype = inherits(Nest, Transform);

function children(n) {
  return n.values;
}

prototype.transform = function(_, pulse) {
  if (!pulse.source) {
    error('Nest transform requires an upstream data source.');
  }

  var gen = _.generate,
      mod = _.modified(),
      out = pulse.clone(),
      tree = this.value;

  if (!tree || mod || pulse.changed()) {
    // collect nodes to remove
    if (tree) {
      tree.each(function(node) {
        if (node.children && isTuple(node.data)) {
          out.rem.push(node.data);
        }
      });
    }

    // generate new tree structure
    this.value = tree = hierarchy({
      values: array(_.keys)
                .reduce(function(n, k) { n.key(k); return n; }, nest())
                .entries(out.source)
    }, children);

    // collect nodes to add
    if (gen) {
      tree.each(function(node) {
        if (node.children) {
          node = ingest(node.data);
          out.add.push(node);
          out.source.push(node);
        }
      });
    }

    // build lookup table
    lookup(tree, tupleid, tupleid);
  }

  out.source.root = tree;
  return out;
};

function nest() {
  var keys = [],
      nest;

  function apply(array, depth) {
    if (depth >= keys.length) {
      return array;
    }

    var i = -1,
        n = array.length,
        key = keys[depth++],
        keyValue,
        value,
        valuesByKey = {},
        values,
        result = {};

    while (++i < n) {
      keyValue = key(value = array[i]) + '';
      if (values = valuesByKey[keyValue]) {
        values.push(value);
      } else {
        valuesByKey[keyValue] = [value];
      }
    }

    for (keyValue in valuesByKey) {
      result[keyValue] = apply(valuesByKey[keyValue], depth);
    }

    return result;
  }

  function entries(map, depth) {
    if (++depth > keys.length) return map;
    var array = [], k;
    for (k in map) {
      array.push({key: k, values: entries(map[k], depth)});
    }
    return array;
  }

  return nest = {
    entries: function(array) { return entries(apply(array, 0), 0); },
    key: function(d) { keys.push(d); return nest; }
  };
}
