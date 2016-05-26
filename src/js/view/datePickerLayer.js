/**
 * @fileoverview Layer class which contains the Toast-UI-DatePicker component
 * @author NHN Ent. FE Development Team
 */
'use strict';

var View = require('../base/view');
var classNameConst = require('../common/classNameConst');
var btnClassName = {
    PREV_YEAR: 'btn-prev-year',
    NEXT_YEAR: 'btn-next-year',
    PREV_MONTH: 'btn-prev-month',
    NEXT_MONTH: 'btn-next-month'
};
var PREFIX_CALENDAR = 'calendar-';
var DatePickerLayer;

/**
 * Returns a HTML string of a span element to represent an arrow-icon
 * @param {String} direction - 'L'(left) or 'R'(right)
 * @returns {String}
 */
function arrowHTML(direction) {
    var dirClassName = direction === 'L' ? classNameConst.ICO_ARROW_LEFT : classNameConst.ICO_ARROW_RIGHT;
    var classNameStr = classNameConst.ICO_ARROW + ' ' + dirClassName;

    return '<span class="' + classNameStr + '"></span>';
}

/**
 * Returns a CSS selector which represents a button element
 * @param {String} btnType - button type
 * @returns {String}
 */
function btnSelector(btnType) {
    return '.' + classNameConst.PREFIX + PREFIX_CALENDAR + btnClassName[btnType];
}

/**
 * Layer class which contains the Toast-UI-DatePicker component
 * @module view/datePickerLayer
 * @extends module:base/view
 */
DatePickerLayer = View.extend(/**@lends module:view/datePickerLayer.prototype */{
    /**
     * @constructs
     * @param {Object} options - Options
     */
    initialize: function(options) {
        var textPainter = options.textPainter;

        this.columnModel = options.columnModel;
        this.domState = options.domState;
        this.calendar = this._createCalendar();
        this.datePicker = this._createDatePicker();

        this._customizeCalendarBtns();

        this.listenTo(textPainter, 'focusIn', this._onFocusInTextInput);
        this.listenTo(textPainter, 'focusOut', this._onFocusOutTextInput);
    },

    className: classNameConst.LAYER_DATE_PICKER,

    /**
     * Creates an instance of tui-component-calendar
     * @returns {tui.component.Calendar}
     * @private
     */
    _createCalendar: function() {
        var $calendarEl = $('<div>').addClass(classNameConst.CALENDAR);

        // prevent blur event from occuring in the input element
        $calendarEl.mousedown(function(ev) {
            ev.preventDefault();
            ev.target.unselectable = true;  // trick for IE8
            return false;
        });

        return new tui.component.Calendar({
            element: $calendarEl,
            classPrefix: classNameConst.PREFIX + PREFIX_CALENDAR
        });
    },

    /**
     * Customize the buttons of the calendar.
     * @private
     */
    _customizeCalendarBtns: function() {
        var $header = this.calendar.$header;
        var leftArrowHTML = arrowHTML('L');
        var rightArrowHTML = arrowHTML('R');

        $header.find(btnSelector('PREV_YEAR')).html(leftArrowHTML + leftArrowHTML);
        $header.find(btnSelector('NEXT_YEAR')).html(rightArrowHTML + rightArrowHTML);
        $header.find(btnSelector('PREV_MONTH')).html(leftArrowHTML);
        $header.find(btnSelector('NEXT_MONTH')).html(rightArrowHTML);
    },

    /**
     * Creates an instance of tui-component-datepicker
     * @returns {tui.compoment.DatePicker}
     * @private
     */
    _createDatePicker: function() {
        var datePicker = new tui.component.DatePicker({
            parentElement: this.$el,
            dateForm: 'yyyy-mm-dd',
            pos: {
                top: 0,
                left: 0
            }
        }, this.calendar);

        datePicker.on('update', function() {
            datePicker.close();
        });

        return datePicker;
    },

    /**
     * Calculates the position of the layer and returns the object that contains css properties.
     * @param {jQuery} $input - input element
     * @returns {Object}
     * @private
     */
    _calculatePosition: function($input) {
        var inputOffset = $input.offset();
        var inputHeight = $input.outerHeight();
        var wrapperOffset = this.domState.getOffset();

        return {
            top: inputOffset.top - wrapperOffset.top + inputHeight,
            left: inputOffset.left - wrapperOffset.left
        };
    },

    /**
     * Event handler for 'focusin' event of module:painter/input/text
     * @param {jQuery} $input - target input element
     * @param {{rowKey: String, columnName: String}} address - target cell address
     * @private
     */
    _onFocusInTextInput: function($input, address) {
        var columnName = address.columnName;
        var columnInfo = this.columnModel.getColumnModel(columnName);
        var editType = this.columnModel.getEditType(columnName);
        var datePickerOptions = tui.util.pick(columnInfo, 'component', 'datePicker');

        // console.log(editType);
        // console.log(datePickerOptions);

        if (editType === 'text' && datePickerOptions) {
            this.$el.css(this._calculatePosition($input)).show();
            this.datePicker.setDateForm(datePickerOptions.dateForm || 'yyyy-mm-dd');
            this.datePicker.setRanges(datePickerOptions.selectableRanges || []);
            this.datePicker.setElement($input);
            this.datePicker.open();
        }
    },

    /**
     * Hides the layer.
     * @private
     */
    _onFocusOutTextInput: function() {
        this.datePicker.close();
        this.$el.hide();
    }
});

module.exports = DatePickerLayer;
