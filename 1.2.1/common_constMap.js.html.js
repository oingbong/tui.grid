tui.util.defineNamespace("fedoc.content", {});
fedoc.content["common_constMap.js.html"] = "      <div id=\"main\" class=\"main\">\n\n\n\n    \n    <section>\n        <article>\n            <pre class=\"prettyprint source linenums\"><code>/**\n* @fileoverview Object that conatins constant values\n* @author NHN Ent. FE Development Team\n*/\n'use strict';\n\nvar keyCode = {\n    TAB: 9,\n    ENTER: 13,\n    CTRL: 17,\n    ESC: 27,\n    LEFT_ARROW: 37,\n    UP_ARROW: 38,\n    RIGHT_ARROW: 39,\n    DOWN_ARROW: 40,\n    CHAR_A: 65,\n    CHAR_C: 67,\n    CHAR_F: 70,\n    CHAR_R: 82,\n    CHAR_V: 86,\n    LEFT_WINDOW_KEY: 91,\n    F5: 116,\n    BACKSPACE: 8,\n    SPACE: 32,\n    PAGE_UP: 33,\n    PAGE_DOWN: 34,\n    HOME: 36,\n    END: 35,\n    DEL: 46,\n    UNDEFINED: 229\n};\n\nmodule.exports = {\n    keyCode: keyCode,\n    keyName: _.invert(keyCode),\n    renderState: {\n        LOADING: 'LOADING',\n        DONE: 'DONE',\n        EMPTY: 'EMPTY'\n    },\n    dimension: {\n        CELL_BORDER_WIDTH: 1,\n        TABLE_BORDER_WIDTH: 1\n    },\n    attrName: {\n        ROW_KEY: 'data-row-key',\n        COLUMN_NAME: 'data-column-name',\n        COLUMN_INDEX: 'data-column-index',\n        EDIT_TYPE: 'data-edit-type',\n        GRID_ID: 'data-grid-id'\n    },\n    themeName: {\n        DEFAULT: 'default',\n        STRIPED: 'striped',\n        CLEAN: 'clean'\n    }\n};\n</code></pre>\n        </article>\n    </section>\n\n\n\n</div>\n\n"