tui.util.defineNamespace("fedoc.content", {});
fedoc.content["painter_row.js.html"] = "      <div id=\"main\" class=\"main\">\n\n\n\n    \n    <section>\n        <article>\n            <pre class=\"prettyprint source linenums\"><code>/**\n * @fileoverview Painter class for the row(TR) views\n * @author NHN Ent. FE Development Team\n */\n'use strict';\n\nvar Painter = require('../base/painter');\nvar util = require('../common/util');\nvar constMap = require('../common/constMap');\nvar attrNameConst = constMap.attrName;\nvar CELL_BORDER_WIDTH = constMap.dimension.CELL_BORDER_WIDTH;\n\n/**\n * Painter class for the row(TR) views\n * @module painter/row\n * @extends module:base/painter\n */\nvar RowPainter = tui.util.defineClass(Painter, /**@lends module:painter/row.prototype */{\n    /**\n     * @constructs\n     * @param {object} options - Options\n     */\n    init: function(options) {\n        Painter.apply(this, arguments);\n        this.painterManager = options.painterManager;\n    },\n\n    /**\n     * css selector to find its own element(s) from a parent element.\n     * @type {String}\n     */\n    selector: 'tr',\n\n    /**\n     * markup template\n     * @returns {String} HTML string\n     */\n    template: _.template(\n        '&lt;tr ' +\n        '&lt;%=rowKeyAttrName%>=\"&lt;%=rowKey%>\" ' +\n        'class=\"&lt;%=className%>\" ' +\n        'style=\"height: &lt;%=height%>px;\">' +\n        '&lt;%=contents%>' +\n        '&lt;/tr>'\n    ),\n\n    /**\n     * cellData 의 isEditable 프로퍼티에 따른 editType 을 반환한다.\n     * editable 프로퍼티가 false 라면 normal type 으로 설정한다.\n     * @param {string} columnName 컬럼명\n     * @param {Object} cellData 셀 데이터\n     * @returns {string} cellFactory 에서 사용될 editType\n     * @private\n     */\n    _getEditType: function(columnName, cellData) {\n        var editType = tui.util.pick(cellData.columnModel, 'editOption', 'type');\n\n        return editType || 'normal';\n    },\n\n    /**\n     * Returns the HTML string of all cells in Dummy row.\n     * @param {Number} rowNum - row number\n     * @param {Array.&lt;String>} columnNames - An array of column names\n     * @returns {String} HTLM string\n     * @private\n     */\n    _generateHtmlForDummyRow: function(rowNum, columnNames) {\n        var cellPainter = this.painterManager.getCellPainter('dummy'),\n            html = '';\n\n        _.each(columnNames, function(columnName) {\n            html += cellPainter.generateHtml(rowNum, columnName);\n        });\n\n        return html;\n    },\n\n    /**\n     * Returns the HTML string of all cells in Actual row.\n     * @param  {module:model/row} model - View model instance\n     * @param  {Array.&lt;String>} columnNames - An array of column names\n     * @returns {String} HTLM string\n     * @private\n     */\n    _generateHtmlForActualRow: function(model, columnNames) {\n        var html = '';\n\n        _.each(columnNames, function(columnName) {\n            var cellData = model.get(columnName),\n                editType, cellPainter;\n\n            if (cellData &amp;&amp; cellData.isMainRow) {\n                editType = this._getEditType(columnName, cellData);\n                cellPainter = this.painterManager.getCellPainter(editType);\n                html += cellPainter.generateHtml(cellData);\n            }\n        }, this);\n\n        return html;\n    },\n\n    /**\n     * Returns the HTML string of all cells in the given model (row).\n     * @param  {module:model/row} model - View model instance\n     * @param  {Array.&lt;String>} columnNames - An array of column names\n     * @returns {String} HTLM string\n     */\n    generateHtml: function(model, columnNames) {\n        var rowKey = model.get('rowKey');\n        var rowNum = model.get('rowNum');\n        var className = '';\n        var html;\n\n        if (_.isUndefined(rowKey)) {\n            html = this._generateHtmlForDummyRow(rowNum, columnNames);\n        } else {\n            html = this._generateHtmlForActualRow(model, columnNames);\n        }\n\n        return this.template({\n            rowKeyAttrName: attrNameConst.ROW_KEY,\n            rowKey: rowKey,\n            height: model.get('height') + RowPainter._extraHeight + CELL_BORDER_WIDTH,\n            contents: html,\n            className: className\n        });\n    },\n\n    /**\n     * Refreshes the row(TR) element.\n     * @param {object} changed - object that contains the changed data using columnName as keys\n     * @param {jQuery} $tr - jquery object for tr element\n     */\n    refresh: function(changed, $tr) {\n        _.each(changed, function(cellData, columnName) {\n            var editType, cellPainter, $td;\n\n            if (columnName !== '_extraData') {\n                $td = $tr.find('td[' + attrNameConst.COLUMN_NAME + '=' + columnName + ']');\n                editType = this._getEditType(columnName, cellData);\n                cellPainter = this.painterManager.getCellPainter(editType);\n                cellPainter.refresh(cellData, $td);\n            }\n        }, this);\n    },\n\n    static: {\n        /**\n         * IE7에서만 TD의 border만큼 높이가 늘어나는 버그에 대한 예외처리를 위한 값\n         * @memberof RowPainter\n         * @static\n         */\n        _extraHeight: (function() {\n            var value = 0;\n            if (util.isBrowserIE7()) {\n                // css에서 IE7에 대해서만 padding의 높이를 위아래 1px씩 주고 있음 (border가 생겼을 때는 0)\n                value = -2;\n            }\n            return value;\n        })()\n    }\n});\n\nmodule.exports = RowPainter;\n</code></pre>\n        </article>\n    </section>\n\n\n\n</div>\n\n"