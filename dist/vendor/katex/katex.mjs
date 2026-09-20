Warning: truncated output (original token count: 151524)
Total output lines: 18456

/**
 * Lexing or parsing positional information for error reporting.
 * This object is immutable.
 */
class SourceLocation {
  // The + prefix indicates that these fields aren't writeable
  // Lexer holding the input string.
  // Start offset, zero-based inclusive.
  // End offset, zero-based exclusive.
  constructor(lexer, start, end) {
    this.lexer = void 0;
    this.start = void 0;
    this.end = void 0;
    this.lexer = lexer;
    this.start = start;
    this.end = end;
  }
  /**
   * Merges two `SourceLocation`s from location providers, given they are
   * provided in order of appearance.
   * - Returns the first one's location if only the first is provided.
   * - Returns a merged range of the first and the last if both are provided
   *   and their lexers match.
   * - Otherwise, returns null.
   */


  static range(first, second) {
    if (!second) {
      return first && first.loc;
    } else if (!first || !first.loc || !second.loc || first.loc.lexer !== second.loc.lexer) {
      return null;
    } else {
      return new SourceLocation(first.loc.lexer, first.loc.start, second.loc.end);
    }
  }

}

/**
 * Interface required to break circular dependency between Token, Lexer, and
 * ParseError.
 */

/**
 * The resulting token returned from `lex`.
 *
 * It consists of the token text plus some position information.
 * The position information is essentially a range in an input string,
 * but instead of referencing the bare input string, we refer to the lexer.
 * That way it is possible to attach extra metadata to the input string,
 * like for example a file name or similar.
 *
 * The position information is optional, so it is OK to construct synthetic
 * tokens if appropriate. Not providing available position information may
 * lead to degraded error reporting, though.
 */
class Token {
  // don't expand the token
  // used in \noexpand
  constructor(text, // the text of this token
  loc) {
    this.text = void 0;
    this.loc = void 0;
    this.noexpand = void 0;
    this.treatAsRelax = void 0;
    this.text = text;
    this.loc = loc;
  }
  /**
   * Given a pair of tokens (this and endToken), compute a `Token` encompassing
   * the whole input range enclosed by these two.
   */


  range(endToken, // last token of the range, inclusive
  text // the text of the newly constructed token
  ) {
    return new Token(text, SourceLocation.range(this, endToken));
  }

}

/**
 * This is the ParseError class, which is the main error thrown by KaTeX
 * functions when something has gone wrong. This is used to distinguish internal
 * errors from errors in the expression that the user provided.
 *
 * If possible, a caller should provide a Token or ParseNode with information
 * about where in the source string the problem occurred.
 */
class ParseError {
  // Error start position based on passed-in Token or ParseNode.
  // Length of affected text based on passed-in Token or ParseNode.
  // The underlying error message without any context added.
  constructor(message, // The error message
  token // An object providing position information
  ) {
    this.name = void 0;
    this.position = void 0;
    this.length = void 0;
    this.rawMessage = void 0;
    var error = "KaTeX parse error: " + message;
    var start;
    var end;
    var loc = token && token.loc;

    if (loc && loc.start <= loc.end) {
      // If we have the input and a position, make the error a bit fancier
      // Get the input
      var input = loc.lexer.input; // Prepend some information

      start = loc.start;
      end = loc.end;

      if (start === input.length) {
        error += " at end of input: ";
      } else {
        error += " at position " + (start + 1) + ": ";
      } // Underline token in question using combining underscores


      var underlined = input.slice(start, end).replace(/[^]/g, "$&\u0332"); // Extract some context from the input and add it to the error

      var left;

      if (start > 15) {
        left = "…" + input.slice(start - 15, start);
      } else {
        left = input.slice(0, start);
      }

      var right;

      if (end + 15 < input.length) {
        right = input.slice(end, end + 15) + "…";
      } else {
        right = input.slice(end);
      }

      error += left + underlined + right;
    } // Some hackery to make ParseError a prototype of Error
    // See http://stackoverflow.com/a/8460753
    // $FlowFixMe


    var self = new Error(error);
    self.name = "ParseError"; // $FlowFixMe

    self.__proto__ = ParseError.prototype;
    self.position = start;

    if (start != null && end != null) {
      self.length = end - start;
    }

    self.rawMessage = message;
    return self;
  }

} // $FlowFixMe More hackery


ParseError.prototype.__proto__ = Error.prototype;

/**
 * This file contains a list of utility functions which are useful in other
 * files.
 */

/**
 * Return whether an element is contained in a list
 */
var contains = function contains(list, elem) {
  return list.indexOf(elem) !== -1;
};
/**
 * Provide a default value if a setting is undefined
 * NOTE: Couldn't use `T` as the output type due to facebook/flow#5022.
 */


var deflt = function deflt(setting, defaultIfUndefined) {
  return setting === undefined ? defaultIfUndefined : setting;
}; // hyphenate and escape adapted from Facebook's React under Apache 2 license


var uppercase = /([A-Z])/g;

var hyphenate = function hyphenate(str) {
  return str.replace(uppercase, "-$1").toLowerCase();
};

var ESCAPE_LOOKUP = {
  "&": "&amp;",
  ">": "&gt;",
  "<": "&lt;",
  "\"": "&quot;",
  "'": "&#x27;"
};
var ESCAPE_REGEX = /[&><"']/g;
/**
 * Escapes text to prevent scripting attacks.
 */

function escape(text) {
  return String(text).replace(ESCAPE_REGEX, match => ESCAPE_LOOKUP[match]);
}
/**
 * Sometimes we want to pull out the innermost element of a group. In most
 * cases, this will just be the group itself, but when ordgroups and colors have
 * a single element, we want to pull that out.
 */


var getBaseElem = function getBaseElem(group) {
  if (group.type === "ordgroup") {
    if (group.body.length === 1) {
      return getBaseElem(group.body[0]);
    } else {
      return group;
    }
  } else if (group.type === "color") {
    if (group.body.length === 1) {
      return getBaseElem(group.body[0]);
    } else {
      return group;
    }
  } else if (group.type === "font") {
    return getBaseElem(group.body);
  } else {
    return group;
  }
};
/**
 * TeXbook algorithms often reference "character boxes", which are simply groups
 * with a single character in them. To decide if something is a character box,
 * we find its innermost group, and see if it is a single character.
 */


var isCharacterBox = function isCharacterBox(group) {
  var baseElem = getBaseElem(group); // These are all they types of groups which hold single characters

  return baseElem.type === "mathord" || baseElem.type === "textord" || baseElem.type === "atom";
};

var assert = function assert(value) {
  if (!value) {
    throw new Error('Expected non-null, but got ' + String(value));
  }

  return value;
};
/**
 * Return the protocol of a URL, or "_relative" if the URL does not specify a
 * protocol (and thus is relative), or `null` if URL has invalid protocol
 * (so should be outright rejected).
 */

var protocolFromUrl = function protocolFromUrl(url) {
  // Check for possible leading protocol.
  // https://url.spec.whatwg.org/#url-parsing strips leading whitespace
  // (U+20) or C0 control (U+00-U+1F) characters.
  // eslint-disable-next-line no-control-regex
  var protocol = /^[\x00-\x20]*([^\\/#?]*?)(:|&#0*58|&#x0*3a|&colon)/i.exec(url);

  if (!protocol) {
    return "_relative";
  } // Reject weird colons


  if (protocol[2] !== ":") {
    return null;
  } // Reject invalid characters in scheme according to
  // https://datatracker.ietf.org/doc/html/rfc3986#section-3.1


  if (!/^[a-zA-Z][a-zA-Z0-9+\-.]*$/.test(protocol[1])) {
    return null;
  } // Lowercase the protocol


  return protocol[1].toLowerCase();
};
var utils = {
  contains,
  deflt,
  escape,
  hyphenate,
  getBaseElem,
  isCharacterBox,
  protocolFromUrl
};

/* eslint no-console:0 */
// TODO: automatically generate documentation
// TODO: check all properties on Settings exist
// TODO: check the type of a property on Settings matches
var SETTINGS_SCHEMA = {
  displayMode: {
    type: "boolean",
    description: "Render math in display mode, which puts the math in " + "display style (so \\int and \\sum are large, for example), and " + "centers the math on the page on its own line.",
    cli: "-d, --display-mode"
  },
  output: {
    type: {
      enum: ["htmlAndMathml", "html", "mathml"]
    },
    description: "Determines the markup language of the output.",
    cli: "-F, --format <type>"
  },
  leqno: {
    type: "boolean",
    description: "Render display math in leqno style (left-justified tags)."
  },
  fleqn: {
    type: "boolean",
    description: "Render display math flush left."
  },
  throwOnError: {
    type: "boolean",
    default: true,
    cli: "-t, --no-throw-on-error",
    cliDescription: "Render errors (in the color given by --error-color) ins" + "tead of throwing a ParseError exception when encountering an error."
  },
  errorColor: {
    type: "string",
    default: "#cc0000",
    cli: "-c, --error-color <color>",
    cliDescription: "A color string given in the format 'rgb' or 'rrggbb' " + "(no #). This option determines the color of errors rendered by the " + "-t option.",
    cliProcessor: color => "#" + color
  },
  macros: {
    type: "object",
    cli: "-m, --macro <def>",
    cliDescription: "Define custom macro of the form '\\foo:expansion' (use " + "multiple -m arguments for multiple macros).",
    cliDefault: [],
    cliProcessor: (def, defs) => {
      defs.push(def);
      return defs;
    }
  },
  minRuleThickness: {
    type: "number",
    description: "Specifies a minimum thickness, in ems, for fraction lines," + " `\\sqrt` top lines, `{array}` vertical lines, `\\hline`, " + "`\\hdashline`, `\\underline`, `\\overline`, and the borders of " + "`\\fbox`, `\\boxed`, and `\\fcolorbox`.",
    processor: t => Math.max(0, t),
    cli: "--min-rule-thickness <size>",
    cliProcessor: parseFloat
  },
  colorIsTextColor: {
    type: "boolean",
    description: "Makes \\color behave like LaTeX's 2-argument \\textcolor, " + "instead of LaTeX's one-argument \\color mode change.",
    cli: "-b, --color-is-text-color"
  },
  strict: {
    type: [{
      enum: ["warn", "ignore", "error"]
    }, "boolean", "function"],
    description: "Turn on strict / LaTeX faithfulness mode, which throws an " + "error if the input uses features that are not supported by LaTeX.",
    cli: "-S, --strict",
    cliDefault: false
  },
  trust: {
    type: ["boolean", "function"],
    description: "Trust the input, enabling all HTML features such as \\url.",
    cli: "-T, --trust"
  },
  maxSize: {
    type: "number",
    default: Infinity,
    description: "If non-zero, all user-specified sizes, e.g. in " + "\\rule{500em}{500em}, will be capped to maxSize ems. Otherwise, " + "elements and spaces can be arbitrarily large",
    processor: s => Math.max(0, s),
    cli: "-s, --max-size <n>",
    cliProcessor: parseInt
  },
  maxExpand: {
    type: "number",
    default: 1000,
    description: "Limit the number of macro expansions to the specified " + "number, to prevent e.g. infinite macro loops. If set to Infinity, " + "the macro expander will try to fully expand as in LaTeX.",
    processor: n => Math.max(0, n),
    cli: "-e, --max-expand <n>",
    cliProcessor: n => n === "Infinity" ? Infinity : parseInt(n)
  },
  globalGroup: {
    type: "boolean",
    cli: false
  }
};

function getDefaultValue(schema) {
  if (schema.default) {
    return schema.default;
  }

  var type = schema.type;
  var defaultType = Array.isArray(type) ? type[0] : type;

  if (typeof defaultType !== 'string') {
    return defaultType.enum[0];
  }

  switch (defaultType) {
    case 'boolean':
      return false;

    case 'string':
      return '';

    case 'number':
      return 0;

    case 'object':
      return {};
  }
}
/**
 * The main Settings object
 *
 * The current options stored are:
 *  - displayMode: Whether the expression should be typeset as inline math
 *                 (false, the default), meaning that the math starts in
 *                 \textstyle and is placed in an inline-block); or as display
 *                 math (true), meaning that the math starts in \displaystyle
 *                 and is placed in a block with vertical margin.
 */


class Settings {
  constructor(options) {
    this.displayMode = void 0;
    this.output = void 0;
    this.leqno = void 0;
    this.fleqn = void 0;
    this.throwOnError = void 0;
    this.errorColor = void 0;
    this.macros = void 0;
    this.minRuleThickness = void 0;
    this.colorIsTextColor = void 0;
    this.strict = void 0;
    this.trust = void 0;
    this.maxSize = void 0;
    this.maxExpand = void 0;
    this.globalGroup = void 0;
    // allow null options
    options = options || {};

    for (var prop in SETTINGS_SCHEMA) {
      if (SETTINGS_SCHEMA.hasOwnProperty(prop)) {
        // $FlowFixMe
        var schema = SETTINGS_SCHEMA[prop]; // TODO: validate options
        // $FlowFixMe

        this[prop] = options[prop] !== undefined ? schema.processor ? schema.processor(options[prop]) : options[prop] : getDefaultValue(schema);
      }
    }
  }
  /**
   * Report nonstrict (non-LaTeX-compatible) input.
   * Can safely not be called if `this.strict` is false in JavaScript.
   */


  reportNonstrict(errorCode, errorMsg, token) {
    var strict = this.strict;

    if (typeof strict === "function") {
      // Allow return value of strict function to be boolean or string
      // (or null/undefined, meaning no further processing).
      strict = strict(errorCode, errorMsg, token);
    }

    if (!strict || strict === "ignore") {
      return;
    } else if (strict === true || strict === "error") {
      throw new ParseError("LaTeX-incompatible input and strict mode is set to 'error': " + (errorMsg + " [" + errorCode + "]"), token);
    } else if (strict === "warn") {
      typeof console !== "undefined" && console.warn("LaTeX-incompatible input and strict mode is set to 'warn': " + (errorMsg + " [" + errorCode + "]"));
    } else {
      // won't happen in type-safe code
      typeof console !== "undefined" && console.warn("LaTeX-incompatible input and strict mode is set to " + ("unrecognized '" + strict + "': " + errorMsg + " [" + errorCode + "]"));
    }
  }
  /**
   * Check whether to apply strict (LaTeX-adhering) behavior for unusual
   * input (like `\\`).  Unlike `nonstrict`, will not throw an error;
   * instead, "error" translates to a return value of `true`, while "ignore"
   * translates to a return value of `false`.  May still print a warning:
   * "warn" prints a warning and returns `false`.
   * This is for the second category of `errorCode`s listed in the README.
   */


  useStrictBehavior(errorCode, errorMsg, token) {
    var strict = this.strict;

    if (typeof strict === "function") {
      // Allow return value of strict function to be boolean or string
      // (or null/undefined, meaning no further processing).
      // But catch any exceptions thrown by function, treating them
      // like "error".
      try {
        strict = strict(errorCode, errorMsg, token);
      } catch (error) {
        strict = "error";
      }
    }

    if (!strict || strict === "ignore") {
      return false;
    } else if (strict === true || strict === "error") {
      return true;
    } else if (strict === "warn") {
      typeof console !== "undefined" && console.warn("LaTeX-incompatible input and strict mode is set to 'warn': " + (errorMsg + " [" + errorCode + "]"));
      return false;
    } else {
      // won't happen in type-safe code
      typeof console !== "undefined" && console.warn("LaTeX-incompatible input and strict mode is set to " + ("unrecognized '" + strict + "': " + errorMsg + " [" + errorCode + "]"));
      return false;
    }
  }
  /**
   * Check whether to test potentially dangerous input, and return
   * `true` (trusted) or `false` (untrusted).  The sole argument `context`
   * should be an object with `command` field specifying the relevant LaTeX
   * command (as a string starting with `\`), and any other arguments, etc.
   * If `context` has a `url` field, a `protocol` field will automatically
   * get added by this function (changing the specified object).
   */


  isTrusted(context) {
    if (context.url && !context.protocol) {
      var protocol = utils.protocolFromUrl(context.url);

      if (protocol == null) {
        return false;
      }

      context.protocol = protocol;
    }

    var trust = typeof this.trust === "function" ? this.trust(context) : this.trust;
    return Boolean(trust);
  }

}

/**
 * This file contains information and classes for the various kinds of styles
 * used in TeX. It provides a generic `Style` class, which holds information
 * about a specific style. It then provides instances of all the different kinds
 * of styles possible, and provides functions to move between them and get
 * information about them.
 */

/**
 * The main style class. Contains a unique id for the style, a size (which is
 * the same for cramped and uncramped version of a style), and a cramped flag.
 */
class Style {
  constructor(id, size, cramped) {
    this.id = void 0;
    this.size = void 0;
    this.cramped = void 0;
    this.id = id;
    this.size = size;
    this.cramped = cramped;
  }
  /**
   * Get the style of a superscript given a base in the current style.
   */


  sup() {
    return styles[sup[this.id]];
  }
  /**
   * Get the style of a subscript given a base in the current style.
   */


  sub() {
    return styles[sub[this.id]];
  }
  /**
   * Get the style of a fraction numerator given the fraction in the current
   * style.
   */


  fracNum() {
    return styles[fracNum[this.id]];
  }
  /**
   * Get the style of a fraction denominator given the fraction in the current
   * style.
   */


  fracDen() {
    return styles[fracDen[this.id]];
  }
  /**
   * Get the cramped version of a style (in particular, cramping a cramped style
   * doesn't change the style).
   */


  cramp() {
    return styles[cramp[this.id]];
  }
  /**
   * Get a text or display version of this style.
   */


  text() {
    return styles[text$1[this.id]];
  }
  /**
   * Return true if this style is tightly spaced (scriptstyle/scriptscriptstyle)
   */


  isTight() {
    return this.size >= 2;
  }

} // Export an interface for type checking, but don't expose the implementation.
// This way, no more styles can be generated.


// IDs of the different styles
var D = 0;
var Dc = 1;
var T = 2;
var Tc = 3;
var S = 4;
var Sc = 5;
var SS = 6;
var SSc = 7; // Instances of the different styles

var styles = [new Style(D, 0, false), new Style(Dc, 0, true), new Style(T, 1, false), new Style(Tc, 1, true), new Style(S, 2, false), new Style(Sc, 2, true), new Style(SS, 3, false), new Style(SSc, 3, true)]; // Lookup tables for switching from one style to another

var sup = [S, Sc, S, Sc, SS, SSc, SS, SSc];
var sub = [Sc, Sc, Sc, Sc, SSc, SSc, SSc, SSc];
var fracNum = [T, Tc, S, Sc, SS, SSc, SS, SSc];
var fracDen = [Tc, Tc, Sc, Sc, SSc, SSc, SSc, SSc];
var cramp = [Dc, Dc, Tc, Tc, Sc, Sc, SSc, SSc];
var text$1 = [D, Dc, T, Tc, T, Tc, T, Tc]; // We only export some of the styles.

var Style$1 = {
  DISPLAY: styles[D],
  TEXT: styles[T],
  SCRIPT: styles[S],
  SCRIPTSCRIPT: styles[SS]
};

/*
 * This file defines the Unicode scripts and script families that we
 * support. To add new scripts or families, just add a new entry to the
 * scriptData array below. Adding scripts to the scriptData array allows
 * characters from that script to appear in \text{} environments.
 */

/**
 * Each script or script family has a name and an array of blocks.
 * Each block is an array of two numbers which specify the start and
 * end points (inclusive) of a block of Unicode codepoints.
 */

/**
 * Unicode block data for the families of scripts we support in \text{}.
 * Scripts only need to appear here if they do not have font metrics.
 */
var scriptData = [{
  // Latin characters beyond the Latin-1 characters we have metrics for.
  // Needed for Czech, Hungarian and Turkish text, for example.
  name: 'latin',
  blocks: [[0x0100, 0x024f], // Latin Extended-A and Latin Extended-B
  [0x0300, 0x036f] // Combining Diacritical marks
  ]
}, {
  // The Cyrillic script used by Russian and related languages.
  // A Cyrillic subset used to be supported as explicitly defined
  // symbols in symbols.js
  name: 'cyrillic',
  blocks: [[0x0400, 0x04ff]]
}, {
  // Armenian
  name: 'armenian',
  blocks: [[0x0530, 0x058F]]
}, {
  // The Brahmic scripts of South and Southeast Asia
  // Devanagari (0900–097F)
  // Bengali (0980–09FF)
  // Gurmukhi (0A00–0A7F)
  // Gujarati (0A80–0AFF)
  // Oriya (0B00–0B7F)
  // Tamil (0B80–0BFF)
  // Telugu (0C00–0C7F)
  // Kannada (0C80–0CFF)
  // Malayalam (0D00–0D7F)
  // Sinhala (0D80–0DFF)
  // Thai (0E00–0E7F)
  // Lao (0E80–0EFF)
  // Tibetan (0F00–0FFF)
  // Myanmar (1000–109F)
  name: 'brahmic',
  blocks: [[0x0900, 0x109F]]
}, {
  name: 'georgian',
  blocks: [[0x10A0, 0x10ff]]
}, {
  // Chinese and Japanese.
  // The "k" in cjk is for Korean, but we've separated Korean out
  name: "cjk",
  blocks: [[0x3000, 0x30FF], // CJK symbols and punctuation, Hiragana, Katakana
  [0x4E00, 0x9FAF], // CJK ideograms
  [0xFF00, 0xFF60] // Fullwidth punctuation
  // TODO: add halfwidth Katakana and Romanji glyphs
  ]
}, {
  // Korean
  name: 'hangul',
  blocks: [[0xAC00, 0xD7AF]]
}];
/**
 * Given a codepoint, return the name of the script or script family
 * it is from, or null if it is not part of a known block
 */

function scriptFromCodepoint(codepoint) {
  for (var i = 0; i < scriptData.length; i++) {
    var script = scriptData[i];

    for (var _i = 0; _i < script.blocks.length; _i++) {
      var block = script.blocks[_i];

      if (codepoint >= block[0] && codepoint <= block[1]) {
        return script.name;
      }
    }
  }

  return null;
}
/**
 * A flattened version of all the supported blocks in a single array.
 * This is an optimization to make supportedCodepoint() fast.
 */

var allBlocks = [];
scriptData.forEach(s => s.blocks.forEach(b => allBlocks.push(...b)));
/**
 * Given a codepoint, return true if it falls within one of the
 * scripts or script families defined above and false otherwise.
 *
 * Micro benchmarks shows that this is faster than
 * /[\u3000-\u30FF\u4E00-\u9FAF\uFF00-\uFF60\uAC00-\uD7AF\u0900-\u109F]/.test()
 * in Firefox, Chrome and Node.
 */

function supportedCodepoint(codepoint) {
  for (var i = 0; i < allBlocks.length; i += 2) {
    if (codepoint >= allBlocks[i] && codepoint <= allBlocks[i + 1]) {
      return true;
    }
  }

  return false;
}

/**
 * This file provides support to domTree.js and delimiter.js.
 * It's a storehouse of path geometry for SVG images.
 */
// In all paths below, the viewBox-to-em scale is 1000:1.
var hLinePad = 80; // padding above a sqrt vinculum. Prevents image cropping.
// The vinculum of a \sqrt can be made thicker by a KaTeX rendering option.
// Think of variable extraVinculum as two detours in the SVG path.
// The detour begins at the lower left of the area labeled extraVinculum below.
// The detour proceeds one extraVinculum distance up and slightly to the right,
// displacing the radiused corner between surd and vinculum. The radius is
// traversed as usual, then the detour resumes. It goes right, to the end of
// the very long vinculum, then down one extraVinculum distance,
// after which it resumes regular path geometry for the radical.

/*                                                  vinculum
                                                   /
         /▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒←extraVinculum
        / █████████████████████←0.04em (40 unit) std vinculum thickness
       / /
      / /
     / /\
    / / surd
*/

var sqrtMain = function sqrtMain(extraVinculum, hLinePad) {
  // sqrtMain path geometry is from glyph U221A in the font KaTeX Main
  return "M95," + (622 + extraVinculum + hLinePad) + "\nc-2.7,0,-7.17,-2.7,-13.5,-8c-5.8,-5.3,-9.5,-10,-9.5,-14\nc0,-2,0.3,-3.3,1,-4c1.3,-2.7,23.83,-20.7,67.5,-54\nc44.2,-33.3,65.8,-50.3,66.5,-51c1.3,-1.3,3,-2,5,-2c4.7,0,8.7,3.3,12,10\ns173,378,173,378c0.7,0,35.3,-71,104,-213c68.7,-142,137.5,-285,206.5,-429\nc69,-144,104.5,-217.7,106.5,-221\nl" + extraVinculum / 2.075 + " -" + extraVinculum + "\nc5.3,-9.3,12,-14,20,-14\nH400000v" + (40 + extraVinculum) + "H845.2724\ns-225.272,467,-225.272,467s-235,486,-235,486c-2.7,4.7,-9,7,-19,7\nc-6,0,-10,-1,-12,-3s-194,-422,-194,-422s-65,47,-65,47z\nM" + (834 + extraVinculum) + " " + hLinePad + "h400000v" + (40 + extraVinculum) + "h-400000z";
};

var sqrtSize1 = function sqrtSize1(extraVinculum, hLinePad) {
  // size1 is from glyph U221A in the font KaTeX_Size1-Regular
  return "M263," + (601 + extraVinculum + hLinePad) + "c0.7,0,18,39.7,52,119\nc34,79.3,68.167,158.7,102.5,238c34.3,79.3,51.8,119.3,52.5,120\nc340,-704.7,510.7,-1060.3,512,-1067\nl" + extraVinculum / 2.084 + " -" + extraVinculum + "\nc4.7,-7.3,11,-11,19,-11\nH40000v" + (40 + extraVinculum) + "H1012.3\ns-271.3,567,-271.3,567c-38.7,80.7,-84,175,-136,283c-52,108,-89.167,185.3,-111.5,232\nc-22.3,46.7,-33.8,70.3,-34.5,71c-4.7,4.7,-12.3,7,-23,7s-12,-1,-12,-1\ns-109,-253,-109,-253c-72.7,-168,-109.3,-252,-110,-252c-10.7,8,-22,16.7,-34,26\nc-22,17.3,-33.3,26,-34,26s-26,-26,-26,-26s76,-59,76,-59s76,-60,76,-60z\nM" + (1001 + extraVinculum) + " " + hLinePad + "h400000v" + (40 + extraVinculum) + "h-400000z";
};

var sqrtSize2 = function sqrtSize2(extraVinculum, hLinePad) {
  // size2 is from glyph U221A in the font KaTeX_Size2-Regular
  return "M983 " + (10 + extraVinculum + hLinePad) + "\nl" + extraVinculum / 3.13 + " -" + extraVinculum + "\nc4,-6.7,10,-10,18,-10 H400000v" + (40 + extraVinculum) + "\nH1013.1s-83.4,268,-264.1,840c-180.7,572,-277,876.3,-289,913c-4.7,4.7,-12.7,7,-24,7\ns-12,0,-12,0c-1.3,-3.3,-3.7,-11.7,-7,-25c-35.3,-125.3,-106.7,-373.3,-214,-744\nc-10,12,-21,25,-33,39s-32,39,-32,39c-6,-5.3,-15,-14,-27,-26s25,-30,25,-30\nc26.7,-32.7,52,-63,76,-91s52,-60,52,-60s208,722,208,722\nc56,-175.3,126.3,-397.3,211,-666c84.7,-268.7,153.8,-488.2,207.5,-658.5\nc53.7,-170.3,84.5,-266.8,92.5,-289.5z\nM" + (1001 + extraVinculum) + " " + hLinePad + "h400000v" + (40 + extraVinculum) + "h-400000z";
};

var sqrtSize3 = function sqrtSize3(extraVinculum, hLinePad) {
  // size3 is from glyph U221A in the font KaTeX_Size3-Regular
  return "M424," + (2398 + extraVinculum + hLinePad) + "\nc-1.3,-0.7,-38.5,-172,-111.5,-514c-73,-342,-109.8,-513.3,-110.5,-514\nc0,-2,-10.7,14.3,-32,49c-4.7,7.3,-9.8,15.7,-15.5,25c-5.7,9.3,-9.8,16,-12.5,20\ns-5,7,-5,7c-4,-3.3,-8.3,-7.7,-13,-13s-13,-13,-13,-13s76,-122,76,-122s77,-121,77,-121\ns209,968,209,968c0,-2,84.7,-361.7,254,-1079c169.3,-717.3,254.7,-1077.7,256,-1081\nl" + extraVinculum / 4.223 + " -" + extraVinculum + "c4,-6.7,10,-10,18,-10 H400000\nv" + (40 + extraVinculum) + "H1014.6\ns-87.3,378.7,-272.6,1166c-185.3,787.3,-279.3,1182.3,-282,1185\nc-2,6,-10,9,-24,9\nc-8,0,-12,-0.7,-12,-2z M" + (1001 + extraVinculum) + " " + hLinePad + "\nh400000v" + (40 + extraVinculum) + "h-400000z";
};

var sqrtSize4 = function sqrtSize4(extraVinculum, hLinePad) {
  // size4 is from glyph U221A in the font KaTeX_Size4-Regular
  return "M473," + (2713 + extraVinculum + hLinePad) + "\nc339.3,-1799.3,509.3,-2700,510,-2702 l" + extraVinculum / 5.298 + " -" + extraVinculum + "\nc3.3,-7.3,9.3,-11,18,-11 H400000v" + (40 + extraVinculum) + "H1017.7\ns-90.5,478,-276.2,1466c-185.7,988,-279.5,1483,-281.5,1485c-2,6,-10,9,-24,9\nc-8,0,-12,-0.7,-12,-2c0,-1.3,-5.3,-32,-16,-92c-50.7,-293.3,-119.7,-693.3,-207,-1200\nc0,-1.3,-5.3,8.7,-16,30c-10.7,21.3,-21.3,42.7,-32,64s-16,33,-16,33s-26,-26,-26,-26\ns76,-153,76,-153s77,-151,77,-151c0.7,0.7,35.7,202,105,604c67.3,400.7,102,602.7,104,\n606zM" + (1001 + extraVinculum) + " " + hLinePad + "h400000v" + (40 + extraVinculum) + "H1017.7z";
};

var phasePath = function phasePath(y) {
  var x = y / 2; // x coordinate at top of angle

  return "M400000 " + y + " H0 L" + x + " 0 l65 45 L145 " + (y - 80) + " H400000z";
};

var sqrtTall = function sqrtTall(extraVinculum, hLinePad, viewBoxHeight) {
  // sqrtTall is from glyph U23B7 in the font KaTeX_Size4-Regular
  // One path edge has a variable length. It runs vertically from the vinculum
  // to a point near (14 units) the bottom of the surd. The vinculum
  // is normally 40 units thick. So the length of the line in question is:
  var vertSegment = viewBoxHeight - 54 - hLinePad - extraVinculum;
  return "M702 " + (extraVinculum + hLinePad) + "H400000" + (40 + extraVinculum) + "\nH742v" + vertSegment + "l-4 4-4 4c-.667.7 -2 1.5-4 2.5s-4.167 1.833-6.5 2.5-5.5 1-9.5 1\nh-12l-28-84c-16.667-52-96.667 -294.333-240-727l-212 -643 -85 170\nc-4-3.333-8.333-7.667-13 -13l-13-13l77-155 77-156c66 199.333 139 419.667\n219 661 l218 661zM702 " + hLinePad + "H400000v" + (40 + extraVinculum) + "H742z";
};

var sqrtPath = function sqrtPath(size, extraVinculum, viewBoxHeight) {
  extraVinculum = 1000 * extraVinculum; // Convert from document ems to viewBox.

  var path = "";

  switch (size) {
    case "sqrtMain":
      path = sqrtMain(extraVinculum, hLinePad);
      break;

    case "sqrtSize1":
      path = sqrtSize1(extraVinculum, hLinePad);
      break;

    case "sqrtSize2":
      path = sqrtSize2(extraVinculum, hLinePad);
      break;

    case "sqrtSize3":
      path = sqrtSize3(extraVinculum, hLinePad);
      break;

    case "sqrtSize4":
      path = sqrtSize4(extraVinculum, hLinePad);
      break;

    case "sqrtTall":
      path = sqrtTall(extraVinculum, hLinePad, viewBoxHeight);
  }

  return path;
};
var innerPath = function innerPath(name, height) {
  // The inner part of stretchy tall delimiters
  switch (name) {
    case "\u239c":
      return "M291 0 H417 V" + height + " H291z M291 0 H417 V" + height + " H291z";

    case "\u2223":
      return "M145 0 H188 V" + height + " H145z M145 0 H188 V" + height + " H145z";

    case "\u2225":
      return "M145 0 H188 V" + height + " H145z M145 0 H188 V" + height + " H145z" + ("M367 0 H410 V" + height + " H367z M367 0 H410 V" + height + " H367z");

    case "\u239f":
      return "M457 0 H583 V" + height + " H457z M457 0 H583 V" + height + " H457z";

    case "\u23a2":
      return "M319 0 H403 V" + height + " H319z M319 0 H403 V" + height + " H319z";

    case "\u23a5":
      return "M263 0 H347 V" + height + " H263z M263 0 H347 V" + height + " H263z";

    case "\u23aa":
      return "M384 0 H504 V" + height + " H384z M384 0 H504 V" + height + " H384z";

    case "\u23d0":
      return "M312 0 H355 V" + height + " H312z M312 0 H355 V" + height + " H312z";

    case "\u2016":
      return "M257 0 H300 V" + height + " H257z M257 0 H300 V" + height + " H257z" + ("M478 0 H521 V" + height + " H478z M478 0 H521 V" + height + " H478z");

    default:
      return "";
  }
};
var path = {
  // The doubleleftarrow geometry is from glyph U+21D0 in the font KaTeX Main
  doubleleftarrow: "M262 157\nl10-10c34-36 62.7-77 86-123 3.3-8 5-13.3 5-16 0-5.3-6.7-8-20-8-7.3\n 0-12.2.5-14.5 1.5-2.3 1-4.8 4.5-7.5 10.5-49.3 97.3-121.7 169.3-217 216-28\n 14-57.3 25-88 33-6.7 2-11 3.8-13 5.5-2 1.7-3 4.2-3 7.5s1 5.8 3 7.5\nc2 1.7 6.3 3.5 13 5.5 68 17.3 128.2 47.8 180.5 91.5 52.3 43.7 93.8 96.2 124.5\n 157.5 9.3 8 15.3 12.3 18 13h6c12-.7 18-4 18-10 0-2-1.7-7-5-15-23.3-46-52-87\n-86-123l-10-10h399738v-40H218c328 0 0 0 0 0l-10-8c-26.7-20-65.7-43-117-69 2.7\n-2 6-3.7 10-5 36.7-16 72.3-37.3 107-64l10-8h399782v-40z\nm8 0v40h399730v-40zm0 194v40h399730v-40z",
  // doublerightarrow is from glyph U+21D2 in font KaTeX Main
  doublerightarrow: "M399738 392l\n-10 10c-34 36-62.7 77-86 123-3.3 8-5 13.3-5 16 0 5.3 6.7 8 20 8 7.3 0 12.2-.5\n 14.5-1.5 2.3-1 4.8-4.5 7.5-10.5 49.3-97.3 121.7-169.3 217-216 28-14 57.3-25 88\n-33 6.7-2 11-3.8 13-5.5 2-1.7 3-4.2 3-7.5s-1-5.8-3-7.5c-2-1.7-6.3-3.5-13-5.5-68\n-17.3-128.2-47.8-180.5-91.5-52.3-43.7-93.8-96.2-124.5-157.5-9.3-8-15.3-12.3-18\n-13h-6c-12 .7-18 4-18 10 0 2 1.7 7 5 15 23.3 46 52 87 86 123l10 10H0v40h399782\nc-328 0 0 0 0 0l10 8c26.7 20 65.7 43 117 69-2.7 2-6 3.7-10 5-36.7 16-72.3 37.3\n-107 64l-10 8H0v40zM0 157v40h399730v-40zm0 194v40h399730v-40z",
  // leftarrow is from glyph U+2190 in font KaTeX Main
  leftarrow: "M400000 241H110l3-3c68.7-52.7 113.7-120\n 135-202 4-14.7 6-23 6-25 0-7.3-7-11-21-11-8 0-13.2.8-15.5 2.5-2.3 1.7-4.2 5.8\n-5.5 12.5-1.3 4.7-2.7 10.3-4 17-12 48.7-34.8 92-68.5 130S65.3 228.3 18 247\nc-10 4-16 7.7-18 11 0 8.7 6 14.3 18 17 47.3 18.7 87.8 47 121.5 85S196 441.3 208\n 490c.7 2 1.3 5 2 9s1.2 6.7 1.5 8c.3 1.3 1 3.3 2 6s2.2 4.5 3.5 5.5c1.3 1 3.3\n 1.8 6 2.5s6 1 10 1c14 0 21-3.7 21-11 0-2-2-10.3-6-25-20-79.3-65-146.7-135-202\n l-3-3h399890zM100 241v40h399900v-40z",
  // overbrace is from glyphs U+23A9/23A8/23A7 in font KaTeX_Size4-Regular
  leftbrace: "M6 548l-6-6v-35l6-11c56-104 135.3-181.3 238-232 57.3-28.7 117\n-45 179-50h399577v120H403c-43.3 7-81 15-113 26-100.7 33-179.7 91-237 174-2.7\n 5-6 9-10 13-.7 1-7.3 1-20 1H6z",
  leftbraceunder: "M0 6l6-6h17c12.688 0 19.313.3 20 1 4 4 7.313 8.3 10 13\n 35.313 51.3 80.813 93.8 136.5 127.5 55.688 33.7 117.188 55.8 184.5 66.5.688\n 0 2 .3 4 1 18.688 2.7 76 4.3 172 5h399450v120H429l-6-1c-124.688-8-235-61.7\n-331-161C60.687 138.7 32.312 99.3 7 54L0 41V6z",
  // overgroup is from the MnSymbol package (public domain)
  leftgroup: "M400000 80\nH435C64 80 168.3 229.4 21 260c-5.9 1.2-18 0-18 0-2 0-3-1-3-3v-38C76 61 257 0\n 435 0h399565z",
  leftgroupunder: "M400000 262\nH435C64 262 168.3 112.6 21 82c-5.9-1.2-18 0-18 0-2 0-3 1-3 3v38c76 158 257 219\n 435 219h399565z",
  // Harpoons are from glyph U+21BD in font KaTeX Main
  leftharpoon: "M0 267c.7 5.3 3 10 7 14h399993v-40H93c3.3\n-3.3 10.2-9.5 20.5-18.5s17.8-15.8 22.5-20.5c50.7-52 88-110.3 112-175 4-11.3 5\n-18.3 3-21-1.3-4-7.3-6-18-6-8 0-13 .7-15 2s-4.7 6.7-8 16c-42 98.7-107.3 174.7\n-196 228-6.7 4.7-10.7 8-12 10-1.3 2-2 5.7-2 11zm100-26v40h399900v-40z",
  leftharpoonplus: "M0 267c.7 5.3 3 10 7 14h399993v-40H93c3.3-3.3 10.2-9.5\n 20.5-18.5s17.8-15.8 22.5-20.5c50.7-52 88-110.3 112-175 4-11.3 5-18.3 3-21-1.3\n-4-7.3-6-18-6-8 0-13 .7-15 2s-4.7 6.7-8 16c-42 98.7-107.3 174.7-196 228-6.7 4.7\n-10.7 8-12 10-1.3 2-2 5.7-2 11zm100-26v40h399900v-40zM0 435v40h400000v-40z\nm0 0v40h400000v-40z",
  leftharpoondown: "M7 241c-4 4-6.333 8.667-7 14 0 5.333.667 9 2 11s5.333\n 5.333 12 10c90.667 54 156 130 196 228 3.333 10.667 6.333 16.333 9 17 2 .667 5\n 1 9 1h5c10.667 0 16.667-2 18-6 2-2.667 1-9.667-3-21-32-87.333-82.667-157.667\n-152-211l-3-3h399907v-40zM93 281 H400000 v-40L7 241z",
  leftharpoondownplus: "M7 435c-4 4-6.3 8.7-7 14 0 5.3.7 9 2 11s5.3 5.3 12\n 10c90.7 54 156 130 196 228 3.3 10.7 6.3 16.3 9 17 2 .7 5 1 9 1h5c10.7 0 16.7\n-2 18-6 2-2.7 1-9.7-3-21-32-87.3-82.7-157.7-152-211l-3-3h399907v-40H7zm93 0\nv40h399900v-40zM0 241v40h399900v-40zm0 0v40h399900v-40z",
  // hook is from glyph U+21A9 in font KaTeX Main
  lefthook: "M400000 281 H103s-33-11.2-61-33.5S0 197.3 0 164s14.2-61.2 42.5\n-83.5C70.8 58.2 104 47 142 47 c16.7 0 25 6.7 25 20 0 12-8.7 18.7-26 20-40 3.3\n-68.7 15.7-86 37-10 12-15 25.3-15 40 0 22.7 9.8 40.7 29.5 54 19.7 13.3 43.5 21\n 71.5 23h399859zM103 281v-40h399897v40z",
  leftlinesegment: "M40 281 V428 H0 V94 H40 V241 H400000 v40z\nM40 281 V428 H0 V94 H40 V241 H400000 v40z",
  leftmapsto: "M40 281 V448H0V74H40V241H400000v40z\nM40 281 V448H0V74H40V241H400000v40z",
  // tofrom is from glyph U+21C4 in font KaTeX AMS Regular
  leftToFrom: "M0 147h400000v40H0zm0 214c68 40 115.7 95.7 143 167h22c15.3 0 23\n-.3 23-1 0-1.3-5.3-13.7-16-37-18-35.3-41.3-69-70-101l-7-8h399905v-40H95l7-8\nc28.7-32 52-65.7 70-101 10.7-23.3 16-35.7 16-37 0-.7-7.7-1-23-1h-22C115.7 265.3\n 68 321 0 361zm0-174v-40h399900v40zm100 154v40h399900v-40z",
  longequal: "M0 50 h400000 v40H0z m0 194h40000v40H0z\nM0 50 h400000 v40H0z m0 194h40000v40H0z",
  midbrace: "M200428 334\nc-100.7-8.3-195.3-44-280-108-55.3-42-101.7-93-139-153l-9-14c-2.7 4-5.7 8.7-9 14\n-53.3 86.7-123.7 153-211 199-66.7 36-137.3 56.3-212 62H0V214h199568c178.3-11.7\n 311.7-78.3 403-201 6-8 9.7-12 11-12 .7-.7 6.7-1 18-1s17.3.3 18 1c1.3 0 5 4 11\n 12 44.7 59.3 101.3 106.3 170 141s145.3 54.3 229 60h199572v120z",
  midbraceunder: "M199572 214\nc100.7 8.3 195.3 44 280 108 55.3 42 101.7 93 139 153l9 14c2.7-4 5.7-8.7 9-14\n 53.3-86.7 123.7-153 211-199 66.7-36 137.3-56.3 212-62h199568v120H200432c-178.3\n 11.7-311.7 78.3-403 201-6 8-9.7 12-11 12-.7.7-6.7 1-18 1s-17.3-.3-18-1c-1.3 0\n-5-4-11-12-44.7-59.3-101.3-106.3-170-141s-145.3-54.3-229-60H0V214z",
  oiintSize1: "M512.6 71.6c272.6 0 320.3 106.8 320.3 178.2 0 70.8-47.7 177.6\n-320.3 177.6S193.1 320.6 193.1 249.8c0-71.4 46.9-178.2 319.5-178.2z\nm368.1 178.2c0-86.4-60.9-215.4-368.1-215.4-306.4 0-367.3 129-367.3 215.4 0 85.8\n60.9 214.8 367.3 214.8 307.2 0 368.1-129 368.1-214.8z",
  oiintSize2: "M757.8 100.1c384.7 0 451.1 137.6 451.1 230 0 91.3-66.4 228.8\n-451.1 228.8-386.3 0-452.7-137.5-452.7-228.8 0-92.4 66.4-230 452.7-230z\nm502.4 230c0-111.2-82.4-277.2-502.4-277.2s-504 166-504 277.2\nc0 110 84 276 504 276s502.4-166 502.4-276z",
  oiiintSize1: "M681.4 71.6c408.9 0 480.5 106.8 480.5 178.2 0 70.8-71.6 177.6\n-480.5 177.6S202.1 320.6 202.1 249.8c0-71.4 70.5-178.2 479.3-178.2z\nm525.8 178.2c0-86.4-86.8-215.4-525.7-215.4-437.9 0-524.7 129-524.7 215.4 0\n85.8 86.8 214.8 524.7 214.8 438.9 0 525.7-129 525.7-214.8z",
  oiiintSize2: "M1021.2 53c603.6 0 707.8 165.8 707.8 277.2 0 110-104.2 275.8\n-707.8 275.8-606 0-710.2-165.8-710.2-275.8C311 218.8 415.2 53 1021.2 53z\nm770.4 277.1c0-131.2-126.4-327.6-770.5-327.6S248.4 198.9 248.4 330.1\nc0 130 128.8 326.4 772.7 326.4s770.5-196.4 770.5-326.4z",
  rightarrow: "M0 241v40h399891c-47.3 35.3-84 78-110 128\n-16.7 32-27.7 63.7-33 95 0 1.3-.2 2.7-.5 4-.3 1.3-.5 2.3-.5 3 0 7.3 6.7 11 20\n 11 8 0 13.2-.8 15.5-2.5 2.3-1.7 4.2-5.5 5.5-11.5 2-13.3 5.7-27 11-41 14.7-44.7\n 39-84.5 73-119.5s73.7-60.2 119-75.5c6-2 9-5.7 9-11s-3-9-9-11c-45.3-15.3-85\n-40.5-119-75.5s-58.3-74.8-73-119.5c-4.7-14-8.3-27.3-11-40-1.3-6.7-3.2-10.8-5.5\n-12.5-2.3-1.7-7.5-2.5-15.5-2.5-14 0-21 3.7-21 11 0 2 2 10.3 6 25 20.7 83.3 67\n 151.7 139 205zm0 0v40h399900v-40z",
  rightbrace: "M400000 542l\n-6 6h-17c-12.7 0-19.3-.3-20-1-4-4-7.3-8.3-10-13-35.3-51.3-80.8-93.8-136.5-127.5\ns-117.2-55.8-184.5-66.5c-.7 0-2-.3-4-1-18.7-2.7-76-4.3-172-5H0V214h399571l6 1\nc124.7 8 235 61.7 331 161 31.3 33.3 59.7 72.7 85 118l7 13v35z",
  rightbraceunder: "M399994 0l6 6v35l-6 11c-56 104-135.3 181.3-238 232-57.3\n 28.7-117 45-179 50H-300V214h399897c43.3-7 81-15 113-26 100.7-33 179.7-91 237\n-174 2.7-5 6-9 10-13 .7-1 7.3-1 20-1h17z",
  rightgroup: "M0 80h399565c371 0 266.7 149.4 414 180 5.9 1.2 18 0 18 0 2 0\n 3-1 3-3v-38c-76-158-257-219-435-219H0z",
  rightgroupunder: "M0 262h399565c371 0 266.7-149.4 414-180 5.9-1.2 18 0 18\n 0 2 0 3 1 3 3v38c-76 158-257 219-435 219H0z",
  rightharpoon: "M0 241v40h399993c4.7-4.7 7-9.3 7-14 0-9.3\n-3.7-15.3-11-18-92.7-56.7-159-133.7-199-231-3.3-9.3-6-14.7-8-16-2-1.3-7-2-15-2\n-10.7 0-16.7 2-18 6-2 2.7-1 9.7 3 21 15.3 42 36.7 81.8 64 119.5 27.3 37.7 58\n 69.2 92 94.5zm0 0v40h399900v-40z",
  rightharpoonplus: "M0 241v40h399993c4.7-4.7 7-9.3 7-14 0-9.3-3.7-15.3-11\n-18-92.7-56.7-159-133.7-199-231-3.3-9.3-6-14.7-8-16-2-1.3-7-2-15-2-10.7 0-16.7\n 2-18 6-2 2.7-1 9.7 3 21 15.3 42 36.7 81.8 64 119.5 27.3 37.7 58 69.2 92 94.5z\nm0 0v40h399900v-40z m100 194v40h399900v-40zm0 0v40h399900v-40z",
  rightharpoondown: "M399747 511c0 7.3 6.7 11 20 11 8 0 13-.8 15-2.5s4.7-6.8\n 8-15.5c40-94 99.3-166.3 178-217 13.3-8 20.3-12.3 21-13 5.3-3.3 8.5-5.8 9.5\n-7.5 1-1.7 1.5-5.2 1.5-10.5s-2.3-10.3-7-15H0v40h399908c-34 25.3-64.7 57-92 95\n-27.3 38-48.7 77.7-64 119-3.3 8.7-5 14-5 16zM0 241v40h399900v-40z",
  rightharpoondownplus: "M399747 705c0 7.3 6.7 11 20 11 8 0 13-.8\n 15-2.5s4.7-6.8 8-15.5c40-94 99.3-166.3 178-217 13.3-8 20.3-12.3 21-13 5.3-3.3\n 8.5-5.8 9.5-7.5 1-1.7 1.5-5.2 1.5-10.5s-2.3-10.3-7-15H0v40h399908c-34 25.3\n-64.7 57-92 95-27.3 38-48.7 77.7-64 119-3.3 8.7-5 14-5 16zM0 435v40h399900v-40z\nm0-194v40h400000v-40zm0 0v40h400000v-40z",
  righthook: "M399859 241c-764 0 0 0 0 0 40-3.3 68.7-15.7 86-37 10-12 15-25.3\n 15-40 0-22.7-9.8-40.7-29.5-54-19.7-13.3-43.5-21-71.5-23-17.3-1.3-26-8-26-20 0\n-13.3 8.7-20 26-20 38 0 71 11.2 99 33.5 0 0 7 5.6 21 16.7 14 11.2 21 33.5 21\n 66.8s-14 61.2-42 83.5c-28 22.3-61 33.5-99 33.5L0 241z M0 281v-40h399859v40z",
  rightlinesegment: "M399960 241 V94 h40 V428 h-40 V281 H0 v-40z\nM399960 241 V94 h40 V428 h-40 V281 H0 v-40z",
  rightToFrom: "M400000 167c-70.7-42-118-97.7-142-167h-23c-15.3 0-23 .3-23\n 1 0 1.3 5.3 13.7 16 37 18 35.3 41.3 69 70 101l7 8H0v40h399905l-7 8c-28.7 32\n-52 65.7-70 101-10.7 23.3-16 35.7-16 37 0 .7 7.7 1 23 1h23c24-69.3 71.3-125 142\n-167z M100 147v40h399900v-40zM0 341v40h399900v-40z",
  // twoheadleftarrow is from glyph U+219E in font KaTeX AMS Regular
  twoheadleftarrow: "M0 167c68 40\n 115.7 95.7 143 167h22c15.3 0 23-.3 23-1 0-1.3-5.3-13.7-16-37-18-35.3-41.3-69\n-70-101l-7-8h125l9 7c50.7 39.3 85 86 103 140h46c0-4.7-6.3-18.7-19-42-18-35.3\n-40-67.3-66-96l-9-9h399716v-40H284l9-9c26-28.7 48-60.7 66-96 12.7-23.333 19\n-37.333 19-42h-46c-18 54-52.3 100.7-103 140l-9 7H95l7-8c28.7-32 52-65.7 70-101\n 10.7-23.333 16-35.7 16-37 0-.7-7.7-1-23-1h-22C115.7 71.3 68 127 0 167z",
  twoheadrightarrow: "M400000 167\nc-68-40-115.7-95.7-143-167h-22c-15.3 0-23 .3-23 1 0 1.3 5.3 13.7 16 37 18 35.3\n 41.3 69 70 101l7 8h-125l-9-7c-50.7-39.3-85-86-103-140h-46c0 4.7 6.3 18.7 19 42\n 18 35.3 40 67.3 66 96l9 9H0v40h399716l-9 9c-26 28.7-48 60.7-66 96-12.7 23.333\n-19 37.333-19 42h46c18-54 52.3-100.7 103-140l9-7h125l-7 8c-28.7 32-52 65.7-70\n 101-10.7 23.333-16 35.7-16 37 0 .7 7.7 1 23 1h22c27.3-71.3 75-127 143-167z",
  // tilde1 is a modified version of a glyph from the MnSymbol package
  tilde1: "M200 55.538c-77 0-168 73.953-177 73.953-3 0-7\n-2.175-9-5.437L2 97c-1-2-2-4-2-6 0-4 2-7 5-9l20-12C116 12 171 0 207 0c86 0\n 114 68 191 68 78 0 168-68 177-68 4 0 7 2 9 5l12 19c1 2.175 2 4.35 2 6.525 0\n 4.35-2 7.613-5 9.788l-19 13.05c-92 63.077-116.937 75.308-183 76.128\n-68.267.847-113-73.952-191-73.952z",
  // ditto tilde2, tilde3, & tilde4
  tilde2: "M344 55.266c-142 0-300.638 81.316-311.5 86.418\n-8.01 3.762-22.5 10.91-23.5 5.562L1 120c-1-2-1-3-1-4 0-5 3-9 8-10l18.4-9C160.9\n 31.9 283 0 358 0c148 0 188 122 331 122s314-97 326-97c4 0 8 2 10 7l7 21.114\nc1 2.14 1 3.21 1 4.28 0 5.347-3 9.626-7 10.696l-22.3 12.622C852.6 158.372 751\n 181.476 676 181.476c-149 0-189-126.21-332-126.21z",
  tilde3: "M786 59C457 59 32 175.242 13 175.242c-6 0-10-3.457\n-11-10.37L.15 138c-1-7 3-12 10-13l19.2-6.4C378.4 40.7 634.3 0 804.3 0c337 0\n 411.8 157 746.8 157 328 0 754-112 773-112 5 0 10 3 11 9l1 14.075c1 8.066-.697\n 16.595-6.697 17.492l-21.052 7.31c-367.9 98.146-609.15 122.696-778.15 122.696\n -338 0-409-156.573-744-156.573z",
  tilde4: "M786 58C457 58 32 177.487 13 177.487c-6 0-10-3.345\n-11-10.035L.15 143c-1-7 3-12 10-13l22-6.7C381.2 35 637.15 0 807.15 0c337 0 409\n 177 744 177 328 0 754-127 773-127 5 0 10 3 11 9l1 14.794c1 7.805-3 13.38-9\n 14.495l-20.7 5.574c-366.85 99.79-607.3 139.372-776.3 139.372-338 0-409\n -175.236-744-175.236z",
  // vec is from glyph U+20D7 in font KaTeX Main
  vec: "M377 20c0-5.333 1.833-10 5.5-14S391 0 397 0c4.667 0 8.667 1.667 12 5\n3.333 2.667 6.667 9 10 19 6.667 24.667 20.333 43.667 41 57 7.333 4.667 11\n10.667 11 18 0 6-1 10-3 12s-6.667 5-14 9c-28.667 14.667-53.667 35.667-75 63\n-1.333 1.333-3.167 3.5-5.5 6.5s-4 4.833-5 5.5c-1 .667-2.5 1.333-4.5 2s-4.333 1\n-7 1c-4.667 0-9.167-1.833-13.5-5.5S337 184 337 178c0-12.667 15.667-32.333 47-59\nH213l-171-1c-8.667-6-13-12.333-13-19 0-4.667 4.333-11.333 13-20h359\nc-16-25.333-24-45-24-59z",
  // widehat1 is a modified version of a glyph from the MnSymbol package
  widehat1: "M529 0h5l519 115c5 1 9 5 9 10 0 1-1 2-1 3l-4 22\nc-1 5-5 9-11 9h-2L532 67 19 159h-2c-5 0-9-4-11-9l-5-22c-1-6 2-12 8-13z",
  // ditto widehat2, widehat3, & widehat4
  widehat2: "M1181 0h2l1171 176c6 0 10 5 10 11l-2 23c-1 6-5 10\n-11 10h-1L1182 67 15 220h-1c-6 0-10-4-11-10l-2-23c-1-6 4-11 10-11z",
  widehat3: "M1181 0h2l1171 236c6 0 10 5 10 11l-2 23c-1 6-5 10\n-11 10h-1L1182 67 15 280h-1c-6 0-10-4-11-10l-2-23c-1-6 4-11 10-11z",
  widehat4: "M1181 0h2l1171 296c6 0 10 5 10 11l-2 23c-1 6-5 10\n-11 10h-1L1182 67 15 340h-1c-6 0-10-4-11-10l-2-23c-1-6 4-11 10-11z",
  // widecheck paths are all inverted versions of widehat
  widecheck1: "M529,159h5l519,-115c5,-1,9,-5,9,-10c0,-1,-1,-2,-1,-3l-4,-22c-1,\n-5,-5,-9,-11,-9h-2l-512,92l-513,-92h-2c-5,0,-9,4,-11,9l-5,22c-1,6,2,12,8,13z",
  widecheck2: "M1181,220h2l1171,-176c6,0,10,-5,10,-11l-2,-23c-1,-6,-5,-10,\n-11,-10h-1l-1168,153l-1167,-153h-1c-6,0,-10,4,-11,10l-2,23c-1,6,4,11,10,11z",
  widecheck3: "M1181,280h2l1171,-236c6,0,10,-5,10,-11l-2,-23c-1,-6,-5,-10,\n-11,-10h-1l-1168,213l-1167,-213h-1c-6,0,-10,4,-11,10l-2,23c-1,6,4,11,10,11z",
  widecheck4: "M1181,340h2l1171,-296c6,0,10,-5,10,-11l-2,-23c-1,-6,-5,-10,\n-11,-10h-1l-1168,273l-1167,-273h-1c-6,0,-10,4,-11,10l-2,23c-1,6,4,11,10,11z",
  // The next ten paths support reaction arrows from the mhchem package.
  // Arrows for \ce{<-->} are offset from xAxis by 0.22ex, per mhchem in LaTeX
  // baraboveleftarrow is mostly from glyph U+2190 in font KaTeX Main
  baraboveleftarrow: "M400000 620h-399890l3 -3c68.7 -52.7 113.7 -120 135 -202\nc4 -14.7 6 -23 6 -25c0 -7.3 -7 -11 -21 -11c-8 0 -13.2 0.8 -15.5 2.5\nc-2.3 1.7 -4.2 5.8 -5.5 12.5c-1.3 4.7 -2.7 10.3 -4 17c-12 48.7 -34.8 92 -68.5 130\ns-74.2 66.3 -121.5 85c-10 4 -16 7.7 -18 11c0 8.7 6 14.3 18 17c47.3 18.7 87.8 47\n121.5 85s56.5 81.3 68.5 130c0.7 2 1.3 5 2 9s1.2 6.7 1.5 8c0.3 1.3 1 3.3 2 6\ns2.2 4.5 3.5 5.5c1.3 1 3.3 1.8 6 2.5s6 1 10 1c14 0 21 -3.7 21 -11\nc0 -2 -2 -10.3 -6 -25c-20 -79.3 -65 -146.7 -135 -202l-3 -3h399890z\nM100 620v40h399900v-40z M0 241v40h399900v-40zM0 241v40h399900v-40z",
  // rightarrowabovebar is mostly from glyph U+2192, KaTeX Main
  rightarrowabovebar: "M0 241v40h399891c-47.3 35.3-84 78-110 128-16.7 32\n-27.7 63.7-33 95 0 1.3-.2 2.7-.5 4-.3 1.3-.5 2.3-.5 3 0 7.3 6.7 11 20 11 8 0\n13.2-.8 15.5-2.5 2.3-1.7 4.2-5.5 5.5-11.5 2-13.3 5.7-27 11-41 14.7-44.7 39\n-84.5 73-119.5s73.7-60.2 119-75.5c6-2 9-5.7 9-11s-3-9-9-11c-45.3-15.3-85-40.5\n-119-75.5s-58.3-74.8-73-119.5c-4.7-14-8.3-27.3-11-40-1.3-6.7-3.2-10.8-5.5\n-12.5-2.3-1.7-7.5-2.5-15.5-2.5-14 0-21 3.7-21 11 0 2 2 10.3 6 25 20.7 83.3 67\n151.7 139 205zm96 379h399894v40H0zm0 0h399904v40H0z",
  // The short left harpoon has 0.5em (i.e. 500 units) kern on the left end.
  // Ref from mhchem.sty: \rlap{\raisebox{-.22ex}{$\kern0.5em
  baraboveshortleftharpoon: "M507,435c-4,4,-6.3,8.7,-7,14c0,5.3,0.7,9,2,11\nc1.3,2,5.3,5.3,12,10c90.7,54,156,130,196,228c3.3,10.7,6.3,16.3,9,17\nc2,0.7,5,1,9,1c0,0,5,0,5,0c10.7,0,16.7,-2,18,-6c2,-2.7,1,-9.7,-3,-21\nc-32,-87.3,-82.7,-157.7,-152,-211c0,0,-3,-3,-3,-3l399351,0l0,-40\nc-398570,0,-399437,0,-399437,0z M593 435 v40 H399500 v-40z\nM0 281 v-40 H399908 v40z M0 281 v-40 H399908 v40z",
  rightharpoonaboveshortbar: "M0,241 l0,40c399126,0,399993,0,399993,0\nc4.7,-4.7,7,-9.3,7,-14c0,-9.3,-3.7,-15.3,-11,-18c-92.7,-56.7,-159,-133.7,-199,\n-231c-3.3,-9.3,-6,-14.7,-8,-16c-2,-1.3,-7,-2,-15,-2c-10.7,0,-16.7,2,-18,6\nc-2,2.7,-1,9.7,3,21c15.3,42,36.7,81.8,64,119.5c27.3,37.7,58,69.2,92,94.5z\nM0 241 v40 H399908 v-40z M0 475 v-40 H399500 v40z M0 475 v-40 H399500 v40z",
  shortbaraboveleftharpoon: "M7,435c-4,4,-6.3,8.7,-7,14c0,5.3,0.7,9,2,11\nc1.3,2,5.3,5.3,12,10c90.7,54,156,130,196,228c3.3,10.7,6.3,16.3,9,17c2,0.7,5,1,9,\n1c0,0,5,0,5,0c10.7,0,16.7,-2,18,-6c2,-2.7,1,-9.7,-3,-21c-32,-87.3,-82.7,-157.7,\n-152,-211c0,0,-3,-3,-3,-3l399907,0l0,-40c-399126,0,-399993,0,-399993,0z\nM93 435 v40 H400000 v-40z M500 241 v40 H400000 v-40z M500 241 v40 H400000 v-40z",
  shortrightharpoonabovebar: "M53,241l0,40c398570,0,399437,0,399437,0\nc4.7,-4.7,7,-9.3,7,-14c0,-9.3,-3.7,-15.3,-11,-18c-92.7,-56.7,-159,-133.7,-199,\n-231c-3.3,-9.3,-6,-14.7,-8,-16c-2,-1.3,-7,-2,-15,-2c-10.7,0,-16.7,2,-18,6\nc-2,2.7,-1,9.7,3,21c15.3,42,36.7,81.8,64,119.5c27.3,37.7,58,69.2,92,94.5z\nM500 241 v40 H399408 v-40z M500 435 v40 H400000 v-40z"
};
var tallDelim = function tallDelim(label, midHeight) {
  switch (label) {
    case "lbrack":
      return "M403 1759 V84 H666 V0 H319 V1759 v" + midHeight + " v1759 h347 v-84\nH403z M403 1759 V0 H319 V1759 v" + midHeight + " v1759 h84z";

    case "rbrack":
      return "M347 1759 V0 H0 V84 H263 V1759 v" + midHeight + " v1759 H0 v84 H347z\nM347 1759 V0 H263 V1759 v" + midHeight + " v1759 h84z";

    case "vert":
      return "M145 15 v585 v" + midHeight + " v585 c2.667,10,9.667,15,21,15\nc10,0,16.667,-5,20,-15 v-585 v" + -midHeight + " v-585 c-2.667,-10,-9.667,-15,-21,-15\nc-10,0,-16.667,5,-20,15z M188 15 H145 v585 v" + midHeight + " v585 h43z";

    case "doublevert":
      return "M145 15 v585 v" + midHeight + " v585 c2.667,10,9.667,15,21,15\nc10,0,16.667,-5,20,-15 v-585 v" + -midHeight + " v-585 c-2.667,-10,-9.667,-15,-21,-15\nc-10,0,-16.667,5,-20,15z M188 15 H145 v585 v" + midHeight + " v585 h43z\nM367 15 v585 v" + midHeight + " v585 c2.667,10,9.667,15,21,15\nc10,0,16.667,-5,20,-15 v-585 v" + -midHeight + " v-585 c-2.667,-10,-9.667,-15,-21,-15\nc-10,0,-16.667,5,-20,15z M410 15 H367 v585 v" + midHeight + " v585 h43z";

    case "lfloor":
      return "M319 602 V0 H403 V602 v" + midHeight + " v1715 h263 v84 H319z\nMM319 602 V0 H403 V602 v" + midHeight + " v1715 H319z";

    case "rfloor":
      return "M319 602 V0 H403 V602 v" + midHeight + " v1799 H0 v-84 H319z\nMM319 602 V0 H403 V602 v" + midHeight + " v1715 H319z";

    case "lceil":
      return "M403 1759 V84 H666 V0 H319 V1759 v" + midHeight + " v602 h84z\nM403 1759 V0 H319 V1759 v" + midHeight + " v602 h84z";

    case "rceil":
      return "M347 1759 V0 H0 V84 H263 V1759 v" + midHeight + " v602 h84z\nM347 1759 V0 h-84 V1759 v" + midHeight + " v602 h84z";

    case "lparen":
      return "M863,9c0,-2,-2,-5,-6,-9c0,0,-17,0,-17,0c-12.7,0,-19.3,0.3,-20,1\nc-5.3,5.3,-10.3,11,-15,17c-242.7,294.7,-395.3,682,-458,1162c-21.3,163.3,-33.3,349,\n-36,557 l0," + (midHeight + 84) + "c0.2,6,0,26,0,60c2,159.3,10,310.7,24,454c53.3,528,210,\n949.7,470,1265c4.7,6,9.7,11.7,15,17c0.7,0.7,7,1,19,1c0,0,18,0,18,0c4,-4,6,-7,6,-9\nc0,-2.7,-3.3,-8.7,-10,-18c-135.3,-192.7,-235.5,-414.3,-300.5,-665c-65,-250.7,-102.5,\n-544.7,-112.5,-882c-2,-104,-3,-167,-3,-189\nl0,-" + (midHeight + 92) + "c0,-162.7,5.7,-314,17,-454c20.7,-272,63.7,-513,129,-723c65.3,\n-210,155.3,-396.3,270,-559c6.7,-9.3,10,-15.3,10,-18z";

    case "rparen":
      return "M76,0c-16.7,0,-25,3,-25,9c0,2,2,6.3,6,13c21.3,28.7,42.3,60.3,\n63,95c96.7,156.7,172.8,332.5,228.5,527.5c55.7,195,92.8,416.5,111.5,664.5\nc11.3,139.3,17,290.7,17,454c0,28,1.7,43,3.3,45l0," + (midHeight + 9) + "\nc-3,4,-3.3,16.7,-3.3,38c0,162,-5.7,313.7,-17,455c-18.7,248,-55.8,469.3,-111.5,664\nc-55.7,194.7,-131.8,370.3,-228.5,527c-20.7,34.7,-41.7,66.3,-63,95c-2,3.3,-4,7,-6,11\nc0,7.3,5.7,11,17,11c0,0,11,0,11,0c9.3,0,14.3,-0.3,15,-1c5.3,-5.3,10.3,-11,15,-17\nc242.7,-294.7,395.3,-681.7,458,-1161c21.3,-164.7,33.3,-350.7,36,-558\nl0,-" + (midHeight + 144) + "c-2,-159.3,-10,-310.7,-24,-454c-53.3,-528,-210,-949.7,\n-470,-1265c-4.7,-6,-9.7,-11.7,-15,-17c-0.7,-0.7,-6.7,-1,-18,-1z";

    default:
      // We should not ever get here.
      throw new Error("Unknown stretchy delimiter.");
  }
};

/**
 * This node represents a document fragment, which contains elements, but when
 * placed into the DOM doesn't have any representation itself. It only contains
 * children and doesn't have any DOM node properties.
 */
class DocumentFragment {
  // HtmlDomNode
  // Never used; needed for satisfying interface.
  constructor(children) {
    this.children = void 0;
    this.classes = void 0;
    this.height = void 0;
    this.depth = void 0;
    this.maxFontSize = void 0;
    this.style = void 0;
    this.children = children;
    this.classes = [];
    this.height = 0;
    this.depth = 0;
    this.maxFontSize = 0;
    this.style = {};
  }

  hasClass(className) {
    return utils.contains(this.classes, className);
  }
  /** Convert the fragment into a node. */


  toNode() {
    var frag = document.createDocumentFragment();

    for (var i = 0; i < this.children.length; i++) {
      frag.appendChild(this.children[i].toNode());
    }

    return frag;
  }
  /** Convert the fragment into HTML markup. */


  toMarkup() {
    var markup = ""; // Simply concatenate the markup for the children together.

    for (var i = 0; i < this.children.length; i++) {
      markup += this.children[i].toMarkup();
    }

    return markup;
  }
  /**
   * Converts the math node into a string, similar to innerText. Applies to
   * MathDomNode's only.
   */


  toText() {
    // To avoid this, we would subclass documentFragment separately for
    // MathML, but polyfills for subclassing is expensive per PR 1469.
    // $FlowFixMe: Only works for ChildType = MathDomNode.
    var toText = child => child.toText();

    return this.children.map(toText).join("");
  }

}

// This file is GENERATED by buildMetrics.sh. DO NOT MODIFY.
var fontMetricsData = {
  "AMS-Regular": {
    "32": [0, 0, 0, 0, 0.25],
    "65": [0, 0.68889, 0, 0, 0.72222],
    "66": [0, 0.68889, 0, 0, 0.66667],
    "67": [0, 0.68889, 0, 0, 0.72222],
    "68": [0, 0.68889, 0, 0, 0.72222],
    "69": [0, 0.68889, 0, 0, 0.66667],
    "70": [0, 0.68889, 0, 0, 0.61111],
    "71": [0, 0.68889, 0, 0, 0.77778],
    "72": [0, 0.68889, 0, 0, 0.77778],
    "73": [0, 0.68889, 0, 0, 0.38889],
    "74": [0.16667, 0.68889, 0, 0, 0.5],
    "75": [0, 0.68889, 0, 0, 0.77778],
    "76": [0, 0.68889, 0, 0, 0.66667],
    "77": [0, 0.68889, 0, 0, 0.94445],
    "78": [0, 0.68889, 0, 0, 0.72222],
    "79": [0.16667, 0.68889, 0, 0, 0.77778],
    "80": [0, 0.68889, 0, 0, 0.61111],
    "81": [0.16667, 0.68889, 0, 0, 0.77778],
    "82": [0, 0.68889, 0, 0, 0.72222],
    "83": [0, 0.68889, 0, 0, 0.55556],
    "84": [0, 0.68889, 0, 0, 0.66667],
    "85": [0, 0.68889, 0, 0, 0.72222],
    "86": [0, 0.68889, 0, 0, 0.72222],
    "87": [0, 0.68889, 0, 0, 1.0],
    "88": [0, 0.68889, 0, 0, 0.72222],
    "89": [0, 0.68889, 0, 0, 0.72222],
    "90": [0, 0.68889, 0, 0, 0.66667],
    "107": [0, 0.68889, 0, 0, 0.55556],
    "160": [0, 0, 0, 0, 0.25],
    "165": [0, 0.675, 0.025, 0, 0.75],
    "174": [0.15559, 0.69224, 0, 0, 0.94666],
    "240": [0, 0.68889, 0, 0, 0.55556],
    "295": [0, 0.68889, 0, 0, 0.54028],
    "710": [0, 0.825, 0, 0, 2.33334],
    "732": [0, 0.9, 0, 0, 2.33334],
    "770": [0, 0.825, 0, 0, 2.33334],
    "771": [0, 0.9, 0, 0, 2.33334],
    "989": [0.08167, 0.58167, 0, 0, 0.77778],
    "1008": [0, 0.43056, 0.04028, 0, 0.66667],
    "8245": [0, 0.54986, 0, 0, 0.275],
    "8463": [0, 0.68889, 0, 0, 0.54028],
    "8487": [0, 0.68889, 0, 0, 0.72222],
    "8498": [0, 0.68889, 0, 0, 0.55556],
    "8502": [0, 0.68889, 0, 0, 0.66667],
    "8503": [0, 0.68889, 0, 0, 0.44445],
    "8504": [0, 0.68889, 0, 0, 0.66667],
    "8513": [0, 0.68889, 0, 0, 0.63889],
    "8592": [-0.03598, 0.46402, 0, 0, 0.5],
    "8594": [-0.03598, 0.46402, 0, 0, 0.5],
    "8602": [-0.13313, 0.36687, 0, 0, 1.0],
    "8603": [-0.13313, 0.36687, 0, 0, 1.0],
    "8606": [0.01354, 0.52239, 0, 0, 1.0],
    "8608": [0.01354, 0.52239, 0, 0, 1.0],
    "8610": [0.01354, 0.52239, 0, 0, 1.11111],
    "8611": [0.01354, 0.52239, 0, 0, 1.11111],
    "8619": [0, 0.54986, 0, 0, 1.0],
    "8620": [0, 0.54986, 0, 0, 1.0],
    "8621": [-0.13313, 0.37788, 0, 0, 1.38889],
    "8622": [-0.13313, 0.36687, 0, 0, 1.0],
    "8624": [0, 0.69224, 0, 0, 0.5],
    "8625": [0, 0.69224, 0, 0, 0.5],
    "8630": [0, 0.43056, 0, 0, 1.0],
    "8631": [0, 0.43056, 0, 0, 1.0],
    "8634": [0.08198, 0.58198, 0, 0, 0.77778],
    "8635": [0.08198, 0.58198, 0, 0, 0.77778],
    "8638": [0.19444, 0.69224, 0, 0, 0.41667],
    "8639": [0.19444, 0.69224, 0, 0, 0.41667],
    "8642": [0.19444, 0.69224, 0, 0, 0.41667],
    "8643": [0.19444, 0.69224, 0, 0, 0.41667],
    "8644": [0.1808, 0.675, 0, 0, 1.0],
    "8646": [0.1808, 0.675, 0, 0, 1.0],
    "8647": [0.1808, 0.675, 0, 0, 1.0],
    "8648": [0.19444, 0.69224, 0, 0, 0.83334],
    "8649": [0.1808, 0.675, 0, 0, 1.0],
    "8650": [0.19444, 0.69224, 0, 0, 0.83334],
    "8651": [0.01354, 0.52239, 0, 0, 1.0],
    "8652": [0.01354, 0.52239, 0, 0, 1.0],
    "8653": [-0.13313, 0.36687, 0, 0, 1.0],
    "8654": [-0.13313, 0.36687, 0, 0, 1.0],
    "8655": [-0.13313, 0.36687, 0, 0, 1.0],
    "8666": [0.13667, 0.63667, 0, 0, 1.0],
    "8667": [0.13667, 0.63667, 0, 0, 1.0],
    "8669": [-0.13313, 0.37788, 0, 0, 1.0],
    "8672": [-0.064, 0.437, 0, 0, 1.334],
    "8674": [-0.064, 0.437, 0, 0, 1.334],
    "8705": [0, 0.825, 0, 0, 0.5],
    "8708": [0, 0.68889, 0, 0, 0.55556],
    "8709": [0.08167, 0.58167, 0, 0, 0.77778],
    "8717": [0, 0.43056, 0, 0, 0.42917],
    "8722": [-0.03598, 0.46402, 0, 0, 0.5],
    "8724": [0.08198, 0.69224, 0, 0, 0.77778],
    "8726": [0.08167, 0.58167, 0, 0, 0.77778],
    "8733": [0, 0.69224, 0, 0, 0.77778],
    "8736": [0, 0.69224, 0, 0, 0.72222],
    "8737": [0, 0.69224, 0, 0, 0.72222],
    "8738": [0.03517, 0.52239, 0, 0, 0.72222],
    "8739": [0.08167, 0.58167, 0, 0, 0.22222],
    "8740": [0.25142, 0.74111, 0, 0, 0.27778],
    "8741": [0.08167, 0.58167, 0, 0, 0.38889],
    "8742": [0.25142, 0.74111, 0, 0, 0.5],
    "8756": [0, 0.69224, 0, 0, 0.66667],
    "8757": [0, 0.69224, 0, 0, 0.66667],
    "8764": [-0.13313, 0.36687, 0, 0, 0.77778],
    "8765": [-0.13313, 0.37788, 0, 0, 0.77778],
    "8769": [-0.13313, 0.36687, 0, 0, 0.77778],
    "8770": [-0.03625, 0.46375, 0, 0, 0.77778],
    "8774": [0.30274, 0.79383, 0, 0, 0.77778],
    "8776": [-0.01688, 0.48312, 0, 0, 0.77778],
    "8778": [0.08167, 0.58167, 0, 0, 0.77778],
    "8782": [0.06062, 0.54986, 0, 0, 0.77778],
    "8783": [0.06062, 0.54986, 0, 0, 0.77778],
    "8785": [0.08198, 0.58198, 0, 0, 0.77778],
    "8786": [0.08198, 0.58198, 0, 0, 0.77778],
    "8787": [0.08198, 0.58198, 0, 0, 0.77778],
    "8790": [0, 0.69224, 0, 0, 0.77778],
    "8791": [0.22958, 0.72958, 0, 0, 0.77778],
    "8796": [0.08198, 0.91667, 0, 0, 0.77778],
    "8806": [0.25583, 0.75583, 0, 0, 0.77778],
    "8807": [0.25583, 0.75583, 0, 0, 0.77778],
    "8808": [0.25142, 0.75726, 0, 0, 0.77778],
    "8809": [0.25142, 0.75726, 0, 0, 0.77778],
    "8812": [0.25583, 0.75583, 0, 0, 0.5],
    "8814": [0.20576, 0.70576, 0, 0, 0.77778],
    "8815": [0.20576, 0.70576, 0, 0, 0.77778],
    "8816": [0.30274, 0.79383, 0, 0, 0.77778],
    "8817": [0.30274, 0.79383, 0, 0, 0.77778],
    "8818": [0.22958, 0.72958, 0, 0, 0.77778],
    "8819": [0.22958, 0.72958, 0, 0, 0.77778],
    "8822": [0.1808, 0.675, 0, 0, 0.77778],
    "8823": [0.1808, 0.675, 0, 0, 0.77778],
    "8828": [0.13667, 0.63667, 0, 0, 0.77778],
    "8829": [0.13667, 0.63667, 0, 0, 0.77778],
    "8830": [0.22958, 0.72958, 0, 0, 0.77778],
    "8831": [0.22958, 0.72958, 0, 0, 0.77778],
    "8832": [0.20576, 0.70576, 0, 0, 0.77778],
    "8833": [0.20576, 0.70576, 0, 0, 0.77778],
    "8840": [0.30274, 0.79383, 0, 0, 0.77778],
    "8841": [0.30274, 0.79383, 0, 0, 0.77778],
    "8842": [0.13597, 0.63597, 0, 0, 0.77778],
    "8843": [0.13597, 0.63597, 0, 0, 0.77778],
    "8847": [0.03517, 0.54986, 0, 0, 0.77778],
    "8848": [0.03517, 0.54986, 0, 0, 0.77778],
    "8858": [0.08198, 0.58198, 0, 0, 0.77778],
    "8859": [0.08198, 0.58198, 0, 0, 0.77778],
    "8861": [0.08198, 0.58198, 0, 0, 0.77778],
    "8862": [0, 0.675, 0, 0, 0.77778],
    "8863": [0, 0.675, 0, 0, 0.77778],
    "8864": [0, 0.675, 0, 0, 0.77778],
    "8865": [0, 0.675, 0, 0, 0.77778],
    "8872": [0, 0.69224, 0, 0, 0.61111],
    "8873": [0, 0.69224, 0, 0, 0.72222],
    "8874": [0, 0.69224, 0, 0, 0.88889],
    "8876": [0, 0.68889, 0, 0, 0.61111],
    "8877": [0, 0.68889, 0, 0, 0.61111],
    "8878": [0, 0.68889, 0, 0, 0.72222],
    "8879": [0, 0.68889, 0, 0, 0.72222],
    "8882": [0.03517, 0.54986, 0, 0, 0.77778],
    "8883": [0.03517, 0.54986, 0, 0, 0.77778],
    "8884": [0.13667, 0.63667, 0, 0, 0.77778],
    "8885": [0.13667, 0.63667, 0, 0, 0.77778],
    "8888": [0, 0.54986, 0, 0, 1.11111],
    "8890": [0.19444, 0.43056, 0, 0, 0.55556],
    "8891": [0.19444, 0.69224, 0, 0, 0.61111],
    "8892": [0.19444, 0.69224, 0, 0, 0.61111],
    "8901": [0, 0.54986, 0, 0, 0.27778],
    "8903": [0.08167, 0.58167, 0, 0, 0.77778],
    "8905": [0.08167, 0.58167, 0, 0, 0.77778],
    "8906": [0.08167, 0.58167, 0, 0, 0.77778],
    "8907": [0, 0.69224, 0, 0, 0.77778],
    "8908": [0, 0.69224, 0, 0, 0.77778],
    "8909": [-0.03598, 0.46402, 0, 0, 0.77778],
    "8910": [0, 0.54986, 0, 0, 0.76042],
    "8911": [0, 0.54986, 0, 0, 0.76042],
    "8912": [0.03517, 0.54986, 0, 0, 0.77778],
    "8913": [0.03517, 0.54986, 0, 0, 0.77778],
    "8914": [0, 0.54986, 0, 0, 0.66667],
    "8915": [0, 0.54986, 0, 0, 0.66667],
    "8916": [0, 0.69224, 0, 0, 0.66667],
    "8918": [0.0391, 0.5391, 0, 0, 0.77778],
    "8919": [0.0391, 0.5391, 0, 0, 0.77778],
    "8920": [0.03517, 0.54986, 0, 0, 1.33334],
    "8921": [0.03517, 0.54986, 0, 0, 1.33334],
    "8922": [0.38569, 0.88569, 0, 0, 0.77778],
    "8923": [0.38569, 0.88569, 0, 0, 0.77778],
    "8926": [0.13667, 0.63667, 0, 0, 0.77778],
    "8927": [0.13667, 0.63667, 0, 0, 0.77778],
    "8928": [0.30274, 0.79383, 0, 0, 0.77778],
    "8929": [0.30274, 0.79383, 0, 0, 0.77778],
    "8934": [0.23222, 0.74111, 0, 0, 0.77778],
    "8935": [0.23222, 0.74111, 0, 0, 0.77778],
    "8936": [0.23222, 0.74111, 0, 0, 0.77778],
    "8937": [0.23222, 0.74111, 0, 0, 0.77778],
    "8938": [0.20576, 0.70576, 0, 0, 0.77778],
    "8939": [0.20576, 0.70576, 0, 0, 0.77778],
    "8940": [0.30274, 0.79383, 0, 0, 0.77778],
    "8941": [0.30274, 0.79383, 0, 0, 0.77778],
    "8994": [0.19444, 0.69224, 0, 0, 0.77778],
    "8995": [0.19444, 0.69224, 0, 0, 0.77778],
    "9416": [0.15559, 0.69224, 0, 0, 0.90222],
    "9484": [0, 0.69224, 0, 0, 0.5],
    "9488": [0, 0.69224, 0, 0, 0.5],
    "9492": [0, 0.37788, 0, 0, 0.5],
    "9496": [0, 0.37788, 0, 0, 0.5],
    "9585": [0.19444, 0.68889, 0, 0, 0.88889],
    "9586": [0.19444, 0.74111, 0, 0, 0.88889],
    "9632": [0, 0.675, 0, 0, 0.77778],
    "9633": [0, 0.675, 0, 0, 0.77778],
    "9650": [0, 0.54986, 0, 0, 0.72222],
    "9651": [0, 0.54986, 0, 0, 0.72222],
    "9654": [0.03517, 0.54986, 0, 0, 0.77778],
    "9660": [0, 0.54986, 0, 0, 0.72222],
    "9661": [0, 0.54986, 0, 0, 0.72222],
    "9664": [0.03517, 0.54986, 0, 0, 0.77778],
    "9674": [0.11111, 0.69224, 0, 0, 0.66667],
    "9733": [0.19444, 0.69224, 0, 0, 0.94445],
    "10003": [0, 0.69224, 0, 0, 0.83334],
    "10016": [0, 0.69224, 0, 0, 0.83334],
    "10731": [0.11111, 0.69224, 0, 0, 0.66667],
    "10846": [0.19444, 0.75583, 0, 0, 0.61111],
    "10877": [0.13667, 0.63667, 0, 0, 0.77778],
    "10878": [0.13667, 0.63667, 0, 0, 0.77778],
    "10885": [0.25583, 0.75583, 0, 0, 0.77778],
    "10886": [0.25583, 0.75583, 0, 0, 0.77778],
    "10887": [0.13597, 0.63597, 0, 0, 0.77778],
    "10888": [0.13597, 0.63597, 0, 0, 0.77778],
    "10889": [0.26167, 0.75726, 0, 0, 0.77778],
    "10890": [0.26167, 0.75726, 0, 0, 0.77778],
    "10891": [0.48256, 0.98256, 0, 0, 0.77778],
    "10892": [0.48256, 0.98256, 0, 0, 0.77778],
    "10901": [0.13667, 0.63667, 0, 0, 0.77778],
    "10902": [0.13667, 0.63667, 0, 0, 0.77778],
    "10933": [0.25142, 0.75726, 0, 0, 0.77778],
    "10934": [0.25142, 0.75726, 0, 0, 0.77778],
    "10935": [0.26167, 0.75726, 0, 0, 0.77778],
    "10936": [0.26167, 0.75726, 0, 0, 0.77778],
    "10937": [0.26167, 0.75726, 0, 0, 0.77778],
    "10938": [0.26167, 0.75726, 0, 0, 0.77778],
    "10949": [0.25583, 0.75583, 0, 0, 0.77778],
    "10950": [0.25583, 0.75583, 0, 0, 0.77778],
    "10955": [0.28481, 0.79383, 0, 0, 0.77778],
    "10956": [0.28481, 0.79383, 0, 0, 0.77778],
    "57350": [0.08167, 0.58167, 0, 0, 0.22222],
    "57351": [0.08167, 0.58167, 0, 0, 0.38889],
    "57352": [0.08167, 0.58167, 0, 0, 0.77778],
    "57353": [0, 0.43056, 0.04028, 0, 0.66667],
    "57356": [0.25142, 0.75726, 0, 0, 0.77778],
    "57357": [0.25142, 0.75726, 0, 0, 0.77778],
    "57358": [0.41951, 0.91951, 0, 0, 0.77778],
    "57359": [0.30274, 0.79383, 0, 0, 0.77778],
    "57360": [0.30274, 0.79383, 0, 0, 0.77778],
    "57361": [0.41951, 0.91951, 0, 0, 0.77778],
    "57366": [0.25142, 0.75726, 0, 0, 0.77778],
    "57367": [0.25142, 0.75726, 0, 0, 0.77778],
    "57368": [0.25142, 0.75726, 0, 0, 0.77778],
    "57369": [0.25142, 0.75726, 0, 0, 0.77778],
    "57370": [0.13597, 0.63597, 0, 0, 0.77778],
    "57371": [0.13597, 0.63597, 0, 0, 0.77778]
  },
  "Caligraphic-Regular": {
    "32": [0, 0, 0, 0, 0.25],
    "65": [0, 0.68333, 0, 0.19445, 0.79847],
    "66": [0, 0.68333, 0.03041, 0.13889, 0.65681],
    "67": [0, 0.68333, 0.05834, 0.13889, 0.52653],
    "68": [0, 0.68333, 0.02778, 0.08334, 0.77139],
    "69": [0, 0.68333, 0.08944, 0.11111, 0.52778],
    "70": [0, 0.68333, 0.09931, 0.11111, 0.71875],
    "71": [0.09722, 0.68333, 0.0593, 0.11111, 0.59487],
    "72": [0, 0.68333, 0.00965, 0.11111, 0.84452],
    "73": [0, 0.68333, 0.07382, 0, 0.54452],
    "74": [0.09722, 0.68333, 0.18472, 0.16667, 0.67778],
    "75": [0, 0.68333, 0.01445, 0.05556, 0.76195],
    "76": [0, 0.68333, 0, 0.13889, 0.68972],
    "77": [0, 0.68333, 0, 0.13889, 1.2009],
    "78": [0, 0.68333, 0.14736, 0.08334, 0.82049],
    "79": [0, 0.68333, 0.02778, 0.11111, 0.79611],
    "80": [0, 0.68333, 0.08222, 0.08334, 0.69556],
    "81": [0.09722, 0.68333, 0, 0.11111, 0.81667],
    "82": [0, 0.68333, 0, 0.08334, 0.8475],
    "83": [0, 0.68333, 0.075, 0.13889, 0.60556],
    "84": [0, 0.68333, 0.25417, 0, 0.54464],
    "85": [0, 0.68333, 0.09931, 0.08334, 0.62583],
    "86": [0, 0.68333, 0.08222, 0, 0.61278],
    "87": [0, 0.68333, 0.08222, 0.08334, 0.98778],
    "88": [0, 0.68333, 0.14643, 0.13889, 0.7133],
    "89": [0.09722, 0.68333, 0.08222, 0.08334, 0.66834],
    "90": [0, 0.68333, 0.07944, 0.13889, 0.72473],
    "160": [0, 0, 0, 0, 0.25]
  },
  "Fraktur-Regular": {
    "32": [0, 0, 0, 0, 0.25],
    "33": [0, 0.69141, 0, 0, 0.29574],
    "34": [0, 0.69141, 0, 0, 0.21471],
    "38": [0, 0.69141, 0, 0, 0.73786],
    "39": [0, 0.69141, 0, 0, 0.21201],
    "40": [0.24982, 0.74947, 0, 0, 0.38865],
    "41": [0.24982, 0.74947, 0, 0, 0.38865],
    "42": [0, 0.62119, 0, 0, 0.27764],
    "43": [0.08319, 0.58283, 0, 0, 0.75623],
    "44": [0, 0.10803, 0, 0, 0.27764],
    "45": [0.08319, 0.58283, 0, 0, 0.75623],
    "46": [0, 0.10803, 0, 0, 0.27764],
    "47": [0.24982, 0.74947, 0, 0, 0.50181],
    "48": [0, 0.47534, 0, 0, 0.50181],
    "49": [0, 0.47534, 0, 0, 0.50181],
    "50": [0, 0.47534, 0, 0, 0.50181],
    "51": [0.18906, 0.47534, 0, 0, 0.50181],
    "52": [0.18906, 0.47534, 0, 0, 0.50181],
    "53": [0.18906, 0.47534, 0, 0, 0.50181],
    "54": [0, 0.69141, 0, 0, 0.50181],
    "55": [0.18906, 0.47534, 0, 0, 0.50181],
    "56": [0, 0.69141, 0, 0, 0.50181],
    "57": [0.18906, 0.47534, 0, 0, 0.50181],
    "58": [0, 0.47534, 0, 0, 0.21606],
    "59": [0.12604, 0.47534, 0, 0, 0.21606],
    "61": [-0.13099, 0.36866, 0, 0, 0.75623],
    "63": [0, 0.69141, 0, 0, 0.36245],
    "65": [0, 0.69141, 0, 0, 0.7176],
    "66": [0, 0.69141, 0, 0, 0.88397],
    "67": [0, 0.69141, 0, 0, 0.61254],
    "68": [0, 0.69141, 0, 0, 0.83158],
    "69": [0, 0.69141, 0, 0, 0.66278],
    "70": [0.12604, 0.69141, 0, 0, 0.61119],
    "71": [0, 0.69141, 0, 0, 0.78539],
    "72": [0.06302, 0.69141, 0, 0, 0.7203],
    "73": [0, 0.69141, 0, 0, 0.55448],
    "74": [0.12604, 0.69141, 0, 0, 0.55231],
    "75": [0, 0.69141, 0, 0, 0.66845],
    "76": [0, 0.69141, 0, 0, 0.66602],
    "77": [0, 0.69141, 0, 0, 1.04953],
    "78": [0, 0.69141, 0, 0, 0.83212],
    "79": [0, 0.69141, 0, 0, 0.82699],
    "80": [0.18906, 0.69141, 0, 0, 0.82753],
    "81": [0.03781, 0.69141, 0, 0, 0.82699],
    "82": [0, 0.69141, 0, 0, 0.82807],
    "83": [0, 0.69141, 0, 0, 0.82861],
    "84": [0, 0.69141, 0, 0, 0.66899],
    "85": [0, 0.69141, 0, 0, 0.64576],
    "86": [0, 0.69141, 0, 0, 0.83131],
    "87": [0, 0.69141, 0, 0, 1.04602],
    "88": [0, 0.69141, 0, 0, 0.71922],
    "89": [0.18906, 0.69141, 0, 0, 0.83293],
    "90": [0.12604, 0.69141, 0, 0, 0.60201],
    "91": [0.24982, 0.74947, 0, 0, 0.27764],
    "93": [0.24982, 0.74947, 0, 0, 0.27764],
    "94": [0, 0.69141, 0, 0, 0.49965],
    "97": [0, 0.47534, 0, 0, 0.50046],
    "98": [0, 0.69141, 0, 0, 0.51315],
    "99": [0, 0.47534, 0, 0, 0.38946],
    "100": [0, 0.62119, 0, 0, 0.49857],
    "101": [0, 0.47534, 0, 0, 0.40053],
    "102": [0.18906, 0.69141, 0, 0, 0.32626],
    "103": [0.18906, 0.47534, 0, 0, 0.5037],
    "104": [0.18906, 0.69141, 0, 0, 0.52126],
    "105": [0, 0.69141, 0, 0, 0.27899],
    "106": [0, 0.69141, 0, 0, 0.28088],
    "107": [0, 0.69141, 0, 0, 0.38946],
    "108": [0, 0.69141, 0, 0, 0.27953],
    "109": [0, 0.47534, 0, 0, 0.76676],
    "110": [0, 0.47534, 0, 0, 0.52666],
    "111": [0, 0.47534, 0, 0, 0.48885],
    "112": [0.18906, 0.52396, 0, 0, 0.50046],
    "113": [0.18906, 0.47534, 0, 0, 0.48912],
    "114": [0, 0.47534, 0, 0, 0.38919],
    "115": [0, 0.47534, 0, 0, 0.44266],
    "116": [0, 0.62119, 0, 0, 0.33301],
    "117": [0, 0.47534, 0, 0, 0.5172],
    "118": [0, 0.52396, 0, 0, 0.5118],
    "119": [0, 0.52396, 0, 0, 0.77351],
    "120": [0.18906, 0.47534, 0, 0, 0.38865],
    "121": [0.18906, 0.47534, 0, 0, 0.49884],
    "122": [0.18906, 0.47534, 0, 0, 0.39054],
    "160": [0, 0, 0, 0, 0.25],
    "8216": [0, 0.69141, 0, 0, 0.21471],
    "8217": [0, 0.69141, 0, 0, 0.21471],
    "58112": [0, 0.62119, 0, 0, 0.49749],
    "58113": [0, 0.62119, 0, 0, 0.4983],
    "58114": [0.18906, 0.69141, 0, 0, 0.33328],
    "58115": [0.18906, 0.69141, 0, 0, 0.32923],
    "58116": [0.18906, 0.47534, 0, 0, 0.50343],
    "58117": [0, 0.69141, 0, 0, 0.33301],
    "58118": [0, 0.62119, 0, 0, 0.33409],
    "58119": [0, 0.47534, 0, 0, 0.50073]
  },
  "Main-Bold": {
    "32": [0, 0, 0, 0, 0.25],
    "33": [0, 0.69444, 0, 0, 0.35],
    "34": [0, 0.69444, 0, 0, 0.60278],
    "35": [0.19444, 0.69444, 0, 0, 0.95833],
    "36": [0.05556, 0.75, 0, 0, 0.575],
    "37": [0.05556, 0.75, 0, 0, 0.95833],
    "38": [0, 0.69444, 0, 0, 0.89444],
    "39": [0, 0.69444, 0, 0, 0.31944],
    "40": [0.25, 0.75, 0, 0, 0.44722],
    "41": [0.25, 0.75, 0, 0, 0.44722],
    "42": [0, 0.75, 0, 0, 0.575],
    "43": [0.13333, 0.63333, 0, 0, 0.89444],
    "44": [0.19444, 0.15556, 0, 0, 0.31944],
    "45": [0, 0.44444, 0, 0, 0.38333],
    "46": [0, 0.15556, 0, 0, 0.31944],
    "47": [0.25, 0.75, 0, 0, 0.575],
    "48": [0, 0.64444, 0, 0, 0.575],
    "49": [0, 0.64444, 0, 0, 0.575],
    "50": [0, 0.64444, 0, 0, 0.575],
    "51": [0, 0.64444, 0, 0, 0.575],
    "52": [0, 0.64444, 0, 0, 0.575],
    "53": [0, 0.64444, 0, 0, 0.575],
    "54": [0, 0.64444, 0, 0, 0.575],
    "55": [0, 0.64444, 0, 0, 0.575],
    "56": [0, 0.64444, 0, 0, 0.575],
    "57": [0, 0.64444, 0, 0, 0.575],
    "58": [0, 0.44444, 0, 0, 0.31944],
    "59": [0.19444, 0.44444, 0, 0, 0.31944],
    "60": [0.08556, 0.58556, 0, 0, 0.89444],
    "61": [-0.10889, 0.39111, 0, 0, 0.89444],
    "62": [0.08556, 0.58556, 0, 0, 0.89444],
    "63": [0, 0.69444, 0, 0, 0.54305],
    "64": [0, 0.69444, 0, 0, 0.89444],
    "65": [0, 0.68611, 0, 0, 0.86944],
    "66": [0, 0.68611, 0, 0, 0.81805],
    "67": [0, 0.68611, 0, 0, 0.83055],
    "68": [0, 0.68611, 0, 0, 0.88194],
    "69": [0, 0.68611, 0, 0, 0.75555],
    "70": [0, 0.68611, 0, 0, 0.72361],
    "71": [0, 0.68611, 0, 0, 0.90416],
    "72": [0, 0.68611, 0, 0, 0.9],
    "73": [0, 0.68611, 0, 0, 0.43611],
    "74": [0, 0.68611, 0, 0, 0.59444],
    "75": [0, 0.68611, 0, 0, 0.90138],
    "76": [0, 0.68611, 0, 0, 0.69166],
    "77": [0, 0.68611, 0, 0, 1.09166],
    "78": [0, 0.68611, 0, 0, 0.9],
    "79": [0, 0.68611, 0, 0, 0.86388],
    "80": [0, 0.68611, 0, 0, 0.78611],
    "81": [0.19444, 0.68611, 0, 0, 0.86388],
    "82": [0, 0.68611, 0, 0, 0.8625],
    "83": [0, 0.68611, 0, 0, 0.63889],
    "84": [0, 0.68611, 0, 0, 0.8],
    "85": [0, 0.68611, 0, 0, 0.88472],
    "86": [0, 0.68611, 0.01597, 0, 0.86944],
    "87": [0, 0.68611, 0.01597, 0, 1.18888],
    "88": [0, 0.68611, 0, 0, 0.86944],
    "89": [0, 0.68611, 0.02875, 0, 0.86944],
    "90": [0, 0.68611, 0, 0, 0.70277],
    "91": [0.25, 0.75, 0, 0, 0.31944],
    "92": [0.25, 0.75, 0, 0, 0.575],
    "93": [0.25, 0.75, 0, 0, 0.31944],
    "94": [0, 0.69444, 0, 0, 0.575],
    "95": [0.31, 0.13444, 0.03194, 0, 0.575],
    "97": [0, 0.44444, 0, 0, 0.55902],
    "98": [0, 0.69444, 0, 0, 0.63889],
    "99": [0, 0.44444, 0, 0, 0.51111],
    "100": [0, 0.69444, 0, 0, 0.63889],
    "101": [0, 0.44444, 0, 0, 0.52708],
    "102": [0, 0.69444, 0.10903, 0, 0.35139],
    "103": [0.19444, 0.44444, 0.01597, 0, 0.575],
    "104": [0, 0.69444, 0, 0, 0.63889],
    "105": [0, 0.69444, 0, 0, 0.31944],
    "106": [0.19444, 0.69444, 0, 0, 0.35139],
    "107": [0, 0.69444, 0, 0, 0.60694],
    "108": [0, 0.69444, 0, 0, 0.31944],
    "109": [0, 0.44444, 0, 0, 0.95833],
    "110": [0, 0.44444, 0, 0, 0.63889],
    "111": [0, 0.44444, 0, 0, 0.575],
    "112": [0.19444, 0.44444, 0, 0, 0.63889],
    "113": [0.19444, 0.44444, 0, 0, 0.60694],
    "114": [0, 0.44444, 0, 0, 0.47361],
    "115": [0, 0.44444, 0, 0, 0.45361],
    "116": [0, 0.63492, 0, 0, 0.44722],
    "117": [0, 0.44444, 0, 0, 0.63889],
    "118": [0, 0.44444, 0.01597, 0, 0.60694],
    "119": [0, 0.44444, 0.01597, 0, 0.83055],
    "120": [0, 0.44444, 0, 0, 0.60694],
    "121": [0.19444, 0.44444, 0.01597, 0, 0.60694],
    "122": [0, 0.44444, 0, 0, 0.51111],
    "123": [0.25, 0.75, 0, 0, 0.575],
    "124": [0.25, 0.75, 0, 0, 0.31944],
    "125": [0.25, 0.75, 0, 0, 0.575],
    "126": [0.35, 0.34444, 0, 0, 0.575],
    "160": [0, 0, 0, 0, 0.25],
    "163": [0, 0.69444, 0, 0, 0.86853],
    "168": [0, 0.69444, 0, 0, 0.575],
    "172": [0, 0.44444, 0, 0, 0.76666],
    "176": [0, 0.69444, 0, 0, 0.86944],
    "177": [0.13333, 0.63333, 0, 0, 0.89444],
    "184": [0.17014, 0, 0, 0, 0.51111],
    "198": [0, 0.68611, 0, 0, 1.04166],
    "215": [0.13333, 0.63333, 0, 0, 0.89444],
    "216": [0.04861, 0.73472, 0, 0, 0.89444],
    "223": [0, 0.69444, 0, 0, 0.59722],
    "230": [0, 0.44444, 0, 0, 0.83055],
    "247": [0.13333, 0.63333, 0, 0, 0.89444],
    "248": [0.09722, 0.54167, 0, 0, 0.575],
    "305": [0, 0.44444, 0, 0, 0.31944],
    "338": [0, 0.68611, 0, 0, 1.16944],
    "339": [0, 0.44444, 0, 0, 0.89444],
    "567": [0.19444, 0.44444, 0, 0, 0.35139],
    "710": [0, 0.69444, 0, 0, 0.575],
    "711": [0, 0.63194, 0, 0, 0.575],
    "713": [0, 0.59611, 0, 0, 0.575],
    "714": [0, 0.69444, 0, 0, 0.575],
    "715": [0, 0.69444, 0, 0, 0.575],
    "728": [0, 0.69444, 0, 0, 0.575],
    "729": [0, 0.69444, 0, 0, 0.31944],
    "730": [0, 0.69444, 0, 0, 0.86944],
    "732": [0, 0.69444, 0, 0, 0.575],
    "733": [0, 0.69444, 0, 0, 0.575],
    "915": [0, 0.68611, 0, 0, 0.69166],
    "916": [0, 0.68611, 0, 0, 0.95833],
    "920": [0, 0.68611, 0, 0, 0.89444],
    "923": [0, 0.68611, 0, 0, 0.80555],
    "926": [0, 0.68611, 0, 0, 0.76666],
    "928": [0, 0.68611, 0, 0, 0.9],
    "931": [0, 0.68611, 0, 0, 0.83055],
    "933": [0, 0.68611, 0, 0, 0.89444],
    "934": [0, 0.68611, 0, 0, 0.83055],
    "936": [0, 0.68611, 0, 0, 0.89444],
    "937": [0, 0.68611, 0, 0, 0.83055],
    "8211": [0, 0.44444, 0.03194, 0, 0.575],
    "8212": [0, 0.44444, 0.03194, 0, 1.14999],
    "8216": [0, 0.69444, 0, 0, 0.31944],
    "8217": [0, 0.69444, 0, 0, 0.31944],
    "8220": [0, 0.69444, 0, 0, 0.60278],
    "8221": [0, 0.69444, 0, 0, 0.60278],
    "8224": [0.19444, 0.69444, 0, 0, 0.51111],
    "8225": [0.19444, 0.69444, 0, 0, 0.51111],
    "8242": [0, 0.55556, 0, 0, 0.34444],
    "8407": [0, 0.72444, 0.15486, 0, 0.575],
    "8463": [0, 0.69444, 0, 0, 0.66759],
    "8465": [0, 0.69444, 0, 0, 0.83055],
    "8467": [0, 0.69444, 0, 0, 0.47361],
    "8472": [0.19444, 0.44444, 0, 0, 0.74027],
    "8476": [0, 0.69444, 0, 0, 0.83055],
    "8501": [0, 0.69444, 0, 0, 0.70277],
    "8592": [-0.10889, 0.39111, 0, 0, 1.14999],
    "8593": [0.19444, 0.69444, 0, 0, 0.575],
    "8594": [-0.10889, 0.39111, 0, 0, 1.14999],
    "8595": [0.19444, 0.69444, 0, 0, 0.575],
    "8596": [-0.10889, 0.39111, 0, 0, 1.14999],
    "8597": [0.25, 0.75, 0, 0, 0.575],
    "8598": [0.19444, 0.69444, 0, 0, 1.14999],
    "8599": [0.19444, 0.69444, 0, 0, 1.14999],
    "8600": [0.19444, 0.69444, 0, 0, 1.14999],
    "8601": [0.19444, 0.69444, 0, 0, 1.14999],
    "8636": [-0.10889, 0.39111, 0, 0, 1.14999],
    "8637": [-0.10889, 0.39111, 0, 0, 1.14999],
    "8640": [-0.10889, 0.39111, 0, 0, 1.14999],
    "8641": [-0.10889, 0.39111, 0, 0, 1.14999],
    "8656": [-0.10889, 0.39111, 0, 0, 1.14999],
    "8657": [0.19444, 0.69444, 0, 0, 0.70277],
    "8658": [-0.10889, 0.39111, 0, 0, 1.14999],
    "8659": [0.19444, 0.69444, 0, 0, 0.70277],
    "8660": [-0.10889, 0.39111, 0, 0, 1.14999],
    "8661": [0.25, 0.75, 0, 0, 0.70277],
    "8704": [0, 0.69444, 0, 0, 0.63889],
    "8706": [0, 0.69444, 0.06389, 0, 0.62847],
    "8707": [0, 0.69444, 0, 0, 0.63889],
    "8709": [0.05556, 0.75, 0, 0, 0.575],
    "8711": [0, 0.68611, 0, 0, 0.95833],
    "8712": [0.08556, 0.58556, 0, 0, 0.76666],
    "8715": [0.08556, 0.58556, 0, 0, 0.76666],
    "8722": [0.13333, 0.63333, 0, 0, 0.89444],
    "8723": [0.13333, 0.63333, 0, 0, 0.89444],
    "8725": [0.25, 0.75, 0, 0, 0.575],
    "8726": [0.25, 0.75, 0, 0, 0.575],
    "8727": [-0.02778, 0.47222, 0, 0, 0.575],
    "8728": [-0.02639, 0.47361, 0, 0, 0.575],
    "8729": [-0.02639, 0.47361, 0, 0, 0.575],
    "8730": [0.18, 0.82, 0, 0, 0.95833],
    "8733": [0, 0.44444, 0, 0, 0.89444],
    "8734": [0, 0.44444, 0, 0, 1.14999],
    "8736": [0, 0.69224, 0, 0, 0.72222],
    "8739": [0.25, 0.75, 0, 0, 0.31944],
    "8741": [0.25, 0.75, 0, 0, 0.575],
    "8743": [0, 0.55556, 0, 0, 0.76666],
    "8744": [0, 0.55556, 0, 0, 0.76666],
    "8745": [0, 0.55556, 0, 0, 0.76666],
    "8746": [0, 0.55556, 0, 0, 0.76666],
    "8747": [0.19444, 0.69444, 0.12778, 0, 0.56875],
    "8764": [-0.10889, 0.39111, 0, 0, 0.89444],
    "8768": [0.19444, 0.69444, 0, 0, 0.31944],
    "8771": [0.00222, 0.50222, 0, 0, 0.89444],
    "8773": [0.027, 0.638, 0, 0, 0.894],
    "8776": [0.02444, 0.52444, 0, 0, 0.89444],
    "8781": [0.00222, 0.50222, 0, 0, 0.89444],
    "8801": [0.00222, 0.50222, 0, 0, 0.89444],
    "8804": [0.19667, 0.69667, 0, 0, 0.89444],
    "8805": [0.19667, 0.69667, 0, 0, 0.89444],
    "8810": [0.08556, 0.58556, 0, 0, 1.14999],
    "8811": [0.08556, 0.58556, 0, 0, 1.14999],
    "8826": [0.08556, 0.58556, 0, 0, 0.89444],
    "8827": [0.08556, 0.58556, 0, 0, 0.89444],
    "8834": [0.08556, 0.58556, 0, 0, 0.89444],
    "8835": [0.08556, 0.58556, 0, 0, 0.89444],
    "8838": [0.19667, 0.69667, 0, 0, 0.89444],
    "8839": [0.19667, 0.69667, 0, 0, 0.89444],
    "8846": [0, 0.55556, 0, 0, 0.76666],
    "8849": [0.19667, 0.69667, 0, 0, 0.89444],
    "8850": [0.19667, 0.69667, 0, 0, 0.89444],
    "8851": [0, 0.55556, 0, 0, 0.76666],
    "8852": [0, 0.55556, 0, 0, 0.76666],
    "8853": [0.13333, 0.63333, 0, 0, 0.89444],
    "8854": [0.13333, 0.63333, 0, 0, 0.89444],
    "8855": [0.13333, 0.63333, 0, 0, 0.89444],
    "8856": [0.13333, 0.63333, 0, 0, 0.89444],
    "8857": [0.13333, 0.63333, 0, 0, 0.89444],
    "8866": [0, 0.69444, 0, 0, 0.70277],
    "8867": [0, 0.69444, 0, 0, 0.70277],
    "8868": [0, 0.69444, 0, 0, 0.89444],
    "8869": [0, 0.69444, 0, 0, 0.89444],
    "8900": [-0.02639, 0.47361, 0, 0, 0.575],
    "8901": [-0.02639, 0.47361, 0, 0, 0.31944],
    "8902": [-0.02778, 0.47222, 0, 0, 0.575],
    "8968": [0.25, 0.75, 0, 0, 0.51111],
    "8969": [0.25, 0.75, 0, 0, 0.51111],
    "8970": [0.25, 0.75, 0, 0, 0.51111],
    "8971": [0.25, 0.75, 0, 0, 0.51111],
    "8994": [-0.13889, 0.36111, 0, 0, 1.14999],
    "8995": [-0.13889, 0.36111, 0, 0, 1.14999],
    "9651": [0.19444, 0.69444, 0, 0, 1.02222],
    "9657": [-0.02778, 0.47222, 0, 0, 0.575],
    "9661": [0.19444, 0.69444, 0, 0, 1.02222],
    "9667": [-0.02778, 0.47222, 0, 0, 0.575],
    "9711": [0.19444, 0.69444…111524 tokens truncated…of \: should use \medmuskip = 4mu plus 2mu minus 4mu

defineMacro("\\>", "\\mskip{4mu}");
defineMacro("\\:", "\\tmspace+{4mu}{.2222em}"); // \let\medspace\:

defineMacro("\\medspace", "\\:"); // \renewcommand{\;}{\tmspace+\thickmuskip{.2777em}}
// TODO: math mode should use \thickmuskip = 5mu plus 5mu

defineMacro("\\;", "\\tmspace+{5mu}{.2777em}"); // \let\thickspace\;

defineMacro("\\thickspace", "\\;"); // \renewcommand{\!}{\tmspace-\thinmuskip{.1667em}}
// TODO: math mode should use \thinmuskip

defineMacro("\\!", "\\tmspace-{3mu}{.1667em}"); // \let\negthinspace\!

defineMacro("\\negthinspace", "\\!"); // \newcommand{\negmedspace}{\tmspace-\medmuskip{.2222em}}
// TODO: math mode should use \medmuskip

defineMacro("\\negmedspace", "\\tmspace-{4mu}{.2222em}"); // \newcommand{\negthickspace}{\tmspace-\thickmuskip{.2777em}}
// TODO: math mode should use \thickmuskip

defineMacro("\\negthickspace", "\\tmspace-{5mu}{.277em}"); // \def\enspace{\kern.5em }

defineMacro("\\enspace", "\\kern.5em "); // \def\enskip{\hskip.5em\relax}

defineMacro("\\enskip", "\\hskip.5em\\relax"); // \def\quad{\hskip1em\relax}

defineMacro("\\quad", "\\hskip1em\\relax"); // \def\qquad{\hskip2em\relax}

defineMacro("\\qquad", "\\hskip2em\\relax"); // \tag@in@display form of \tag

defineMacro("\\tag", "\\@ifstar\\tag@literal\\tag@paren");
defineMacro("\\tag@paren", "\\tag@literal{({#1})}");
defineMacro("\\tag@literal", context => {
  if (context.macros.get("\\df@tag")) {
    throw new ParseError("Multiple \\tag");
  }

  return "\\gdef\\df@tag{\\text{#1}}";
}); // \renewcommand{\bmod}{\nonscript\mskip-\medmuskip\mkern5mu\mathbin
//   {\operator@font mod}\penalty900
//   \mkern5mu\nonscript\mskip-\medmuskip}
// \newcommand{\pod}[1]{\allowbreak
//   \if@display\mkern18mu\else\mkern8mu\fi(#1)}
// \renewcommand{\pmod}[1]{\pod{{\operator@font mod}\mkern6mu#1}}
// \newcommand{\mod}[1]{\allowbreak\if@display\mkern18mu
//   \else\mkern12mu\fi{\operator@font mod}\,\,#1}
// TODO: math mode should use \medmuskip = 4mu plus 2mu minus 4mu

defineMacro("\\bmod", "\\mathchoice{\\mskip1mu}{\\mskip1mu}{\\mskip5mu}{\\mskip5mu}" + "\\mathbin{\\rm mod}" + "\\mathchoice{\\mskip1mu}{\\mskip1mu}{\\mskip5mu}{\\mskip5mu}");
defineMacro("\\pod", "\\allowbreak" + "\\mathchoice{\\mkern18mu}{\\mkern8mu}{\\mkern8mu}{\\mkern8mu}(#1)");
defineMacro("\\pmod", "\\pod{{\\rm mod}\\mkern6mu#1}");
defineMacro("\\mod", "\\allowbreak" + "\\mathchoice{\\mkern18mu}{\\mkern12mu}{\\mkern12mu}{\\mkern12mu}" + "{\\rm mod}\\,\\,#1"); //////////////////////////////////////////////////////////////////////
// LaTeX source2e
// \expandafter\let\expandafter\@normalcr
//     \csname\expandafter\@gobble\string\\ \endcsname
// \DeclareRobustCommand\newline{\@normalcr\relax}

defineMacro("\\newline", "\\\\\\relax"); // \def\TeX{T\kern-.1667em\lower.5ex\hbox{E}\kern-.125emX\@}
// TODO: Doesn't normally work in math mode because \@ fails.  KaTeX doesn't
// support \@ yet, so that's omitted, and we add \text so that the result
// doesn't look funny in math mode.

defineMacro("\\TeX", "\\textrm{\\html@mathml{" + "T\\kern-.1667em\\raisebox{-.5ex}{E}\\kern-.125emX" + "}{TeX}}"); // \DeclareRobustCommand{\LaTeX}{L\kern-.36em%
//         {\sbox\z@ T%
//          \vbox to\ht\z@{\hbox{\check@mathfonts
//                               \fontsize\sf@size\z@
//                               \math@fontsfalse\selectfont
//                               A}%
//                         \vss}%
//         }%
//         \kern-.15em%
//         \TeX}
// This code aligns the top of the A with the T (from the perspective of TeX's
// boxes, though visually the A appears to extend above slightly).
// We compute the corresponding \raisebox when A is rendered in \normalsize
// \scriptstyle, which has a scale factor of 0.7 (see Options.js).

var latexRaiseA = makeEm(fontMetricsData['Main-Regular']["T".charCodeAt(0)][1] - 0.7 * fontMetricsData['Main-Regular']["A".charCodeAt(0)][1]);
defineMacro("\\LaTeX", "\\textrm{\\html@mathml{" + ("L\\kern-.36em\\raisebox{" + latexRaiseA + "}{\\scriptstyle A}") + "\\kern-.15em\\TeX}{LaTeX}}"); // New KaTeX logo based on tweaking LaTeX logo

defineMacro("\\KaTeX", "\\textrm{\\html@mathml{" + ("K\\kern-.17em\\raisebox{" + latexRaiseA + "}{\\scriptstyle A}") + "\\kern-.15em\\TeX}{KaTeX}}"); // \DeclareRobustCommand\hspace{\@ifstar\@hspacer\@hspace}
// \def\@hspace#1{\hskip  #1\relax}
// \def\@hspacer#1{\vrule \@width\z@\nobreak
//                 \hskip #1\hskip \z@skip}

defineMacro("\\hspace", "\\@ifstar\\@hspacer\\@hspace");
defineMacro("\\@hspace", "\\hskip #1\\relax");
defineMacro("\\@hspacer", "\\rule{0pt}{0pt}\\hskip #1\\relax"); //////////////////////////////////////////////////////////////////////
// mathtools.sty
//\providecommand\ordinarycolon{:}

defineMacro("\\ordinarycolon", ":"); //\def\vcentcolon{\mathrel{\mathop\ordinarycolon}}
//TODO(edemaine): Not yet centered. Fix via \raisebox or #726

defineMacro("\\vcentcolon", "\\mathrel{\\mathop\\ordinarycolon}"); // \providecommand*\dblcolon{\vcentcolon\mathrel{\mkern-.9mu}\vcentcolon}

defineMacro("\\dblcolon", "\\html@mathml{" + "\\mathrel{\\vcentcolon\\mathrel{\\mkern-.9mu}\\vcentcolon}}" + "{\\mathop{\\char\"2237}}"); // \providecommand*\coloneqq{\vcentcolon\mathrel{\mkern-1.2mu}=}

defineMacro("\\coloneqq", "\\html@mathml{" + "\\mathrel{\\vcentcolon\\mathrel{\\mkern-1.2mu}=}}" + "{\\mathop{\\char\"2254}}"); // ≔
// \providecommand*\Coloneqq{\dblcolon\mathrel{\mkern-1.2mu}=}

defineMacro("\\Coloneqq", "\\html@mathml{" + "\\mathrel{\\dblcolon\\mathrel{\\mkern-1.2mu}=}}" + "{\\mathop{\\char\"2237\\char\"3d}}"); // \providecommand*\coloneq{\vcentcolon\mathrel{\mkern-1.2mu}\mathrel{-}}

defineMacro("\\coloneq", "\\html@mathml{" + "\\mathrel{\\vcentcolon\\mathrel{\\mkern-1.2mu}\\mathrel{-}}}" + "{\\mathop{\\char\"3a\\char\"2212}}"); // \providecommand*\Coloneq{\dblcolon\mathrel{\mkern-1.2mu}\mathrel{-}}

defineMacro("\\Coloneq", "\\html@mathml{" + "\\mathrel{\\dblcolon\\mathrel{\\mkern-1.2mu}\\mathrel{-}}}" + "{\\mathop{\\char\"2237\\char\"2212}}"); // \providecommand*\eqqcolon{=\mathrel{\mkern-1.2mu}\vcentcolon}

defineMacro("\\eqqcolon", "\\html@mathml{" + "\\mathrel{=\\mathrel{\\mkern-1.2mu}\\vcentcolon}}" + "{\\mathop{\\char\"2255}}"); // ≕
// \providecommand*\Eqqcolon{=\mathrel{\mkern-1.2mu}\dblcolon}

defineMacro("\\Eqqcolon", "\\html@mathml{" + "\\mathrel{=\\mathrel{\\mkern-1.2mu}\\dblcolon}}" + "{\\mathop{\\char\"3d\\char\"2237}}"); // \providecommand*\eqcolon{\mathrel{-}\mathrel{\mkern-1.2mu}\vcentcolon}

defineMacro("\\eqcolon", "\\html@mathml{" + "\\mathrel{\\mathrel{-}\\mathrel{\\mkern-1.2mu}\\vcentcolon}}" + "{\\mathop{\\char\"2239}}"); // \providecommand*\Eqcolon{\mathrel{-}\mathrel{\mkern-1.2mu}\dblcolon}

defineMacro("\\Eqcolon", "\\html@mathml{" + "\\mathrel{\\mathrel{-}\\mathrel{\\mkern-1.2mu}\\dblcolon}}" + "{\\mathop{\\char\"2212\\char\"2237}}"); // \providecommand*\colonapprox{\vcentcolon\mathrel{\mkern-1.2mu}\approx}

defineMacro("\\colonapprox", "\\html@mathml{" + "\\mathrel{\\vcentcolon\\mathrel{\\mkern-1.2mu}\\approx}}" + "{\\mathop{\\char\"3a\\char\"2248}}"); // \providecommand*\Colonapprox{\dblcolon\mathrel{\mkern-1.2mu}\approx}

defineMacro("\\Colonapprox", "\\html@mathml{" + "\\mathrel{\\dblcolon\\mathrel{\\mkern-1.2mu}\\approx}}" + "{\\mathop{\\char\"2237\\char\"2248}}"); // \providecommand*\colonsim{\vcentcolon\mathrel{\mkern-1.2mu}\sim}

defineMacro("\\colonsim", "\\html@mathml{" + "\\mathrel{\\vcentcolon\\mathrel{\\mkern-1.2mu}\\sim}}" + "{\\mathop{\\char\"3a\\char\"223c}}"); // \providecommand*\Colonsim{\dblcolon\mathrel{\mkern-1.2mu}\sim}

defineMacro("\\Colonsim", "\\html@mathml{" + "\\mathrel{\\dblcolon\\mathrel{\\mkern-1.2mu}\\sim}}" + "{\\mathop{\\char\"2237\\char\"223c}}"); // Some Unicode characters are implemented with macros to mathtools functions.

defineMacro("\u2237", "\\dblcolon"); // ::

defineMacro("\u2239", "\\eqcolon"); // -:

defineMacro("\u2254", "\\coloneqq"); // :=

defineMacro("\u2255", "\\eqqcolon"); // =:

defineMacro("\u2A74", "\\Coloneqq"); // ::=
//////////////////////////////////////////////////////////////////////
// colonequals.sty
// Alternate names for mathtools's macros:

defineMacro("\\ratio", "\\vcentcolon");
defineMacro("\\coloncolon", "\\dblcolon");
defineMacro("\\colonequals", "\\coloneqq");
defineMacro("\\coloncolonequals", "\\Coloneqq");
defineMacro("\\equalscolon", "\\eqqcolon");
defineMacro("\\equalscoloncolon", "\\Eqqcolon");
defineMacro("\\colonminus", "\\coloneq");
defineMacro("\\coloncolonminus", "\\Coloneq");
defineMacro("\\minuscolon", "\\eqcolon");
defineMacro("\\minuscoloncolon", "\\Eqcolon"); // \colonapprox name is same in mathtools and colonequals.

defineMacro("\\coloncolonapprox", "\\Colonapprox"); // \colonsim name is same in mathtools and colonequals.

defineMacro("\\coloncolonsim", "\\Colonsim"); // Additional macros, implemented by analogy with mathtools definitions:

defineMacro("\\simcolon", "\\mathrel{\\sim\\mathrel{\\mkern-1.2mu}\\vcentcolon}");
defineMacro("\\simcoloncolon", "\\mathrel{\\sim\\mathrel{\\mkern-1.2mu}\\dblcolon}");
defineMacro("\\approxcolon", "\\mathrel{\\approx\\mathrel{\\mkern-1.2mu}\\vcentcolon}");
defineMacro("\\approxcoloncolon", "\\mathrel{\\approx\\mathrel{\\mkern-1.2mu}\\dblcolon}"); // Present in newtxmath, pxfonts and txfonts

defineMacro("\\notni", "\\html@mathml{\\not\\ni}{\\mathrel{\\char`\u220C}}");
defineMacro("\\limsup", "\\DOTSB\\operatorname*{lim\\,sup}");
defineMacro("\\liminf", "\\DOTSB\\operatorname*{lim\\,inf}"); //////////////////////////////////////////////////////////////////////
// From amsopn.sty

defineMacro("\\injlim", "\\DOTSB\\operatorname*{inj\\,lim}");
defineMacro("\\projlim", "\\DOTSB\\operatorname*{proj\\,lim}");
defineMacro("\\varlimsup", "\\DOTSB\\operatorname*{\\overline{lim}}");
defineMacro("\\varliminf", "\\DOTSB\\operatorname*{\\underline{lim}}");
defineMacro("\\varinjlim", "\\DOTSB\\operatorname*{\\underrightarrow{lim}}");
defineMacro("\\varprojlim", "\\DOTSB\\operatorname*{\\underleftarrow{lim}}"); //////////////////////////////////////////////////////////////////////
// MathML alternates for KaTeX glyphs in the Unicode private area

defineMacro("\\gvertneqq", "\\html@mathml{\\@gvertneqq}{\u2269}");
defineMacro("\\lvertneqq", "\\html@mathml{\\@lvertneqq}{\u2268}");
defineMacro("\\ngeqq", "\\html@mathml{\\@ngeqq}{\u2271}");
defineMacro("\\ngeqslant", "\\html@mathml{\\@ngeqslant}{\u2271}");
defineMacro("\\nleqq", "\\html@mathml{\\@nleqq}{\u2270}");
defineMacro("\\nleqslant", "\\html@mathml{\\@nleqslant}{\u2270}");
defineMacro("\\nshortmid", "\\html@mathml{\\@nshortmid}{∤}");
defineMacro("\\nshortparallel", "\\html@mathml{\\@nshortparallel}{∦}");
defineMacro("\\nsubseteqq", "\\html@mathml{\\@nsubseteqq}{\u2288}");
defineMacro("\\nsupseteqq", "\\html@mathml{\\@nsupseteqq}{\u2289}");
defineMacro("\\varsubsetneq", "\\html@mathml{\\@varsubsetneq}{⊊}");
defineMacro("\\varsubsetneqq", "\\html@mathml{\\@varsubsetneqq}{⫋}");
defineMacro("\\varsupsetneq", "\\html@mathml{\\@varsupsetneq}{⊋}");
defineMacro("\\varsupsetneqq", "\\html@mathml{\\@varsupsetneqq}{⫌}");
defineMacro("\\imath", "\\html@mathml{\\@imath}{\u0131}");
defineMacro("\\jmath", "\\html@mathml{\\@jmath}{\u0237}"); //////////////////////////////////////////////////////////////////////
// stmaryrd and semantic
// The stmaryrd and semantic packages render the next four items by calling a
// glyph. Those glyphs do not exist in the KaTeX fonts. Hence the macros.

defineMacro("\\llbracket", "\\html@mathml{" + "\\mathopen{[\\mkern-3.2mu[}}" + "{\\mathopen{\\char`\u27e6}}");
defineMacro("\\rrbracket", "\\html@mathml{" + "\\mathclose{]\\mkern-3.2mu]}}" + "{\\mathclose{\\char`\u27e7}}");
defineMacro("\u27e6", "\\llbracket"); // blackboard bold [

defineMacro("\u27e7", "\\rrbracket"); // blackboard bold ]

defineMacro("\\lBrace", "\\html@mathml{" + "\\mathopen{\\{\\mkern-3.2mu[}}" + "{\\mathopen{\\char`\u2983}}");
defineMacro("\\rBrace", "\\html@mathml{" + "\\mathclose{]\\mkern-3.2mu\\}}}" + "{\\mathclose{\\char`\u2984}}");
defineMacro("\u2983", "\\lBrace"); // blackboard bold {

defineMacro("\u2984", "\\rBrace"); // blackboard bold }
// TODO: Create variable sized versions of the last two items. I believe that
// will require new font glyphs.
// The stmaryrd function `\minuso` provides a "Plimsoll" symbol that
// superimposes the characters \circ and \mathminus. Used in chemistry.

defineMacro("\\minuso", "\\mathbin{\\html@mathml{" + "{\\mathrlap{\\mathchoice{\\kern{0.145em}}{\\kern{0.145em}}" + "{\\kern{0.1015em}}{\\kern{0.0725em}}\\circ}{-}}}" + "{\\char`⦵}}");
defineMacro("⦵", "\\minuso"); //////////////////////////////////////////////////////////////////////
// texvc.sty
// The texvc package contains macros available in mediawiki pages.
// We omit the functions deprecated at
// https://en.wikipedia.org/wiki/Help:Displaying_a_formula#Deprecated_syntax
// We also omit texvc's \O, which conflicts with \text{\O}

defineMacro("\\darr", "\\downarrow");
defineMacro("\\dArr", "\\Downarrow");
defineMacro("\\Darr", "\\Downarrow");
defineMacro("\\lang", "\\langle");
defineMacro("\\rang", "\\rangle");
defineMacro("\\uarr", "\\uparrow");
defineMacro("\\uArr", "\\Uparrow");
defineMacro("\\Uarr", "\\Uparrow");
defineMacro("\\N", "\\mathbb{N}");
defineMacro("\\R", "\\mathbb{R}");
defineMacro("\\Z", "\\mathbb{Z}");
defineMacro("\\alef", "\\aleph");
defineMacro("\\alefsym", "\\aleph");
defineMacro("\\Alpha", "\\mathrm{A}");
defineMacro("\\Beta", "\\mathrm{B}");
defineMacro("\\bull", "\\bullet");
defineMacro("\\Chi", "\\mathrm{X}");
defineMacro("\\clubs", "\\clubsuit");
defineMacro("\\cnums", "\\mathbb{C}");
defineMacro("\\Complex", "\\mathbb{C}");
defineMacro("\\Dagger", "\\ddagger");
defineMacro("\\diamonds", "\\diamondsuit");
defineMacro("\\empty", "\\emptyset");
defineMacro("\\Epsilon", "\\mathrm{E}");
defineMacro("\\Eta", "\\mathrm{H}");
defineMacro("\\exist", "\\exists");
defineMacro("\\harr", "\\leftrightarrow");
defineMacro("\\hArr", "\\Leftrightarrow");
defineMacro("\\Harr", "\\Leftrightarrow");
defineMacro("\\hearts", "\\heartsuit");
defineMacro("\\image", "\\Im");
defineMacro("\\infin", "\\infty");
defineMacro("\\Iota", "\\mathrm{I}");
defineMacro("\\isin", "\\in");
defineMacro("\\Kappa", "\\mathrm{K}");
defineMacro("\\larr", "\\leftarrow");
defineMacro("\\lArr", "\\Leftarrow");
defineMacro("\\Larr", "\\Leftarrow");
defineMacro("\\lrarr", "\\leftrightarrow");
defineMacro("\\lrArr", "\\Leftrightarrow");
defineMacro("\\Lrarr", "\\Leftrightarrow");
defineMacro("\\Mu", "\\mathrm{M}");
defineMacro("\\natnums", "\\mathbb{N}");
defineMacro("\\Nu", "\\mathrm{N}");
defineMacro("\\Omicron", "\\mathrm{O}");
defineMacro("\\plusmn", "\\pm");
defineMacro("\\rarr", "\\rightarrow");
defineMacro("\\rArr", "\\Rightarrow");
defineMacro("\\Rarr", "\\Rightarrow");
defineMacro("\\real", "\\Re");
defineMacro("\\reals", "\\mathbb{R}");
defineMacro("\\Reals", "\\mathbb{R}");
defineMacro("\\Rho", "\\mathrm{P}");
defineMacro("\\sdot", "\\cdot");
defineMacro("\\sect", "\\S");
defineMacro("\\spades", "\\spadesuit");
defineMacro("\\sub", "\\subset");
defineMacro("\\sube", "\\subseteq");
defineMacro("\\supe", "\\supseteq");
defineMacro("\\Tau", "\\mathrm{T}");
defineMacro("\\thetasym", "\\vartheta"); // TODO: defineMacro("\\varcoppa", "\\\mbox{\\coppa}");

defineMacro("\\weierp", "\\wp");
defineMacro("\\Zeta", "\\mathrm{Z}"); //////////////////////////////////////////////////////////////////////
// statmath.sty
// https://ctan.math.illinois.edu/macros/latex/contrib/statmath/statmath.pdf

defineMacro("\\argmin", "\\DOTSB\\operatorname*{arg\\,min}");
defineMacro("\\argmax", "\\DOTSB\\operatorname*{arg\\,max}");
defineMacro("\\plim", "\\DOTSB\\mathop{\\operatorname{plim}}\\limits"); //////////////////////////////////////////////////////////////////////
// braket.sty
// http://ctan.math.washington.edu/tex-archive/macros/latex/contrib/braket/braket.pdf

defineMacro("\\bra", "\\mathinner{\\langle{#1}|}");
defineMacro("\\ket", "\\mathinner{|{#1}\\rangle}");
defineMacro("\\braket", "\\mathinner{\\langle{#1}\\rangle}");
defineMacro("\\Bra", "\\left\\langle#1\\right|");
defineMacro("\\Ket", "\\left|#1\\right\\rangle");

var braketHelper = one => context => {
  var left = context.consumeArg().tokens;
  var middle = context.consumeArg().tokens;
  var middleDouble = context.consumeArg().tokens;
  var right = context.consumeArg().tokens;
  var oldMiddle = context.macros.get("|");
  var oldMiddleDouble = context.macros.get("\\|");
  context.macros.beginGroup();

  var midMacro = double => context => {
    if (one) {
      // Only modify the first instance of | or \|
      context.macros.set("|", oldMiddle);

      if (middleDouble.length) {
        context.macros.set("\\|", oldMiddleDouble);
      }
    }

    var doubled = double;

    if (!double && middleDouble.length) {
      // Mimic \@ifnextchar
      var nextToken = context.future();

      if (nextToken.text === "|") {
        context.popToken();
        doubled = true;
      }
    }

    return {
      tokens: doubled ? middleDouble : middle,
      numArgs: 0
    };
  };

  context.macros.set("|", midMacro(false));

  if (middleDouble.length) {
    context.macros.set("\\|", midMacro(true));
  }

  var arg = context.consumeArg().tokens;
  var expanded = context.expandTokens([...right, ...arg, ...left // reversed
  ]);
  context.macros.endGroup();
  return {
    tokens: expanded.reverse(),
    numArgs: 0
  };
};

defineMacro("\\bra@ket", braketHelper(false));
defineMacro("\\bra@set", braketHelper(true));
defineMacro("\\Braket", "\\bra@ket{\\left\\langle}" + "{\\,\\middle\\vert\\,}{\\,\\middle\\vert\\,}{\\right\\rangle}");
defineMacro("\\Set", "\\bra@set{\\left\\{\\:}" + "{\\;\\middle\\vert\\;}{\\;\\middle\\Vert\\;}{\\:\\right\\}}");
defineMacro("\\set", "\\bra@set{\\{\\,}{\\mid}{}{\\,\\}}"); // has no support for special || or \|
//////////////////////////////////////////////////////////////////////
// actuarialangle.dtx

defineMacro("\\angln", "{\\angl n}"); // Custom Khan Academy colors, should be moved to an optional package

defineMacro("\\blue", "\\textcolor{##6495ed}{#1}");
defineMacro("\\orange", "\\textcolor{##ffa500}{#1}");
defineMacro("\\pink", "\\textcolor{##ff00af}{#1}");
defineMacro("\\red", "\\textcolor{##df0030}{#1}");
defineMacro("\\green", "\\textcolor{##28ae7b}{#1}");
defineMacro("\\gray", "\\textcolor{gray}{#1}");
defineMacro("\\purple", "\\textcolor{##9d38bd}{#1}");
defineMacro("\\blueA", "\\textcolor{##ccfaff}{#1}");
defineMacro("\\blueB", "\\textcolor{##80f6ff}{#1}");
defineMacro("\\blueC", "\\textcolor{##63d9ea}{#1}");
defineMacro("\\blueD", "\\textcolor{##11accd}{#1}");
defineMacro("\\blueE", "\\textcolor{##0c7f99}{#1}");
defineMacro("\\tealA", "\\textcolor{##94fff5}{#1}");
defineMacro("\\tealB", "\\textcolor{##26edd5}{#1}");
defineMacro("\\tealC", "\\textcolor{##01d1c1}{#1}");
defineMacro("\\tealD", "\\textcolor{##01a995}{#1}");
defineMacro("\\tealE", "\\textcolor{##208170}{#1}");
defineMacro("\\greenA", "\\textcolor{##b6ffb0}{#1}");
defineMacro("\\greenB", "\\textcolor{##8af281}{#1}");
defineMacro("\\greenC", "\\textcolor{##74cf70}{#1}");
defineMacro("\\greenD", "\\textcolor{##1fab54}{#1}");
defineMacro("\\greenE", "\\textcolor{##0d923f}{#1}");
defineMacro("\\goldA", "\\textcolor{##ffd0a9}{#1}");
defineMacro("\\goldB", "\\textcolor{##ffbb71}{#1}");
defineMacro("\\goldC", "\\textcolor{##ff9c39}{#1}");
defineMacro("\\goldD", "\\textcolor{##e07d10}{#1}");
defineMacro("\\goldE", "\\textcolor{##a75a05}{#1}");
defineMacro("\\redA", "\\textcolor{##fca9a9}{#1}");
defineMacro("\\redB", "\\textcolor{##ff8482}{#1}");
defineMacro("\\redC", "\\textcolor{##f9685d}{#1}");
defineMacro("\\redD", "\\textcolor{##e84d39}{#1}");
defineMacro("\\redE", "\\textcolor{##bc2612}{#1}");
defineMacro("\\maroonA", "\\textcolor{##ffbde0}{#1}");
defineMacro("\\maroonB", "\\textcolor{##ff92c6}{#1}");
defineMacro("\\maroonC", "\\textcolor{##ed5fa6}{#1}");
defineMacro("\\maroonD", "\\textcolor{##ca337c}{#1}");
defineMacro("\\maroonE", "\\textcolor{##9e034e}{#1}");
defineMacro("\\purpleA", "\\textcolor{##ddd7ff}{#1}");
defineMacro("\\purpleB", "\\textcolor{##c6b9fc}{#1}");
defineMacro("\\purpleC", "\\textcolor{##aa87ff}{#1}");
defineMacro("\\purpleD", "\\textcolor{##7854ab}{#1}");
defineMacro("\\purpleE", "\\textcolor{##543b78}{#1}");
defineMacro("\\mintA", "\\textcolor{##f5f9e8}{#1}");
defineMacro("\\mintB", "\\textcolor{##edf2df}{#1}");
defineMacro("\\mintC", "\\textcolor{##e0e5cc}{#1}");
defineMacro("\\grayA", "\\textcolor{##f6f7f7}{#1}");
defineMacro("\\grayB", "\\textcolor{##f0f1f2}{#1}");
defineMacro("\\grayC", "\\textcolor{##e3e5e6}{#1}");
defineMacro("\\grayD", "\\textcolor{##d6d8da}{#1}");
defineMacro("\\grayE", "\\textcolor{##babec2}{#1}");
defineMacro("\\grayF", "\\textcolor{##888d93}{#1}");
defineMacro("\\grayG", "\\textcolor{##626569}{#1}");
defineMacro("\\grayH", "\\textcolor{##3b3e40}{#1}");
defineMacro("\\grayI", "\\textcolor{##21242c}{#1}");
defineMacro("\\kaBlue", "\\textcolor{##314453}{#1}");
defineMacro("\\kaGreen", "\\textcolor{##71B307}{#1}");

/**
 * This file contains the “gullet” where macros are expanded
 * until only non-macro tokens remain.
 */
// List of commands that act like macros but aren't defined as a macro,
// function, or symbol.  Used in `isDefined`.
var implicitCommands = {
  "^": true,
  // Parser.js
  "_": true,
  // Parser.js
  "\\limits": true,
  // Parser.js
  "\\nolimits": true // Parser.js

};
class MacroExpander {
  constructor(input, settings, mode) {
    this.settings = void 0;
    this.expansionCount = void 0;
    this.lexer = void 0;
    this.macros = void 0;
    this.stack = void 0;
    this.mode = void 0;
    this.settings = settings;
    this.expansionCount = 0;
    this.feed(input); // Make new global namespace

    this.macros = new Namespace(macros, settings.macros);
    this.mode = mode;
    this.stack = []; // contains tokens in REVERSE order
  }
  /**
   * Feed a new input string to the same MacroExpander
   * (with existing macros etc.).
   */


  feed(input) {
    this.lexer = new Lexer(input, this.settings);
  }
  /**
   * Switches between "text" and "math" modes.
   */


  switchMode(newMode) {
    this.mode = newMode;
  }
  /**
   * Start a new group nesting within all namespaces.
   */


  beginGroup() {
    this.macros.beginGroup();
  }
  /**
   * End current group nesting within all namespaces.
   */


  endGroup() {
    this.macros.endGroup();
  }
  /**
   * Ends all currently nested groups (if any), restoring values before the
   * groups began.  Useful in case of an error in the middle of parsing.
   */


  endGroups() {
    this.macros.endGroups();
  }
  /**
   * Returns the topmost token on the stack, without expanding it.
   * Similar in behavior to TeX's `\futurelet`.
   */


  future() {
    if (this.stack.length === 0) {
      this.pushToken(this.lexer.lex());
    }

    return this.stack[this.stack.length - 1];
  }
  /**
   * Remove and return the next unexpanded token.
   */


  popToken() {
    this.future(); // ensure non-empty stack

    return this.stack.pop();
  }
  /**
   * Add a given token to the token stack.  In particular, this get be used
   * to put back a token returned from one of the other methods.
   */


  pushToken(token) {
    this.stack.push(token);
  }
  /**
   * Append an array of tokens to the token stack.
   */


  pushTokens(tokens) {
    this.stack.push(...tokens);
  }
  /**
   * Find an macro argument without expanding tokens and append the array of
   * tokens to the token stack. Uses Token as a container for the result.
   */


  scanArgument(isOptional) {
    var start;
    var end;
    var tokens;

    if (isOptional) {
      this.consumeSpaces(); // \@ifnextchar gobbles any space following it

      if (this.future().text !== "[") {
        return null;
      }

      start = this.popToken(); // don't include [ in tokens

      ({
        tokens,
        end
      } = this.consumeArg(["]"]));
    } else {
      ({
        tokens,
        start,
        end
      } = this.consumeArg());
    } // indicate the end of an argument


    this.pushToken(new Token("EOF", end.loc));
    this.pushTokens(tokens);
    return start.range(end, "");
  }
  /**
   * Consume all following space tokens, without expansion.
   */


  consumeSpaces() {
    for (;;) {
      var token = this.future();

      if (token.text === " ") {
        this.stack.pop();
      } else {
        break;
      }
    }
  }
  /**
   * Consume an argument from the token stream, and return the resulting array
   * of tokens and start/end token.
   */


  consumeArg(delims) {
    // The argument for a delimited parameter is the shortest (possibly
    // empty) sequence of tokens with properly nested {...} groups that is
    // followed ... by this particular list of non-parameter tokens.
    // The argument for an undelimited parameter is the next nonblank
    // token, unless that token is ‘{’, when the argument will be the
    // entire {...} group that follows.
    var tokens = [];
    var isDelimited = delims && delims.length > 0;

    if (!isDelimited) {
      // Ignore spaces between arguments.  As the TeXbook says:
      // "After you have said ‘\def\row#1#2{...}’, you are allowed to
      //  put spaces between the arguments (e.g., ‘\row x n’), because
      //  TeX doesn’t use single spaces as undelimited arguments."
      this.consumeSpaces();
    }

    var start = this.future();
    var tok;
    var depth = 0;
    var match = 0;

    do {
      tok = this.popToken();
      tokens.push(tok);

      if (tok.text === "{") {
        ++depth;
      } else if (tok.text === "}") {
        --depth;

        if (depth === -1) {
          throw new ParseError("Extra }", tok);
        }
      } else if (tok.text === "EOF") {
        throw new ParseError("Unexpected end of input in a macro argument" + ", expected '" + (delims && isDelimited ? delims[match] : "}") + "'", tok);
      }

      if (delims && isDelimited) {
        if ((depth === 0 || depth === 1 && delims[match] === "{") && tok.text === delims[match]) {
          ++match;

          if (match === delims.length) {
            // don't include delims in tokens
            tokens.splice(-match, match);
            break;
          }
        } else {
          match = 0;
        }
      }
    } while (depth !== 0 || isDelimited); // If the argument found ... has the form ‘{<nested tokens>}’,
    // ... the outermost braces enclosing the argument are removed


    if (start.text === "{" && tokens[tokens.length - 1].text === "}") {
      tokens.pop();
      tokens.shift();
    }

    tokens.reverse(); // to fit in with stack order

    return {
      tokens,
      start,
      end: tok
    };
  }
  /**
   * Consume the specified number of (delimited) arguments from the token
   * stream and return the resulting array of arguments.
   */


  consumeArgs(numArgs, delimiters) {
    if (delimiters) {
      if (delimiters.length !== numArgs + 1) {
        throw new ParseError("The length of delimiters doesn't match the number of args!");
      }

      var delims = delimiters[0];

      for (var i = 0; i < delims.length; i++) {
        var tok = this.popToken();

        if (delims[i] !== tok.text) {
          throw new ParseError("Use of the macro doesn't match its definition", tok);
        }
      }
    }

    var args = [];

    for (var _i = 0; _i < numArgs; _i++) {
      args.push(this.consumeArg(delimiters && delimiters[_i + 1]).tokens);
    }

    return args;
  }
  /**
   * Increment `expansionCount` by the specified amount.
   * Throw an error if it exceeds `maxExpand`.
   */


  countExpansion(amount) {
    this.expansionCount += amount;

    if (this.expansionCount > this.settings.maxExpand) {
      throw new ParseError("Too many expansions: infinite loop or " + "need to increase maxExpand setting");
    }
  }
  /**
   * Expand the next token only once if possible.
   *
   * If the token is expanded, the resulting tokens will be pushed onto
   * the stack in reverse order, and the number of such tokens will be
   * returned.  This number might be zero or positive.
   *
   * If not, the return value is `false`, and the next token remains at the
   * top of the stack.
   *
   * In either case, the next token will be on the top of the stack,
   * or the stack will be empty (in case of empty expansion
   * and no other tokens).
   *
   * Used to implement `expandAfterFuture` and `expandNextToken`.
   *
   * If expandableOnly, only expandable tokens are expanded and
   * an undefined control sequence results in an error.
   */


  expandOnce(expandableOnly) {
    var topToken = this.popToken();
    var name = topToken.text;
    var expansion = !topToken.noexpand ? this._getExpansion(name) : null;

    if (expansion == null || expandableOnly && expansion.unexpandable) {
      if (expandableOnly && expansion == null && name[0] === "\\" && !this.isDefined(name)) {
        throw new ParseError("Undefined control sequence: " + name);
      }

      this.pushToken(topToken);
      return false;
    }

    this.countExpansion(1);
    var tokens = expansion.tokens;
    var args = this.consumeArgs(expansion.numArgs, expansion.delimiters);

    if (expansion.numArgs) {
      // paste arguments in place of the placeholders
      tokens = tokens.slice(); // make a shallow copy

      for (var i = tokens.length - 1; i >= 0; --i) {
        var tok = tokens[i];

        if (tok.text === "#") {
          if (i === 0) {
            throw new ParseError("Incomplete placeholder at end of macro body", tok);
          }

          tok = tokens[--i]; // next token on stack

          if (tok.text === "#") {
            // ## → #
            tokens.splice(i + 1, 1); // drop first #
          } else if (/^[1-9]$/.test(tok.text)) {
            // replace the placeholder with the indicated argument
            tokens.splice(i, 2, ...args[+tok.text - 1]);
          } else {
            throw new ParseError("Not a valid argument number", tok);
          }
        }
      }
    } // Concatenate expansion onto top of stack.


    this.pushTokens(tokens);
    return tokens.length;
  }
  /**
   * Expand the next token only once (if possible), and return the resulting
   * top token on the stack (without removing anything from the stack).
   * Similar in behavior to TeX's `\expandafter\futurelet`.
   * Equivalent to expandOnce() followed by future().
   */


  expandAfterFuture() {
    this.expandOnce();
    return this.future();
  }
  /**
   * Recursively expand first token, then return first non-expandable token.
   */


  expandNextToken() {
    for (;;) {
      if (this.expandOnce() === false) {
        // fully expanded
        var token = this.stack.pop(); // the token after \noexpand is interpreted as if its meaning
        // were ‘\relax’

        if (token.treatAsRelax) {
          token.text = "\\relax";
        }

        return token;
      }
    } // Flow unable to figure out that this pathway is impossible.
    // https://github.com/facebook/flow/issues/4808


    throw new Error(); // eslint-disable-line no-unreachable
  }
  /**
   * Fully expand the given macro name and return the resulting list of
   * tokens, or return `undefined` if no such macro is defined.
   */


  expandMacro(name) {
    return this.macros.has(name) ? this.expandTokens([new Token(name)]) : undefined;
  }
  /**
   * Fully expand the given token stream and return the resulting list of
   * tokens.  Note that the input tokens are in reverse order, but the
   * output tokens are in forward order.
   */


  expandTokens(tokens) {
    var output = [];
    var oldStackLength = this.stack.length;
    this.pushTokens(tokens);

    while (this.stack.length > oldStackLength) {
      // Expand only expandable tokens
      if (this.expandOnce(true) === false) {
        // fully expanded
        var token = this.stack.pop();

        if (token.treatAsRelax) {
          // the expansion of \noexpand is the token itself
          token.noexpand = false;
          token.treatAsRelax = false;
        }

        output.push(token);
      }
    } // Count all of these tokens as additional expansions, to prevent
    // exponential blowup from linearly many \edef's.


    this.countExpansion(output.length);
    return output;
  }
  /**
   * Fully expand the given macro name and return the result as a string,
   * or return `undefined` if no such macro is defined.
   */


  expandMacroAsText(name) {
    var tokens = this.expandMacro(name);

    if (tokens) {
      return tokens.map(token => token.text).join("");
    } else {
      return tokens;
    }
  }
  /**
   * Returns the expanded macro as a reversed array of tokens and a macro
   * argument count.  Or returns `null` if no such macro.
   */


  _getExpansion(name) {
    var definition = this.macros.get(name);

    if (definition == null) {
      // mainly checking for undefined here
      return definition;
    } // If a single character has an associated catcode other than 13
    // (active character), then don't expand it.


    if (name.length === 1) {
      var catcode = this.lexer.catcodes[name];

      if (catcode != null && catcode !== 13) {
        return;
      }
    }

    var expansion = typeof definition === "function" ? definition(this) : definition;

    if (typeof expansion === "string") {
      var numArgs = 0;

      if (expansion.indexOf("#") !== -1) {
        var stripped = expansion.replace(/##/g, "");

        while (stripped.indexOf("#" + (numArgs + 1)) !== -1) {
          ++numArgs;
        }
      }

      var bodyLexer = new Lexer(expansion, this.settings);
      var tokens = [];
      var tok = bodyLexer.lex();

      while (tok.text !== "EOF") {
        tokens.push(tok);
        tok = bodyLexer.lex();
      }

      tokens.reverse(); // to fit in with stack using push and pop

      var expanded = {
        tokens,
        numArgs
      };
      return expanded;
    }

    return expansion;
  }
  /**
   * Determine whether a command is currently "defined" (has some
   * functionality), meaning that it's a macro (in the current group),
   * a function, a symbol, or one of the special commands listed in
   * `implicitCommands`.
   */


  isDefined(name) {
    return this.macros.has(name) || functions.hasOwnProperty(name) || symbols.math.hasOwnProperty(name) || symbols.text.hasOwnProperty(name) || implicitCommands.hasOwnProperty(name);
  }
  /**
   * Determine whether a command is expandable.
   */


  isExpandable(name) {
    var macro = this.macros.get(name);
    return macro != null ? typeof macro === "string" || typeof macro === "function" || !macro.unexpandable : functions.hasOwnProperty(name) && !functions[name].primitive;
  }

}

// Helpers for Parser.js handling of Unicode (sub|super)script characters.
var unicodeSubRegEx = /^[₊₋₌₍₎₀₁₂₃₄₅₆₇₈₉ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓᵦᵧᵨᵩᵪ]/;
var uSubsAndSups = Object.freeze({
  '₊': '+',
  '₋': '-',
  '₌': '=',
  '₍': '(',
  '₎': ')',
  '₀': '0',
  '₁': '1',
  '₂': '2',
  '₃': '3',
  '₄': '4',
  '₅': '5',
  '₆': '6',
  '₇': '7',
  '₈': '8',
  '₉': '9',
  '\u2090': 'a',
  '\u2091': 'e',
  '\u2095': 'h',
  '\u1D62': 'i',
  '\u2C7C': 'j',
  '\u2096': 'k',
  '\u2097': 'l',
  '\u2098': 'm',
  '\u2099': 'n',
  '\u2092': 'o',
  '\u209A': 'p',
  '\u1D63': 'r',
  '\u209B': 's',
  '\u209C': 't',
  '\u1D64': 'u',
  '\u1D65': 'v',
  '\u2093': 'x',
  '\u1D66': 'β',
  '\u1D67': 'γ',
  '\u1D68': 'ρ',
  '\u1D69': '\u03d5',
  '\u1D6A': 'χ',
  '⁺': '+',
  '⁻': '-',
  '⁼': '=',
  '⁽': '(',
  '⁾': ')',
  '⁰': '0',
  '¹': '1',
  '²': '2',
  '³': '3',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9',
  '\u1D2C': 'A',
  '\u1D2E': 'B',
  '\u1D30': 'D',
  '\u1D31': 'E',
  '\u1D33': 'G',
  '\u1D34': 'H',
  '\u1D35': 'I',
  '\u1D36': 'J',
  '\u1D37': 'K',
  '\u1D38': 'L',
  '\u1D39': 'M',
  '\u1D3A': 'N',
  '\u1D3C': 'O',
  '\u1D3E': 'P',
  '\u1D3F': 'R',
  '\u1D40': 'T',
  '\u1D41': 'U',
  '\u2C7D': 'V',
  '\u1D42': 'W',
  '\u1D43': 'a',
  '\u1D47': 'b',
  '\u1D9C': 'c',
  '\u1D48': 'd',
  '\u1D49': 'e',
  '\u1DA0': 'f',
  '\u1D4D': 'g',
  '\u02B0': 'h',
  '\u2071': 'i',
  '\u02B2': 'j',
  '\u1D4F': 'k',
  '\u02E1': 'l',
  '\u1D50': 'm',
  '\u207F': 'n',
  '\u1D52': 'o',
  '\u1D56': 'p',
  '\u02B3': 'r',
  '\u02E2': 's',
  '\u1D57': 't',
  '\u1D58': 'u',
  '\u1D5B': 'v',
  '\u02B7': 'w',
  '\u02E3': 'x',
  '\u02B8': 'y',
  '\u1DBB': 'z',
  '\u1D5D': 'β',
  '\u1D5E': 'γ',
  '\u1D5F': 'δ',
  '\u1D60': '\u03d5',
  '\u1D61': 'χ',
  '\u1DBF': 'θ'
});

/* eslint no-constant-condition:0 */

var unicodeAccents = {
  "́": {
    "text": "\\'",
    "math": "\\acute"
  },
  "̀": {
    "text": "\\`",
    "math": "\\grave"
  },
  "̈": {
    "text": "\\\"",
    "math": "\\ddot"
  },
  "̃": {
    "text": "\\~",
    "math": "\\tilde"
  },
  "̄": {
    "text": "\\=",
    "math": "\\bar"
  },
  "̆": {
    "text": "\\u",
    "math": "\\breve"
  },
  "̌": {
    "text": "\\v",
    "math": "\\check"
  },
  "̂": {
    "text": "\\^",
    "math": "\\hat"
  },
  "̇": {
    "text": "\\.",
    "math": "\\dot"
  },
  "̊": {
    "text": "\\r",
    "math": "\\mathring"
  },
  "̋": {
    "text": "\\H"
  },
  "̧": {
    "text": "\\c"
  }
};
var unicodeSymbols = {
  "á": "á",
  "à": "à",
  "ä": "ä",
  "ǟ": "ǟ",
  "ã": "ã",
  "ā": "ā",
  "ă": "ă",
  "ắ": "ắ",
  "ằ": "ằ",
  "ẵ": "ẵ",
  "ǎ": "ǎ",
  "â": "â",
  "ấ": "ấ",
  "ầ": "ầ",
  "ẫ": "ẫ",
  "ȧ": "ȧ",
  "ǡ": "ǡ",
  "å": "å",
  "ǻ": "ǻ",
  "ḃ": "ḃ",
  "ć": "ć",
  "ḉ": "ḉ",
  "č": "č",
  "ĉ": "ĉ",
  "ċ": "ċ",
  "ç": "ç",
  "ď": "ď",
  "ḋ": "ḋ",
  "ḑ": "ḑ",
  "é": "é",
  "è": "è",
  "ë": "ë",
  "ẽ": "ẽ",
  "ē": "ē",
  "ḗ": "ḗ",
  "ḕ": "ḕ",
  "ĕ": "ĕ",
  "ḝ": "ḝ",
  "ě": "ě",
  "ê": "ê",
  "ế": "ế",
  "ề": "ề",
  "ễ": "ễ",
  "ė": "ė",
  "ȩ": "ȩ",
  "ḟ": "ḟ",
  "ǵ": "ǵ",
  "ḡ": "ḡ",
  "ğ": "ğ",
  "ǧ": "ǧ",
  "ĝ": "ĝ",
  "ġ": "ġ",
  "ģ": "ģ",
  "ḧ": "ḧ",
  "ȟ": "ȟ",
  "ĥ": "ĥ",
  "ḣ": "ḣ",
  "ḩ": "ḩ",
  "í": "í",
  "ì": "ì",
  "ï": "ï",
  "ḯ": "ḯ",
  "ĩ": "ĩ",
  "ī": "ī",
  "ĭ": "ĭ",
  "ǐ": "ǐ",
  "î": "î",
  "ǰ": "ǰ",
  "ĵ": "ĵ",
  "ḱ": "ḱ",
  "ǩ": "ǩ",
  "ķ": "ķ",
  "ĺ": "ĺ",
  "ľ": "ľ",
  "ļ": "ļ",
  "ḿ": "ḿ",
  "ṁ": "ṁ",
  "ń": "ń",
  "ǹ": "ǹ",
  "ñ": "ñ",
  "ň": "ň",
  "ṅ": "ṅ",
  "ņ": "ņ",
  "ó": "ó",
  "ò": "ò",
  "ö": "ö",
  "ȫ": "ȫ",
  "õ": "õ",
  "ṍ": "ṍ",
  "ṏ": "ṏ",
  "ȭ": "ȭ",
  "ō": "ō",
  "ṓ": "ṓ",
  "ṑ": "ṑ",
  "ŏ": "ŏ",
  "ǒ": "ǒ",
  "ô": "ô",
  "ố": "ố",
  "ồ": "ồ",
  "ỗ": "ỗ",
  "ȯ": "ȯ",
  "ȱ": "ȱ",
  "ő": "ő",
  "ṕ": "ṕ",
  "ṗ": "ṗ",
  "ŕ": "ŕ",
  "ř": "ř",
  "ṙ": "ṙ",
  "ŗ": "ŗ",
  "ś": "ś",
  "ṥ": "ṥ",
  "š": "š",
  "ṧ": "ṧ",
  "ŝ": "ŝ",
  "ṡ": "ṡ",
  "ş": "ş",
  "ẗ": "ẗ",
  "ť": "ť",
  "ṫ": "ṫ",
  "ţ": "ţ",
  "ú": "ú",
  "ù": "ù",
  "ü": "ü",
  "ǘ": "ǘ",
  "ǜ": "ǜ",
  "ǖ": "ǖ",
  "ǚ": "ǚ",
  "ũ": "ũ",
  "ṹ": "ṹ",
  "ū": "ū",
  "ṻ": "ṻ",
  "ŭ": "ŭ",
  "ǔ": "ǔ",
  "û": "û",
  "ů": "ů",
  "ű": "ű",
  "ṽ": "ṽ",
  "ẃ": "ẃ",
  "ẁ": "ẁ",
  "ẅ": "ẅ",
  "ŵ": "ŵ",
  "ẇ": "ẇ",
  "ẘ": "ẘ",
  "ẍ": "ẍ",
  "ẋ": "ẋ",
  "ý": "ý",
  "ỳ": "ỳ",
  "ÿ": "ÿ",
  "ỹ": "ỹ",
  "ȳ": "ȳ",
  "ŷ": "ŷ",
  "ẏ": "ẏ",
  "ẙ": "ẙ",
  "ź": "ź",
  "ž": "ž",
  "ẑ": "ẑ",
  "ż": "ż",
  "Á": "Á",
  "À": "À",
  "Ä": "Ä",
  "Ǟ": "Ǟ",
  "Ã": "Ã",
  "Ā": "Ā",
  "Ă": "Ă",
  "Ắ": "Ắ",
  "Ằ": "Ằ",
  "Ẵ": "Ẵ",
  "Ǎ": "Ǎ",
  "Â": "Â",
  "Ấ": "Ấ",
  "Ầ": "Ầ",
  "Ẫ": "Ẫ",
  "Ȧ": "Ȧ",
  "Ǡ": "Ǡ",
  "Å": "Å",
  "Ǻ": "Ǻ",
  "Ḃ": "Ḃ",
  "Ć": "Ć",
  "Ḉ": "Ḉ",
  "Č": "Č",
  "Ĉ": "Ĉ",
  "Ċ": "Ċ",
  "Ç": "Ç",
  "Ď": "Ď",
  "Ḋ": "Ḋ",
  "Ḑ": "Ḑ",
  "É": "É",
  "È": "È",
  "Ë": "Ë",
  "Ẽ": "Ẽ",
  "Ē": "Ē",
  "Ḗ": "Ḗ",
  "Ḕ": "Ḕ",
  "Ĕ": "Ĕ",
  "Ḝ": "Ḝ",
  "Ě": "Ě",
  "Ê": "Ê",
  "Ế": "Ế",
  "Ề": "Ề",
  "Ễ": "Ễ",
  "Ė": "Ė",
  "Ȩ": "Ȩ",
  "Ḟ": "Ḟ",
  "Ǵ": "Ǵ",
  "Ḡ": "Ḡ",
  "Ğ": "Ğ",
  "Ǧ": "Ǧ",
  "Ĝ": "Ĝ",
  "Ġ": "Ġ",
  "Ģ": "Ģ",
  "Ḧ": "Ḧ",
  "Ȟ": "Ȟ",
  "Ĥ": "Ĥ",
  "Ḣ": "Ḣ",
  "Ḩ": "Ḩ",
  "Í": "Í",
  "Ì": "Ì",
  "Ï": "Ï",
  "Ḯ": "Ḯ",
  "Ĩ": "Ĩ",
  "Ī": "Ī",
  "Ĭ": "Ĭ",
  "Ǐ": "Ǐ",
  "Î": "Î",
  "İ": "İ",
  "Ĵ": "Ĵ",
  "Ḱ": "Ḱ",
  "Ǩ": "Ǩ",
  "Ķ": "Ķ",
  "Ĺ": "Ĺ",
  "Ľ": "Ľ",
  "Ļ": "Ļ",
  "Ḿ": "Ḿ",
  "Ṁ": "Ṁ",
  "Ń": "Ń",
  "Ǹ": "Ǹ",
  "Ñ": "Ñ",
  "Ň": "Ň",
  "Ṅ": "Ṅ",
  "Ņ": "Ņ",
  "Ó": "Ó",
  "Ò": "Ò",
  "Ö": "Ö",
  "Ȫ": "Ȫ",
  "Õ": "Õ",
  "Ṍ": "Ṍ",
  "Ṏ": "Ṏ",
  "Ȭ": "Ȭ",
  "Ō": "Ō",
  "Ṓ": "Ṓ",
  "Ṑ": "Ṑ",
  "Ŏ": "Ŏ",
  "Ǒ": "Ǒ",
  "Ô": "Ô",
  "Ố": "Ố",
  "Ồ": "Ồ",
  "Ỗ": "Ỗ",
  "Ȯ": "Ȯ",
  "Ȱ": "Ȱ",
  "Ő": "Ő",
  "Ṕ": "Ṕ",
  "Ṗ": "Ṗ",
  "Ŕ": "Ŕ",
  "Ř": "Ř",
  "Ṙ": "Ṙ",
  "Ŗ": "Ŗ",
  "Ś": "Ś",
  "Ṥ": "Ṥ",
  "Š": "Š",
  "Ṧ": "Ṧ",
  "Ŝ": "Ŝ",
  "Ṡ": "Ṡ",
  "Ş": "Ş",
  "Ť": "Ť",
  "Ṫ": "Ṫ",
  "Ţ": "Ţ",
  "Ú": "Ú",
  "Ù": "Ù",
  "Ü": "Ü",
  "Ǘ": "Ǘ",
  "Ǜ": "Ǜ",
  "Ǖ": "Ǖ",
  "Ǚ": "Ǚ",
  "Ũ": "Ũ",
  "Ṹ": "Ṹ",
  "Ū": "Ū",
  "Ṻ": "Ṻ",
  "Ŭ": "Ŭ",
  "Ǔ": "Ǔ",
  "Û": "Û",
  "Ů": "Ů",
  "Ű": "Ű",
  "Ṽ": "Ṽ",
  "Ẃ": "Ẃ",
  "Ẁ": "Ẁ",
  "Ẅ": "Ẅ",
  "Ŵ": "Ŵ",
  "Ẇ": "Ẇ",
  "Ẍ": "Ẍ",
  "Ẋ": "Ẋ",
  "Ý": "Ý",
  "Ỳ": "Ỳ",
  "Ÿ": "Ÿ",
  "Ỹ": "Ỹ",
  "Ȳ": "Ȳ",
  "Ŷ": "Ŷ",
  "Ẏ": "Ẏ",
  "Ź": "Ź",
  "Ž": "Ž",
  "Ẑ": "Ẑ",
  "Ż": "Ż",
  "ά": "ά",
  "ὰ": "ὰ",
  "ᾱ": "ᾱ",
  "ᾰ": "ᾰ",
  "έ": "έ",
  "ὲ": "ὲ",
  "ή": "ή",
  "ὴ": "ὴ",
  "ί": "ί",
  "ὶ": "ὶ",
  "ϊ": "ϊ",
  "ΐ": "ΐ",
  "ῒ": "ῒ",
  "ῑ": "ῑ",
  "ῐ": "ῐ",
  "ό": "ό",
  "ὸ": "ὸ",
  "ύ": "ύ",
  "ὺ": "ὺ",
  "ϋ": "ϋ",
  "ΰ": "ΰ",
  "ῢ": "ῢ",
  "ῡ": "ῡ",
  "ῠ": "ῠ",
  "ώ": "ώ",
  "ὼ": "ὼ",
  "Ύ": "Ύ",
  "Ὺ": "Ὺ",
  "Ϋ": "Ϋ",
  "Ῡ": "Ῡ",
  "Ῠ": "Ῠ",
  "Ώ": "Ώ",
  "Ὼ": "Ὼ"
};

/**
 * This file contains the parser used to parse out a TeX expression from the
 * input. Since TeX isn't context-free, standard parsers don't work particularly
 * well.
 *
 * The strategy of this parser is as such:
 *
 * The main functions (the `.parse...` ones) take a position in the current
 * parse string to parse tokens from. The lexer (found in Lexer.js, stored at
 * this.gullet.lexer) also supports pulling out tokens at arbitrary places. When
 * individual tokens are needed at a position, the lexer is called to pull out a
 * token, which is then used.
 *
 * The parser has a property called "mode" indicating the mode that
 * the parser is currently in. Currently it has to be one of "math" or
 * "text", which denotes whether the current environment is a math-y
 * one or a text-y one (e.g. inside \text). Currently, this serves to
 * limit the functions which can be used in text mode.
 *
 * The main functions then return an object which contains the useful data that
 * was parsed at its given point, and a new position at the end of the parsed
 * data. The main functions can call each other and continue the parsing by
 * using the returned position as a new starting point.
 *
 * There are also extra `.handle...` functions, which pull out some reused
 * functionality into self-contained functions.
 *
 * The functions return ParseNodes.
 */
class Parser {
  constructor(input, settings) {
    this.mode = void 0;
    this.gullet = void 0;
    this.settings = void 0;
    this.leftrightDepth = void 0;
    this.nextToken = void 0;
    // Start in math mode
    this.mode = "math"; // Create a new macro expander (gullet) and (indirectly via that) also a
    // new lexer (mouth) for this parser (stomach, in the language of TeX)

    this.gullet = new MacroExpander(input, settings, this.mode); // Store the settings for use in parsing

    this.settings = settings; // Count leftright depth (for \middle errors)

    this.leftrightDepth = 0;
  }
  /**
   * Checks a result to make sure it has the right type, and throws an
   * appropriate error otherwise.
   */


  expect(text, consume) {
    if (consume === void 0) {
      consume = true;
    }

    if (this.fetch().text !== text) {
      throw new ParseError("Expected '" + text + "', got '" + this.fetch().text + "'", this.fetch());
    }

    if (consume) {
      this.consume();
    }
  }
  /**
   * Discards the current lookahead token, considering it consumed.
   */


  consume() {
    this.nextToken = null;
  }
  /**
   * Return the current lookahead token, or if there isn't one (at the
   * beginning, or if the previous lookahead token was consume()d),
   * fetch the next token as the new lookahead token and return it.
   */


  fetch() {
    if (this.nextToken == null) {
      this.nextToken = this.gullet.expandNextToken();
    }

    return this.nextToken;
  }
  /**
   * Switches between "text" and "math" modes.
   */


  switchMode(newMode) {
    this.mode = newMode;
    this.gullet.switchMode(newMode);
  }
  /**
   * Main parsing function, which parses an entire input.
   */


  parse() {
    if (!this.settings.globalGroup) {
      // Create a group namespace for the math expression.
      // (LaTeX creates a new group for every $...$, $$...$$, \[...\].)
      this.gullet.beginGroup();
    } // Use old \color behavior (same as LaTeX's \textcolor) if requested.
    // We do this within the group for the math expression, so it doesn't
    // pollute settings.macros.


    if (this.settings.colorIsTextColor) {
      this.gullet.macros.set("\\color", "\\textcolor");
    }

    try {
      // Try to parse the input
      var parse = this.parseExpression(false); // If we succeeded, make sure there's an EOF at the end

      this.expect("EOF"); // End the group namespace for the expression

      if (!this.settings.globalGroup) {
        this.gullet.endGroup();
      }

      return parse; // Close any leftover groups in case of a parse error.
    } finally {
      this.gullet.endGroups();
    }
  }
  /**
   * Fully parse a separate sequence of tokens as a separate job.
   * Tokens should be specified in reverse order, as in a MacroDefinition.
   */


  subparse(tokens) {
    // Save the next token from the current job.
    var oldToken = this.nextToken;
    this.consume(); // Run the new job, terminating it with an excess '}'

    this.gullet.pushToken(new Token("}"));
    this.gullet.pushTokens(tokens);
    var parse = this.parseExpression(false);
    this.expect("}"); // Restore the next token from the current job.

    this.nextToken = oldToken;
    return parse;
  }

  /**
   * Parses an "expression", which is a list of atoms.
   *
   * `breakOnInfix`: Should the parsing stop when we hit infix nodes? This
   *                 happens when functions have higher precedence han infix
   *                 nodes in implicit parses.
   *
   * `breakOnTokenText`: The text of the token that the expression should end
   *                     with, or `null` if something else should end the
   *                     expression.
   */
  parseExpression(breakOnInfix, breakOnTokenText) {
    var body = []; // Keep adding atoms to the body until we can't parse any more atoms (either
    // we reached the end, a }, or a \right)

    while (true) {
      // Ignore spaces in math mode
      if (this.mode === "math") {
        this.consumeSpaces();
      }

      var lex = this.fetch();

      if (Parser.endOfExpression.indexOf(lex.text) !== -1) {
        break;
      }

      if (breakOnTokenText && lex.text === breakOnTokenText) {
        break;
      }

      if (breakOnInfix && functions[lex.text] && functions[lex.text].infix) {
        break;
      }

      var atom = this.parseAtom(breakOnTokenText);

      if (!atom) {
        break;
      } else if (atom.type === "internal") {
        continue;
      }

      body.push(atom);
    }

    if (this.mode === "text") {
      this.formLigatures(body);
    }

    return this.handleInfixNodes(body);
  }
  /**
   * Rewrites infix operators such as \over with corresponding commands such
   * as \frac.
   *
   * There can only be one infix operator per group.  If there's more than one
   * then the expression is ambiguous.  This can be resolved by adding {}.
   */


  handleInfixNodes(body) {
    var overIndex = -1;
    var funcName;

    for (var i = 0; i < body.length; i++) {
      if (body[i].type === "infix") {
        if (overIndex !== -1) {
          throw new ParseError("only one infix operator per group", body[i].token);
        }

        overIndex = i;
        funcName = body[i].replaceWith;
      }
    }

    if (overIndex !== -1 && funcName) {
      var numerNode;
      var denomNode;
      var numerBody = body.slice(0, overIndex);
      var denomBody = body.slice(overIndex + 1);

      if (numerBody.length === 1 && numerBody[0].type === "ordgroup") {
        numerNode = numerBody[0];
      } else {
        numerNode = {
          type: "ordgroup",
          mode: this.mode,
          body: numerBody
        };
      }

      if (denomBody.length === 1 && denomBody[0].type === "ordgroup") {
        denomNode = denomBody[0];
      } else {
        denomNode = {
          type: "ordgroup",
          mode: this.mode,
          body: denomBody
        };
      }

      var node;

      if (funcName === "\\\\abovefrac") {
        node = this.callFunction(funcName, [numerNode, body[overIndex], denomNode], []);
      } else {
        node = this.callFunction(funcName, [numerNode, denomNode], []);
      }

      return [node];
    } else {
      return body;
    }
  }
  /**
   * Handle a subscript or superscript with nice errors.
   */


  handleSupSubscript(name // For error reporting.
  ) {
    var symbolToken = this.fetch();
    var symbol = symbolToken.text;
    this.consume();
    this.consumeSpaces(); // ignore spaces before sup/subscript argument

    var group = this.parseGroup(name);

    if (!group) {
      throw new ParseError("Expected group after '" + symbol + "'", symbolToken);
    }

    return group;
  }
  /**
   * Converts the textual input of an unsupported command into a text node
   * contained within a color node whose color is determined by errorColor
   */


  formatUnsupportedCmd(text) {
    var textordArray = [];

    for (var i = 0; i < text.length; i++) {
      textordArray.push({
        type: "textord",
        mode: "text",
        text: text[i]
      });
    }

    var textNode = {
      type: "text",
      mode: this.mode,
      body: textordArray
    };
    var colorNode = {
      type: "color",
      mode: this.mode,
      color: this.settings.errorColor,
      body: [textNode]
    };
    return colorNode;
  }
  /**
   * Parses a group with optional super/subscripts.
   */


  parseAtom(breakOnTokenText) {
    // The body of an atom is an implicit group, so that things like
    // \left(x\right)^2 work correctly.
    var base = this.parseGroup("atom", breakOnTokenText); // In text mode, we don't have superscripts or subscripts

    if (this.mode === "text") {
      return base;
    } // Note that base may be empty (i.e. null) at this point.


    var superscript;
    var subscript;

    while (true) {
      // Guaranteed in math mode, so eat any spaces first.
      this.consumeSpaces(); // Lex the first token

      var lex = this.fetch();

      if (lex.text === "\\limits" || lex.text === "\\nolimits") {
        // We got a limit control
        if (base && base.type === "op") {
          var limits = lex.text === "\\limits";
          base.limits = limits;
          base.alwaysHandleSupSub = true;
        } else if (base && base.type === "operatorname") {
          if (base.alwaysHandleSupSub) {
            base.limits = lex.text === "\\limits";
          }
        } else {
          throw new ParseError("Limit controls must follow a math operator", lex);
        }

        this.consume();
      } else if (lex.text === "^") {
        // We got a superscript start
        if (superscript) {
          throw new ParseError("Double superscript", lex);
        }

        superscript = this.handleSupSubscript("superscript");
      } else if (lex.text === "_") {
        // We got a subscript start
        if (subscript) {
          throw new ParseError("Double subscript", lex);
        }

        subscript = this.handleSupSubscript("subscript");
      } else if (lex.text === "'") {
        // We got a prime
        if (superscript) {
          throw new ParseError("Double superscript", lex);
        }

        var prime = {
          type: "textord",
          mode: this.mode,
          text: "\\prime"
        }; // Many primes can be grouped together, so we handle this here

        var primes = [prime];
        this.consume(); // Keep lexing tokens until we get something that's not a prime

        while (this.fetch().text === "'") {
          // For each one, add another prime to the list
          primes.push(prime);
          this.consume();
        } // If there's a superscript following the primes, combine that
        // superscript in with the primes.


        if (this.fetch().text === "^") {
          primes.push(this.handleSupSubscript("superscript"));
        } // Put everything into an ordgroup as the superscript


        superscript = {
          type: "ordgroup",
          mode: this.mode,
          body: primes
        };
      } else if (uSubsAndSups[lex.text]) {
        // A Unicode subscript or superscript character.
        // We treat these similarly to the unicode-math package.
        // So we render a string of Unicode (sub|super)scripts the
        // same as a (sub|super)script of regular characters.
        var isSub = unicodeSubRegEx.test(lex.text);
        var subsupTokens = [];
        subsupTokens.push(new Token(uSubsAndSups[lex.text]));
        this.consume(); // Continue fetching tokens to fill out the string.

        while (true) {
          var token = this.fetch().text;

          if (!uSubsAndSups[token]) {
            break;
          }

          if (unicodeSubRegEx.test(token) !== isSub) {
            break;
          }

          subsupTokens.unshift(new Token(uSubsAndSups[token]));
          this.consume();
        } // Now create a (sub|super)script.


        var body = this.subparse(subsupTokens);

        if (isSub) {
          subscript = {
            type: "ordgroup",
            mode: "math",
            body
          };
        } else {
          superscript = {
            type: "ordgroup",
            mode: "math",
            body
          };
        }
      } else {
        // If it wasn't ^, _, or ', stop parsing super/subscripts
        break;
      }
    } // Base must be set if superscript or subscript are set per logic above,
    // but need to check here for type check to pass.


    if (superscript || subscript) {
      // If we got either a superscript or subscript, create a supsub
      return {
        type: "supsub",
        mode: this.mode,
        base: base,
        sup: superscript,
        sub: subscript
      };
    } else {
      // Otherwise return the original body
      return base;
    }
  }
  /**
   * Parses an entire function, including its base and all of its arguments.
   */


  parseFunction(breakOnTokenText, name // For determining its context
  ) {
    var token = this.fetch();
    var func = token.text;
    var funcData = functions[func];

    if (!funcData) {
      return null;
    }

    this.consume(); // consume command token

    if (name && name !== "atom" && !funcData.allowedInArgument) {
      throw new ParseError("Got function '" + func + "' with no arguments" + (name ? " as " + name : ""), token);
    } else if (this.mode === "text" && !funcData.allowedInText) {
      throw new ParseError("Can't use function '" + func + "' in text mode", token);
    } else if (this.mode === "math" && funcData.allowedInMath === false) {
      throw new ParseError("Can't use function '" + func + "' in math mode", token);
    }

    var {
      args,
      optArgs
    } = this.parseArguments(func, funcData);
    return this.callFunction(func, args, optArgs, token, breakOnTokenText);
  }
  /**
   * Call a function handler with a suitable context and arguments.
   */


  callFunction(name, args, optArgs, token, breakOnTokenText) {
    var context = {
      funcName: name,
      parser: this,
      token,
      breakOnTokenText
    };
    var func = functions[name];

    if (func && func.handler) {
      return func.handler(context, args, optArgs);
    } else {
      throw new ParseError("No function handler for " + name);
    }
  }
  /**
   * Parses the arguments of a function or environment
   */


  parseArguments(func, // Should look like "\name" or "\begin{name}".
  funcData) {
    var totalArgs = funcData.numArgs + funcData.numOptionalArgs;

    if (totalArgs === 0) {
      return {
        args: [],
        optArgs: []
      };
    }

    var args = [];
    var optArgs = [];

    for (var i = 0; i < totalArgs; i++) {
      var argType = funcData.argTypes && funcData.argTypes[i];
      var isOptional = i < funcData.numOptionalArgs;

      if (funcData.primitive && argType == null || // \sqrt expands into primitive if optional argument doesn't exist
      funcData.type === "sqrt" && i === 1 && optArgs[0] == null) {
        argType = "primitive";
      }

      var arg = this.parseGroupOfType("argument to '" + func + "'", argType, isOptional);

      if (isOptional) {
        optArgs.push(arg);
      } else if (arg != null) {
        args.push(arg);
      } else {
        // should be unreachable
        throw new ParseError("Null argument, please report this as a bug");
      }
    }

    return {
      args,
      optArgs
    };
  }
  /**
   * Parses a group when the mode is changing.
   */


  parseGroupOfType(name, type, optional) {
    switch (type) {
      case "color":
        return this.parseColorGroup(optional);

      case "size":
        return this.parseSizeGroup(optional);

      case "url":
        return this.parseUrlGroup(optional);

      case "math":
      case "text":
        return this.parseArgumentGroup(optional, type);

      case "hbox":
        {
          // hbox argument type wraps the argument in the equivalent of
          // \hbox, which is like \text but switching to \textstyle size.
          var group = this.parseArgumentGroup(optional, "text");
          return group != null ? {
            type: "styling",
            mode: group.mode,
            body: [group],
            style: "text" // simulate \textstyle

          } : null;
        }

      case "raw":
        {
          var token = this.parseStringGroup("raw", optional);
          return token != null ? {
            type: "raw",
            mode: "text",
            string: token.text
          } : null;
        }

      case "primitive":
        {
          if (optional) {
            throw new ParseError("A primitive argument cannot be optional");
          }

          var _group = this.parseGroup(name);

          if (_group == null) {
            throw new ParseError("Expected group as " + name, this.fetch());
          }

          return _group;
        }

      case "original":
      case null:
      case undefined:
        return this.parseArgumentGroup(optional);

      default:
        throw new ParseError("Unknown group type as " + name, this.fetch());
    }
  }
  /**
   * Discard any space tokens, fetching the next non-space token.
   */


  consumeSpaces() {
    while (this.fetch().text === " ") {
      this.consume();
    }
  }
  /**
   * Parses a group, essentially returning the string formed by the
   * brace-enclosed tokens plus some position information.
   */


  parseStringGroup(modeName, // Used to describe the mode in error messages.
  optional) {
    var argToken = this.gullet.scanArgument(optional);

    if (argToken == null) {
      return null;
    }

    var str = "";
    var nextToken;

    while ((nextToken = this.fetch()).text !== "EOF") {
      str += nextToken.text;
      this.consume();
    }

    this.consume(); // consume the end of the argument

    argToken.text = str;
    return argToken;
  }
  /**
   * Parses a regex-delimited group: the largest sequence of tokens
   * whose concatenated strings match `regex`. Returns the string
   * formed by the tokens plus some position information.
   */


  parseRegexGroup(regex, modeName // Used to describe the mode in error messages.
  ) {
    var firstToken = this.fetch();
    var lastToken = firstToken;
    var str = "";
    var nextToken;

    while ((nextToken = this.fetch()).text !== "EOF" && regex.test(str + nextToken.text)) {
      lastToken = nextToken;
      str += lastToken.text;
      this.consume();
    }

    if (str === "") {
      throw new ParseError("Invalid " + modeName + ": '" + firstToken.text + "'", firstToken);
    }

    return firstToken.range(lastToken, str);
  }
  /**
   * Parses a color description.
   */


  parseColorGroup(optional) {
    var res = this.parseStringGroup("color", optional);

    if (res == null) {
      return null;
    }

    var match = /^(#[a-f0-9]{3}|#?[a-f0-9]{6}|[a-z]+)$/i.exec(res.text);

    if (!match) {
      throw new ParseError("Invalid color: '" + res.text + "'", res);
    }

    var color = match[0];

    if (/^[0-9a-f]{6}$/i.test(color)) {
      // We allow a 6-digit HTML color spec without a leading "#".
      // This follows the xcolor package's HTML color model.
      // Predefined color names are all missed by this RegEx pattern.
      color = "#" + color;
    }

    return {
      type: "color-token",
      mode: this.mode,
      color
    };
  }
  /**
   * Parses a size specification, consisting of magnitude and unit.
   */


  parseSizeGroup(optional) {
    var res;
    var isBlank = false; // don't expand before parseStringGroup

    this.gullet.consumeSpaces();

    if (!optional && this.gullet.future().text !== "{") {
      res = this.parseRegexGroup(/^[-+]? *(?:$|\d+|\d+\.\d*|\.\d*) *[a-z]{0,2} *$/, "size");
    } else {
      res = this.parseStringGroup("size", optional);
    }

    if (!res) {
      return null;
    }

    if (!optional && res.text.length === 0) {
      // Because we've tested for what is !optional, this block won't
      // affect \kern, \hspace, etc. It will capture the mandatory arguments
      // to \genfrac and \above.
      res.text = "0pt"; // Enable \above{}

      isBlank = true; // This is here specifically for \genfrac
    }

    var match = /([-+]?) *(\d+(?:\.\d*)?|\.\d+) *([a-z]{2})/.exec(res.text);

    if (!match) {
      throw new ParseError("Invalid size: '" + res.text + "'", res);
    }

    var data = {
      number: +(match[1] + match[2]),
      // sign + magnitude, cast to number
      unit: match[3]
    };

    if (!validUnit(data)) {
      throw new ParseError("Invalid unit: '" + data.unit + "'", res);
    }

    return {
      type: "size",
      mode: this.mode,
      value: data,
      isBlank
    };
  }
  /**
   * Parses an URL, checking escaped letters and allowed protocols,
   * and setting the catcode of % as an active character (as in \hyperref).
   */


  parseUrlGroup(optional) {
    this.gullet.lexer.setCatcode("%", 13); // active character

    this.gullet.lexer.setCatcode("~", 12); // other character

    var res = this.parseStringGroup("url", optional);
    this.gullet.lexer.setCatcode("%", 14); // comment character

    this.gullet.lexer.setCatcode("~", 13); // active character

    if (res == null) {
      return null;
    } // hyperref package allows backslashes alone in href, but doesn't
    // generate valid links in such cases; we interpret this as
    // "undefined" behaviour, and keep them as-is. Some browser will
    // replace backslashes with forward slashes.


    var url = res.text.replace(/\\([#$%&~_^{}])/g, '$1');
    return {
      type: "url",
      mode: this.mode,
      url
    };
  }
  /**
   * Parses an argument with the mode specified.
   */


  parseArgumentGroup(optional, mode) {
    var argToken = this.gullet.scanArgument(optional);

    if (argToken == null) {
      return null;
    }

    var outerMode = this.mode;

    if (mode) {
      // Switch to specified mode
      this.switchMode(mode);
    }

    this.gullet.beginGroup();
    var expression = this.parseExpression(false, "EOF"); // TODO: find an alternative way to denote the end

    this.expect("EOF"); // expect the end of the argument

    this.gullet.endGroup();
    var result = {
      type: "ordgroup",
      mode: this.mode,
      loc: argToken.loc,
      body: expression
    };

    if (mode) {
      // Switch mode back
      this.switchMode(outerMode);
    }

    return result;
  }
  /**
   * Parses an ordinary group, which is either a single nucleus (like "x")
   * or an expression in braces (like "{x+y}") or an implicit group, a group
   * that starts at the current position, and ends right before a higher explicit
   * group ends, or at EOF.
   */


  parseGroup(name, // For error reporting.
  breakOnTokenText) {
    var firstToken = this.fetch();
    var text = firstToken.text;
    var result; // Try to parse an open brace or \begingroup

    if (text === "{" || text === "\\begingroup") {
      this.consume();
      var groupEnd = text === "{" ? "}" : "\\endgroup";
      this.gullet.beginGroup(); // If we get a brace, parse an expression

      var expression = this.parseExpression(false, groupEnd);
      var lastToken = this.fetch();
      this.expect(groupEnd); // Check that we got a matching closing brace

      this.gullet.endGroup();
      result = {
        type: "ordgroup",
        mode: this.mode,
        loc: SourceLocation.range(firstToken, lastToken),
        body: expression,
        // A group formed by \begingroup...\endgroup is a semi-simple group
        // which doesn't affect spacing in math mode, i.e., is transparent.
        // https://tex.stackexchange.com/questions/1930/when-should-one-
        // use-begingroup-instead-of-bgroup
        semisimple: text === "\\begingroup" || undefined
      };
    } else {
      // If there exists a function with this name, parse the function.
      // Otherwise, just return a nucleus
      result = this.parseFunction(breakOnTokenText, name) || this.parseSymbol();

      if (result == null && text[0] === "\\" && !implicitCommands.hasOwnProperty(text)) {
        if (this.settings.throwOnError) {
          throw new ParseError("Undefined control sequence: " + text, firstToken);
        }

        result = this.formatUnsupportedCmd(text);
        this.consume();
      }
    }

    return result;
  }
  /**
   * Form ligature-like combinations of characters for text mode.
   * This includes inputs like "--", "---", "``" and "''".
   * The result will simply replace multiple textord nodes with a single
   * character in each value by a single textord node having multiple
   * characters in its value.  The representation is still ASCII source.
   * The group will be modified in place.
   */


  formLigatures(group) {
    var n = group.length - 1;

    for (var i = 0; i < n; ++i) {
      var a = group[i]; // $FlowFixMe: Not every node type has a `text` property.

      var v = a.text;

      if (v === "-" && group[i + 1].text === "-") {
        if (i + 1 < n && group[i + 2].text === "-") {
          group.splice(i, 3, {
            type: "textord",
            mode: "text",
            loc: SourceLocation.range(a, group[i + 2]),
            text: "---"
          });
          n -= 2;
        } else {
          group.splice(i, 2, {
            type: "textord",
            mode: "text",
            loc: SourceLocation.range(a, group[i + 1]),
            text: "--"
          });
          n -= 1;
        }
      }

      if ((v === "'" || v === "`") && group[i + 1].text === v) {
        group.splice(i, 2, {
          type: "textord",
          mode: "text",
          loc: SourceLocation.range(a, group[i + 1]),
          text: v + v
        });
        n -= 1;
      }
    }
  }
  /**
   * Parse a single symbol out of the string. Here, we handle single character
   * symbols and special functions like \verb.
   */


  parseSymbol() {
    var nucleus = this.fetch();
    var text = nucleus.text;

    if (/^\\verb[^a-zA-Z]/.test(text)) {
      this.consume();
      var arg = text.slice(5);
      var star = arg.charAt(0) === "*";

      if (star) {
        arg = arg.slice(1);
      } // Lexer's tokenRegex is constructed to always have matching
      // first/last characters.


      if (arg.length < 2 || arg.charAt(0) !== arg.slice(-1)) {
        throw new ParseError("\\verb assertion failed --\n                    please report what input caused this bug");
      }

      arg = arg.slice(1, -1); // remove first and last char

      return {
        type: "verb",
        mode: "text",
        body: arg,
        star
      };
    } // At this point, we should have a symbol, possibly with accents.
    // First expand any accented base symbol according to unicodeSymbols.


    if (unicodeSymbols.hasOwnProperty(text[0]) && !symbols[this.mode][text[0]]) {
      // This behavior is not strict (XeTeX-compatible) in math mode.
      if (this.settings.strict && this.mode === "math") {
        this.settings.reportNonstrict("unicodeTextInMathMode", "Accented Unicode text character \"" + text[0] + "\" used in " + "math mode", nucleus);
      }

      text = unicodeSymbols[text[0]] + text.slice(1);
    } // Strip off any combining characters


    var match = combiningDiacriticalMarksEndRegex.exec(text);

    if (match) {
      text = text.substring(0, match.index);

      if (text === 'i') {
        text = '\u0131'; // dotless i, in math and text mode
      } else if (text === 'j') {
        text = '\u0237'; // dotless j, in math and text mode
      }
    } // Recognize base symbol


    var symbol;

    if (symbols[this.mode][text]) {
      if (this.settings.strict && this.mode === 'math' && extraLatin.indexOf(text) >= 0) {
        this.settings.reportNonstrict("unicodeTextInMathMode", "Latin-1/Unicode text character \"" + text[0] + "\" used in " + "math mode", nucleus);
      }

      var group = symbols[this.mode][text].group;
      var loc = SourceLocation.range(nucleus);
      var s;

      if (ATOMS.hasOwnProperty(group)) {
        // $FlowFixMe
        var family = group;
        s = {
          type: "atom",
          mode: this.mode,
          family,
          loc,
          text
        };
      } else {
        // $FlowFixMe
        s = {
          type: group,
          mode: this.mode,
          loc,
          text
        };
      } // $FlowFixMe


      symbol = s;
    } else if (text.charCodeAt(0) >= 0x80) {
      // no symbol for e.g. ^
      if (this.settings.strict) {
        if (!supportedCodepoint(text.charCodeAt(0))) {
          this.settings.reportNonstrict("unknownSymbol", "Unrecognized Unicode character \"" + text[0] + "\"" + (" (" + text.charCodeAt(0) + ")"), nucleus);
        } else if (this.mode === "math") {
          this.settings.reportNonstrict("unicodeTextInMathMode", "Unicode text character \"" + text[0] + "\" used in math mode", nucleus);
        }
      } // All nonmathematical Unicode characters are rendered as if they
      // are in text mode (wrapped in \text) because that's what it
      // takes to render them in LaTeX.  Setting `mode: this.mode` is
      // another natural choice (the user requested math mode), but
      // this makes it more difficult for getCharacterMetrics() to
      // distinguish Unicode characters without metrics and those for
      // which we want to simulate the letter M.


      symbol = {
        type: "textord",
        mode: "text",
        loc: SourceLocation.range(nucleus),
        text
      };
    } else {
      return null; // EOF, ^, _, {, }, etc.
    }

    this.consume(); // Transform combining characters into accents

    if (match) {
      for (var i = 0; i < match[0].length; i++) {
        var accent = match[0][i];

        if (!unicodeAccents[accent]) {
          throw new ParseError("Unknown accent ' " + accent + "'", nucleus);
        }

        var command = unicodeAccents[accent][this.mode] || unicodeAccents[accent].text;

        if (!command) {
          throw new ParseError("Accent " + accent + " unsupported in " + this.mode + " mode", nucleus);
        }

        symbol = {
          type: "accent",
          mode: this.mode,
          loc: SourceLocation.range(nucleus),
          label: command,
          isStretchy: false,
          isShifty: true,
          // $FlowFixMe
          base: symbol
        };
      }
    } // $FlowFixMe


    return symbol;
  }

}
Parser.endOfExpression = ["}", "\\endgroup", "\\end", "\\right", "&"];

/**
 * Provides a single function for parsing an expression using a Parser
 * TODO(emily): Remove this
 */

/**
 * Parses an expression using a Parser, then returns the parsed result.
 */
var parseTree = function parseTree(toParse, settings) {
  if (!(typeof toParse === 'string' || toParse instanceof String)) {
    throw new TypeError('KaTeX can only parse string typed expression');
  }

  var parser = new Parser(toParse, settings); // Blank out any \df@tag to avoid spurious "Duplicate \tag" errors

  delete parser.gullet.macros.current["\\df@tag"];
  var tree = parser.parse(); // Prevent a color definition from persisting between calls to katex.render().

  delete parser.gullet.macros.current["\\current@color"];
  delete parser.gullet.macros.current["\\color"]; // If the input used \tag, it will set the \df@tag macro to the tag.
  // In this case, we separately parse the tag and wrap the tree.

  if (parser.gullet.macros.get("\\df@tag")) {
    if (!settings.displayMode) {
      throw new ParseError("\\tag works only in display equations");
    }

    tree = [{
      type: "tag",
      mode: "text",
      body: tree,
      tag: parser.subparse([new Token("\\df@tag")])
    }];
  }

  return tree;
};

/* eslint no-console:0 */

/**
 * Parse and build an expression, and place that expression in the DOM node
 * given.
 */
var render = function render(expression, baseNode, options) {
  baseNode.textContent = "";
  var node = renderToDomTree(expression, options).toNode();
  baseNode.appendChild(node);
}; // KaTeX's styles don't work properly in quirks mode. Print out an error, and
// disable rendering.


if (typeof document !== "undefined") {
  if (document.compatMode !== "CSS1Compat") {
    typeof console !== "undefined" && console.warn("Warning: KaTeX doesn't work in quirks mode. Make sure your " + "website has a suitable doctype.");

    render = function render() {
      throw new ParseError("KaTeX doesn't work in quirks mode.");
    };
  }
}
/**
 * Parse and build an expression, and return the markup for that.
 */


var renderToString = function renderToString(expression, options) {
  var markup = renderToDomTree(expression, options).toMarkup();
  return markup;
};
/**
 * Parse an expression and return the parse tree.
 */


var generateParseTree = function generateParseTree(expression, options) {
  var settings = new Settings(options);
  return parseTree(expression, settings);
};
/**
 * If the given error is a KaTeX ParseError and options.throwOnError is false,
 * renders the invalid LaTeX as a span with hover title giving the KaTeX
 * error message.  Otherwise, simply throws the error.
 */


var renderError = function renderError(error, expression, options) {
  if (options.throwOnError || !(error instanceof ParseError)) {
    throw error;
  }

  var node = buildCommon.makeSpan(["katex-error"], [new SymbolNode(expression)]);
  node.setAttribute("title", error.toString());
  node.setAttribute("style", "color:" + options.errorColor);
  return node;
};
/**
 * Generates and returns the katex build tree. This is used for advanced
 * use cases (like rendering to custom output).
 */


var renderToDomTree = function renderToDomTree(expression, options) {
  var settings = new Settings(options);

  try {
    var tree = parseTree(expression, settings);
    return buildTree(tree, expression, settings);
  } catch (error) {
    return renderError(error, expression, settings);
  }
};
/**
 * Generates and returns the katex build tree, with just HTML (no MathML).
 * This is used for advanced use cases (like rendering to custom output).
 */


var renderToHTMLTree = function renderToHTMLTree(expression, options) {
  var settings = new Settings(options);

  try {
    var tree = parseTree(expression, settings);
    return buildHTMLTree(tree, expression, settings);
  } catch (error) {
    return renderError(error, expression, settings);
  }
};

var katex = {
  /**
   * Current KaTeX version
   */
  version: "0.16.10",

  /**
   * Renders the given LaTeX into an HTML+MathML combination, and adds
   * it as a child to the specified DOM node.
   */
  render,

  /**
   * Renders the given LaTeX into an HTML+MathML combination string,
   * for sending to the client.
   */
  renderToString,

  /**
   * KaTeX error, usually during parsing.
   */
  ParseError,

  /**
   * The shema of Settings
   */
  SETTINGS_SCHEMA,

  /**
   * Parses the given LaTeX into KaTeX's internal parse tree structure,
   * without rendering to HTML or MathML.
   *
   * NOTE: This method is not currently recommended for public use.
   * The internal tree representation is unstable and is very likely
   * to change. Use at your own risk.
   */
  __parse: generateParseTree,

  /**
   * Renders the given LaTeX into an HTML+MathML internal DOM tree
   * representation, without flattening that representation to a string.
   *
   * NOTE: This method is not currently recommended for public use.
   * The internal tree representation is unstable and is very likely
   * to change. Use at your own risk.
   */
  __renderToDomTree: renderToDomTree,

  /**
   * Renders the given LaTeX into an HTML internal DOM tree representation,
   * without MathML and without flattening that representation to a string.
   *
   * NOTE: This method is not currently recommended for public use.
   * The internal tree representation is unstable and is very likely
   * to change. Use at your own risk.
   */
  __renderToHTMLTree: renderToHTMLTree,

  /**
   * extends internal font metrics object with a new object
   * each key in the new object represents a font name
  */
  __setFontMetrics: setFontMetrics,

  /**
   * adds a new symbol to builtin symbols table
   */
  __defineSymbol: defineSymbol,

  /**
   * adds a new function to builtin function list,
   * which directly produce parse tree elements
   * and have their own html/mathml builders
   */
  __defineFunction: defineFunction,

  /**
   * adds a new macro to builtin macro list
   */
  __defineMacro: defineMacro,

  /**
   * Expose the dom tree node types, which can be useful for type checking nodes.
   *
   * NOTE: This method is not currently recommended for public use.
   * The internal tree representation is unstable and is very likely
   * to change. Use at your own risk.
   */
  __domTree: {
    Span,
    Anchor,
    SymbolNode,
    SvgNode,
    PathNode,
    LineNode
  }
};

export { katex as default };
