import Canvas from './canvas/canvas';

var context,
    fontHeight,
    ellipsis = '\u2026';

// make dumb, simple estimate if no canvas is available
function estimateWidth(item) {
  return fontHeight = height(item), estimate(textValue(item));
}

function estimate(text) {
  return ~~(0.8 * text.length * fontHeight);
}

// measure text width if canvas is available
function measureWidth(item) {
  return context.font = font(item), measure(textValue(item));
}

function measure(text) {
  return context.measureText(text).width;
}

function height(item) {
  return item.fontSize != null ? item.fontSize : 11;
}

export var textMetrics = {
  height: height,
  measureWidth: measureWidth,
  estimateWidth: estimateWidth,
  width: (context = Canvas(1, 1))
    ? (context = context.getContext('2d'), measureWidth)
    : estimateWidth
};

export function textValue(item) {
  var s = item.text;
  return s == null ? '' : item.limit > 0 ? truncate(item) : s + '';
}

// TODO: RTL support, any other i18n
export function truncate(item) {
  var width = context
        ? (context.font = font(item), measure)
        : (fontHeight = height(item), estimate),
      limit = +item.limit,
      text = item.text + '',
      lo = 0,
      hi = text.length;

  if (width(text) < limit) return text;
  limit -= width(ellipsis);

  while (lo < hi) {
    var mid = 1 + (lo + hi >>> 1);
    if (width(text.slice(0, mid)) < limit) lo = mid;
    else hi = mid - 1;
  }

  return text.slice(0, lo) + ellipsis;
}

export function font(item, quote) {
  var font = item.font;
  if (quote && font) {
    font = String(font).replace(/\"/g, '\'');
  }
  return '' +
    (item.fontStyle ? item.fontStyle + ' ' : '') +
    (item.fontVariant ? item.fontVariant + ' ' : '') +
    (item.fontWeight ? item.fontWeight + ' ' : '') +
    height(item) + 'px ' +
    (font || 'sans-serif');
}

export function offset(item) {
  // perform our own font baseline calculation
  // why? not all browsers support SVG 1.1 'alignment-baseline' :(
  var baseline = item.baseline,
      h = height(item);
  return Math.round(
    baseline === 'top'    ?  0.93*h :
    baseline === 'middle' ?  0.30*h :
    baseline === 'bottom' ? -0.21*h : 0
  );
}
