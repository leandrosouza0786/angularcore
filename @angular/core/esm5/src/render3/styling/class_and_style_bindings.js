import * as tslib_1 from "tslib";
import { assertNotEqual } from '../assert';
import { EMPTY_ARRAY, EMPTY_OBJ } from '../empty';
import { RendererStyleFlags3, isProceduralRenderer } from '../interfaces/renderer';
import { NO_CHANGE } from '../tokens';
import { getRootContext } from '../util';
import { BoundPlayerFactory } from './player_factory';
import { addPlayerInternal, allocPlayerContext, createEmptyStylingContext, getPlayerContext } from './util';
/**
 * This file includes the code to power all styling-binding operations in Angular.
 *
 * These include:
 * [style]="myStyleObj"
 * [class]="myClassObj"
 * [style.prop]="myPropValue"
 * [class.name]="myClassValue"
 *
 * There are many different ways in which these functions below are called. Please see
 * `interfaces/styles.ts` to get a better idea of how the styling algorithm works.
 */
/**
 * Creates a new StylingContext an fills it with the provided static styling attribute values.
 */
export function initializeStaticContext(attrs) {
    var context = createEmptyStylingContext();
    var initialClasses = context[3 /* InitialClassValuesPosition */] =
        [null];
    var initialStyles = context[2 /* InitialStyleValuesPosition */] =
        [null];
    // The attributes array has marker values (numbers) indicating what the subsequent
    // values represent. When we encounter a number, we set the mode to that type of attribute.
    var mode = -1;
    for (var i = 0; i < attrs.length; i++) {
        var attr = attrs[i];
        if (typeof attr == 'number') {
            mode = attr;
        }
        else if (mode === 2 /* Styles */) {
            initialStyles.push(attr, attrs[++i]);
        }
        else if (mode === 1 /* Classes */) {
            initialClasses.push(attr, true);
        }
        else if (mode === 3 /* SelectOnly */) {
            break;
        }
    }
    return context;
}
/**
 * Designed to update an existing styling context with new static styling
 * data (classes and styles).
 *
 * @param context the existing styling context
 * @param attrs an array of new static styling attributes that will be
 *              assigned to the context
 * @param directive the directive instance with which static data is associated with.
 */
export function patchContextWithStaticAttrs(context, attrs, directive) {
    // If the styling context has already been patched with the given directive's bindings,
    // then there is no point in doing it again. The reason why this may happen (the directive
    // styling being patched twice) is because the `stylingBinding` function is called each time
    // an element is created (both within a template function and within directive host bindings).
    var directives = context[1 /* DirectiveRegistryPosition */];
    if (getDirectiveRegistryValuesIndexOf(directives, directive) == -1) {
        // this is a new directive which we have not seen yet.
        directives.push(directive, -1, false, null);
        var initialClasses = null;
        var initialStyles = null;
        var mode = -1;
        for (var i = 0; i < attrs.length; i++) {
            var attr = attrs[i];
            if (typeof attr == 'number') {
                mode = attr;
            }
            else if (mode == 1 /* Classes */) {
                initialClasses = initialClasses || context[3 /* InitialClassValuesPosition */];
                patchInitialStylingValue(initialClasses, attr, true);
            }
            else if (mode == 2 /* Styles */) {
                initialStyles = initialStyles || context[2 /* InitialStyleValuesPosition */];
                patchInitialStylingValue(initialStyles, attr, attrs[++i]);
            }
        }
    }
}
/**
 * Designed to add a style or class value into the existing set of initial styles.
 *
 * The function will search and figure out if a style/class value is already present
 * within the provided initial styling array. If and when a style/class value is not
 * present (or if it's value is falsy) then it will be inserted/updated in the list
 * of initial styling values.
 */
function patchInitialStylingValue(initialStyling, prop, value) {
    // Even values are keys; Odd numbers are values; Search keys only
    for (var i = 1 /* KeyValueStartPosition */; i < initialStyling.length;) {
        var key = initialStyling[i];
        if (key === prop) {
            var existingValue = initialStyling[i + 1 /* ValueOffset */];
            // If there is no previous style value (when `null`) or no previous class
            // applied (when `false`) then we update the the newly given value.
            if (existingValue == null || existingValue == false) {
                initialStyling[i + 1 /* ValueOffset */] = value;
            }
            return;
        }
        i = i + 2 /* Size */;
    }
    // We did not find existing key, add a new one.
    initialStyling.push(prop, value);
}
/**
 * Runs through the initial styling data present in the context and renders
 * them via the renderer on the element.
 */
export function renderInitialStylesAndClasses(element, context, renderer) {
    var initialClasses = context[3 /* InitialClassValuesPosition */];
    renderInitialStylingValues(element, renderer, initialClasses, true);
    var initialStyles = context[2 /* InitialStyleValuesPosition */];
    renderInitialStylingValues(element, renderer, initialStyles, false);
}
/**
 * This is a helper function designed to render each entry present within the
 * provided list of initialStylingValues.
 */
function renderInitialStylingValues(element, renderer, initialStylingValues, isEntryClassBased) {
    for (var i = 1 /* KeyValueStartPosition */; i < initialStylingValues.length; i += 2 /* Size */) {
        var value = initialStylingValues[i + 1 /* ValueOffset */];
        if (value) {
            if (isEntryClassBased) {
                setClass(element, initialStylingValues[i + 0 /* PropOffset */], true, renderer, null);
            }
            else {
                setStyle(element, initialStylingValues[i + 0 /* PropOffset */], value, renderer, null);
            }
        }
    }
}
export function allowNewBindingsForStylingContext(context) {
    return (context[0 /* MasterFlagPosition */] & 32 /* BindingAllocationLocked */) === 0;
}
/**
 * Adds in new binding values to a styling context.
 *
 * If a directive value is provided then all provided class/style binding names will
 * reference the provided directive.
 *
 * @param context the existing styling context
 * @param directiveRef the directive that the new bindings will reference
 * @param classBindingNames an array of class binding names that will be added to the context
 * @param styleBindingNames an array of style binding names that will be added to the context
 * @param styleSanitizer an optional sanitizer that handle all sanitization on for each of
 *    the bindings added to the context. Note that if a directive is provided then the sanitizer
 *    instance will only be active if and when the directive updates the bindings that it owns.
 */
export function updateContextWithBindings(context, directiveRef, classBindingNames, styleBindingNames, styleSanitizer, onlyProcessSingleClasses) {
    if (context[0 /* MasterFlagPosition */] & 32 /* BindingAllocationLocked */)
        return;
    // this means the context has already been patched with the directive's bindings
    var directiveIndex = findOrPatchDirectiveIntoRegistry(context, directiveRef, styleSanitizer);
    if (directiveIndex === -1) {
        // this means the directive has already been patched in ... No point in doing anything
        return;
    }
    // there are alot of variables being used below to track where in the context the new
    // binding values will be placed. Because the context consists of multiple types of
    // entries (single classes/styles and multi classes/styles) alot of the index positions
    // need to be computed ahead of time and the context needs to be extended before the values
    // are inserted in.
    var singlePropOffsetValues = context[4 /* SinglePropOffsetPositions */];
    var totalCurrentClassBindings = singlePropOffsetValues[1 /* ClassesCountPosition */];
    var totalCurrentStyleBindings = singlePropOffsetValues[0 /* StylesCountPosition */];
    var classesOffset = totalCurrentClassBindings * 4 /* Size */;
    var stylesOffset = totalCurrentStyleBindings * 4 /* Size */;
    var singleStylesStartIndex = 9 /* SingleStylesStartPosition */;
    var singleClassesStartIndex = singleStylesStartIndex + stylesOffset;
    var multiStylesStartIndex = singleClassesStartIndex + classesOffset;
    var multiClassesStartIndex = multiStylesStartIndex + stylesOffset;
    // because we're inserting more bindings into the context, this means that the
    // binding values need to be referenced the singlePropOffsetValues array so that
    // the template/directive can easily find them inside of the `elementStyleProp`
    // and the `elementClassProp` functions without iterating through the entire context.
    // The first step to setting up these reference points is to mark how many bindings
    // are being added. Even if these bindings already exist in the context, the directive
    // or template code will still call them unknowingly. Therefore the total values need
    // to be registered so that we know how many bindings are assigned to each directive.
    var currentSinglePropsLength = singlePropOffsetValues.length;
    singlePropOffsetValues.push(styleBindingNames ? styleBindingNames.length : 0, classBindingNames ? classBindingNames.length : 0);
    // the code below will check to see if a new style binding already exists in the context
    // if so then there is no point in inserting it into the context again. Whether or not it
    // exists the styling offset code will now know exactly where it is
    var insertionOffset = 0;
    var filteredStyleBindingNames = [];
    if (styleBindingNames && styleBindingNames.length) {
        for (var i_1 = 0; i_1 < styleBindingNames.length; i_1++) {
            var name_1 = styleBindingNames[i_1];
            var singlePropIndex = getMatchingBindingIndex(context, name_1, singleStylesStartIndex, singleClassesStartIndex);
            if (singlePropIndex == -1) {
                singlePropIndex = singleClassesStartIndex + insertionOffset;
                insertionOffset += 4 /* Size */;
                filteredStyleBindingNames.push(name_1);
            }
            singlePropOffsetValues.push(singlePropIndex);
        }
    }
    // just like with the style binding loop above, the new class bindings get the same treatment...
    var filteredClassBindingNames = [];
    if (classBindingNames && classBindingNames.length) {
        for (var i_2 = 0; i_2 < classBindingNames.length; i_2++) {
            var name_2 = classBindingNames[i_2];
            var singlePropIndex = getMatchingBindingIndex(context, name_2, singleClassesStartIndex, multiStylesStartIndex);
            if (singlePropIndex == -1) {
                singlePropIndex = multiStylesStartIndex + insertionOffset;
                insertionOffset += 4 /* Size */;
                filteredClassBindingNames.push(name_2);
            }
            else {
                singlePropIndex += filteredStyleBindingNames.length * 4 /* Size */;
            }
            singlePropOffsetValues.push(singlePropIndex);
        }
    }
    // because new styles are being inserted, this means the existing collection of style offset
    // index values are incorrect (they point to the wrong values). The code below will run through
    // the entire offset array and update the existing set of index values to point to their new
    // locations while taking the new binding values into consideration.
    var i = 2 /* ValueStartPosition */;
    if (filteredStyleBindingNames.length) {
        while (i < currentSinglePropsLength) {
            var totalStyles = singlePropOffsetValues[i + 0 /* StylesCountPosition */];
            var totalClasses = singlePropOffsetValues[i + 1 /* ClassesCountPosition */];
            if (totalClasses) {
                var start = i + 2 /* ValueStartPosition */ + totalStyles;
                for (var j = start; j < start + totalClasses; j++) {
                    singlePropOffsetValues[j] += filteredStyleBindingNames.length * 4 /* Size */;
                }
            }
            var total = totalStyles + totalClasses;
            i += 2 /* ValueStartPosition */ + total;
        }
    }
    var totalNewEntries = filteredClassBindingNames.length + filteredStyleBindingNames.length;
    // in the event that there are new style values being inserted, all existing class and style
    // bindings need to have their pointer values offsetted with the new amount of space that is
    // used for the new style/class bindings.
    for (var i_3 = singleStylesStartIndex; i_3 < context.length; i_3 += 4 /* Size */) {
        var isMultiBased = i_3 >= multiStylesStartIndex;
        var isClassBased = i_3 >= (isMultiBased ? multiClassesStartIndex : singleClassesStartIndex);
        var flag = getPointers(context, i_3);
        var staticIndex = getInitialIndex(flag);
        var singleOrMultiIndex = getMultiOrSingleIndex(flag);
        if (isMultiBased) {
            singleOrMultiIndex +=
                isClassBased ? (filteredStyleBindingNames.length * 4 /* Size */) : 0;
        }
        else {
            singleOrMultiIndex += (totalNewEntries * 4 /* Size */) +
                ((isClassBased ? filteredStyleBindingNames.length : 0) * 4 /* Size */);
        }
        setFlag(context, i_3, pointers(flag, staticIndex, singleOrMultiIndex));
    }
    // this is where we make space in the context for the new style bindings
    for (var i_4 = 0; i_4 < filteredStyleBindingNames.length * 4 /* Size */; i_4++) {
        context.splice(multiClassesStartIndex, 0, null);
        context.splice(singleClassesStartIndex, 0, null);
        singleClassesStartIndex++;
        multiStylesStartIndex++;
        multiClassesStartIndex += 2; // both single + multi slots were inserted
    }
    // this is where we make space in the context for the new class bindings
    for (var i_5 = 0; i_5 < filteredClassBindingNames.length * 4 /* Size */; i_5++) {
        context.splice(multiStylesStartIndex, 0, null);
        context.push(null);
        multiStylesStartIndex++;
        multiClassesStartIndex++;
    }
    var initialClasses = context[3 /* InitialClassValuesPosition */];
    var initialStyles = context[2 /* InitialStyleValuesPosition */];
    // the code below will insert each new entry into the context and assign the appropriate
    // flags and index values to them. It's important this runs at the end of this function
    // because the context, property offset and index values have all been computed just before.
    for (var i_6 = 0; i_6 < totalNewEntries; i_6++) {
        var entryIsClassBased = i_6 >= filteredStyleBindingNames.length;
        var adjustedIndex = entryIsClassBased ? (i_6 - filteredStyleBindingNames.length) : i_6;
        var propName = entryIsClassBased ? filteredClassBindingNames[adjustedIndex] :
            filteredStyleBindingNames[adjustedIndex];
        var multiIndex = void 0, singleIndex = void 0;
        if (entryIsClassBased) {
            multiIndex = multiClassesStartIndex +
                ((totalCurrentClassBindings + adjustedIndex) * 4 /* Size */);
            singleIndex = singleClassesStartIndex +
                ((totalCurrentClassBindings + adjustedIndex) * 4 /* Size */);
        }
        else {
            multiIndex =
                multiStylesStartIndex + ((totalCurrentStyleBindings + adjustedIndex) * 4 /* Size */);
            singleIndex = singleStylesStartIndex +
                ((totalCurrentStyleBindings + adjustedIndex) * 4 /* Size */);
        }
        // if a property is not found in the initial style values list then it
        // is ALWAYS added incase a follow-up directive introduces the same initial
        // style/class value later on.
        var initialValuesToLookup = entryIsClassBased ? initialClasses : initialStyles;
        var indexForInitial = getInitialStylingValuesIndexOf(initialValuesToLookup, propName);
        if (indexForInitial === -1) {
            indexForInitial = initialValuesToLookup.length + 1 /* ValueOffset */;
            initialValuesToLookup.push(propName, entryIsClassBased ? false : null);
        }
        else {
            indexForInitial += 1 /* ValueOffset */;
        }
        var initialFlag = prepareInitialFlag(context, propName, entryIsClassBased, styleSanitizer || null);
        setFlag(context, singleIndex, pointers(initialFlag, indexForInitial, multiIndex));
        setProp(context, singleIndex, propName);
        setValue(context, singleIndex, null);
        setPlayerBuilderIndex(context, singleIndex, 0, directiveIndex);
        setFlag(context, multiIndex, pointers(initialFlag, indexForInitial, singleIndex));
        setProp(context, multiIndex, propName);
        setValue(context, multiIndex, null);
        setPlayerBuilderIndex(context, multiIndex, 0, directiveIndex);
    }
    // the total classes/style values are updated so the next time the context is patched
    // additional style/class bindings from another directive then it knows exactly where
    // to insert them in the context
    singlePropOffsetValues[1 /* ClassesCountPosition */] =
        totalCurrentClassBindings + filteredClassBindingNames.length;
    singlePropOffsetValues[0 /* StylesCountPosition */] =
        totalCurrentStyleBindings + filteredStyleBindingNames.length;
    // there is no initial value flag for the master index since it doesn't
    // reference an initial style value
    var masterFlag = pointers(0, 0, multiStylesStartIndex) |
        (onlyProcessSingleClasses ? 16 /* OnlyProcessSingleClasses */ : 0);
    setFlag(context, 0 /* MasterFlagPosition */, masterFlag);
}
/**
 * Searches through the existing registry of directives
 */
function findOrPatchDirectiveIntoRegistry(context, directiveRef, styleSanitizer) {
    var directiveRefs = context[1 /* DirectiveRegistryPosition */];
    var nextOffsetInsertionIndex = context[4 /* SinglePropOffsetPositions */].length;
    var directiveIndex;
    var detectedIndex = getDirectiveRegistryValuesIndexOf(directiveRefs, directiveRef);
    if (detectedIndex === -1) {
        directiveIndex = directiveRefs.length / 4 /* Size */;
        directiveRefs.push(directiveRef, nextOffsetInsertionIndex, false, styleSanitizer || null);
    }
    else {
        var singlePropStartPosition = detectedIndex + 1 /* SinglePropValuesIndexOffset */;
        if (directiveRefs[singlePropStartPosition] >= 0) {
            // the directive has already been patched into the context
            return -1;
        }
        directiveIndex = detectedIndex / 4 /* Size */;
        // because the directive already existed this means that it was set during elementHostAttrs or
        // elementStart which means that the binding values were not here. Therefore, the values below
        // need to be applied so that single class and style properties can be assigned later.
        var singlePropPositionIndex = detectedIndex + 1 /* SinglePropValuesIndexOffset */;
        directiveRefs[singlePropPositionIndex] = nextOffsetInsertionIndex;
        // the sanitizer is also apart of the binding process and will be used when bindings are
        // applied.
        var styleSanitizerIndex = detectedIndex + 3 /* StyleSanitizerOffset */;
        directiveRefs[styleSanitizerIndex] = styleSanitizer || null;
    }
    return directiveIndex;
}
function getMatchingBindingIndex(context, bindingName, start, end) {
    for (var j = start; j < end; j += 4 /* Size */) {
        if (getProp(context, j) === bindingName)
            return j;
    }
    return -1;
}
/**
 * Sets and resolves all `multi` styling on an `StylingContext` so that they can be
 * applied to the element once `renderStyling` is called.
 *
 * All missing styles/class (any values that are not provided in the new `styles`
 * or `classes` params) will resolve to `null` within their respective positions
 * in the context.
 *
 * @param context The styling context that will be updated with the
 *    newly provided style values.
 * @param classesInput The key/value map of CSS class names that will be used for the update.
 * @param stylesInput The key/value map of CSS styles that will be used for the update.
 */
export function updateStylingMap(context, classesInput, stylesInput, directiveRef) {
    stylesInput = stylesInput || null;
    var directiveIndex = getDirectiveIndexFromRegistry(context, directiveRef || null);
    var element = context[5 /* ElementPosition */];
    var classesPlayerBuilder = classesInput instanceof BoundPlayerFactory ?
        new ClassAndStylePlayerBuilder(classesInput, element, 1 /* Class */) :
        null;
    var stylesPlayerBuilder = stylesInput instanceof BoundPlayerFactory ?
        new ClassAndStylePlayerBuilder(stylesInput, element, 2 /* Style */) :
        null;
    var classesValue = classesPlayerBuilder ?
        classesInput.value :
        classesInput;
    var stylesValue = stylesPlayerBuilder ? stylesInput.value : stylesInput;
    // early exit (this is what's done to avoid using ctx.bind() to cache the value)
    var ignoreAllClassUpdates = limitToSingleClasses(context) || classesValue === NO_CHANGE ||
        classesValue === context[6 /* CachedClassValueOrInitialClassString */];
    var ignoreAllStyleUpdates = stylesValue === NO_CHANGE || stylesValue === context[7 /* CachedStyleValue */];
    if (ignoreAllClassUpdates && ignoreAllStyleUpdates)
        return;
    context[6 /* CachedClassValueOrInitialClassString */] = classesValue;
    context[7 /* CachedStyleValue */] = stylesValue;
    var classNames = EMPTY_ARRAY;
    var applyAllClasses = false;
    var playerBuildersAreDirty = false;
    var classesPlayerBuilderIndex = classesPlayerBuilder ? 1 /* ClassMapPlayerBuilderPosition */ : 0;
    if (hasPlayerBuilderChanged(context, classesPlayerBuilder, 1 /* ClassMapPlayerBuilderPosition */)) {
        setPlayerBuilder(context, classesPlayerBuilder, 1 /* ClassMapPlayerBuilderPosition */);
        playerBuildersAreDirty = true;
    }
    var stylesPlayerBuilderIndex = stylesPlayerBuilder ? 3 /* StyleMapPlayerBuilderPosition */ : 0;
    if (hasPlayerBuilderChanged(context, stylesPlayerBuilder, 3 /* StyleMapPlayerBuilderPosition */)) {
        setPlayerBuilder(context, stylesPlayerBuilder, 3 /* StyleMapPlayerBuilderPosition */);
        playerBuildersAreDirty = true;
    }
    // each time a string-based value pops up then it shouldn't require a deep
    // check of what's changed.
    if (!ignoreAllClassUpdates) {
        if (typeof classesValue == 'string') {
            classNames = classesValue.split(/\s+/);
            // this boolean is used to avoid having to create a key/value map of `true` values
            // since a classname string implies that all those classes are added
            applyAllClasses = true;
        }
        else {
            classNames = classesValue ? Object.keys(classesValue) : EMPTY_ARRAY;
        }
    }
    var classes = (classesValue || EMPTY_OBJ);
    var styleProps = stylesValue ? Object.keys(stylesValue) : EMPTY_ARRAY;
    var styles = stylesValue || EMPTY_OBJ;
    var classesStartIndex = styleProps.length;
    var multiStartIndex = getMultiStartIndex(context);
    var dirty = false;
    var ctxIndex = multiStartIndex;
    var propIndex = 0;
    var propLimit = styleProps.length + classNames.length;
    // the main loop here will try and figure out how the shape of the provided
    // styles differ with respect to the context. Later if the context/styles/classes
    // are off-balance then they will be dealt in another loop after this one
    while (ctxIndex < context.length && propIndex < propLimit) {
        var isClassBased = propIndex >= classesStartIndex;
        var processValue = (!isClassBased && !ignoreAllStyleUpdates) || (isClassBased && !ignoreAllClassUpdates);
        // when there is a cache-hit for a string-based class then we should
        // avoid doing any work diffing any of the changes
        if (processValue) {
            var adjustedPropIndex = isClassBased ? propIndex - classesStartIndex : propIndex;
            var newProp = isClassBased ? classNames[adjustedPropIndex] : styleProps[adjustedPropIndex];
            var newValue = isClassBased ? (applyAllClasses ? true : classes[newProp]) : styles[newProp];
            var playerBuilderIndex = isClassBased ? classesPlayerBuilderIndex : stylesPlayerBuilderIndex;
            var prop = getProp(context, ctxIndex);
            if (prop === newProp) {
                var value = getValue(context, ctxIndex);
                var flag = getPointers(context, ctxIndex);
                setPlayerBuilderIndex(context, ctxIndex, playerBuilderIndex, directiveIndex);
                if (hasValueChanged(flag, value, newValue)) {
                    setValue(context, ctxIndex, newValue);
                    playerBuildersAreDirty = playerBuildersAreDirty || !!playerBuilderIndex;
                    var initialValue = getInitialValue(context, flag);
                    // SKIP IF INITIAL CHECK
                    // If the former `value` is `null` then it means that an initial value
                    // could be being rendered on screen. If that is the case then there is
                    // no point in updating the value incase it matches. In other words if the
                    // new value is the exact same as the previously rendered value (which
                    // happens to be the initial value) then do nothing.
                    if (value != null || hasValueChanged(flag, initialValue, newValue)) {
                        setDirty(context, ctxIndex, true);
                        dirty = true;
                    }
                }
            }
            else {
                var indexOfEntry = findEntryPositionByProp(context, newProp, ctxIndex);
                if (indexOfEntry > 0) {
                    // it was found at a later point ... just swap the values
                    var valueToCompare = getValue(context, indexOfEntry);
                    var flagToCompare = getPointers(context, indexOfEntry);
                    swapMultiContextEntries(context, ctxIndex, indexOfEntry);
                    if (hasValueChanged(flagToCompare, valueToCompare, newValue)) {
                        var initialValue = getInitialValue(context, flagToCompare);
                        setValue(context, ctxIndex, newValue);
                        // same if statement logic as above (look for SKIP IF INITIAL CHECK).
                        if (valueToCompare != null || hasValueChanged(flagToCompare, initialValue, newValue)) {
                            setDirty(context, ctxIndex, true);
                            playerBuildersAreDirty = playerBuildersAreDirty || !!playerBuilderIndex;
                            dirty = true;
                        }
                    }
                }
                else {
                    // we only care to do this if the insertion is in the middle
                    var newFlag = prepareInitialFlag(context, newProp, isClassBased, getStyleSanitizer(context, directiveIndex));
                    playerBuildersAreDirty = playerBuildersAreDirty || !!playerBuilderIndex;
                    insertNewMultiProperty(context, ctxIndex, isClassBased, newProp, newFlag, newValue, directiveIndex, playerBuilderIndex);
                    dirty = true;
                }
            }
        }
        ctxIndex += 4 /* Size */;
        propIndex++;
    }
    // this means that there are left-over values in the context that
    // were not included in the provided styles/classes and in this
    // case the  goal is to "remove" them from the context (by nullifying)
    while (ctxIndex < context.length) {
        var flag = getPointers(context, ctxIndex);
        var isClassBased = (flag & 2 /* Class */) === 2 /* Class */;
        var processValue = (!isClassBased && !ignoreAllStyleUpdates) || (isClassBased && !ignoreAllClassUpdates);
        if (processValue) {
            var value = getValue(context, ctxIndex);
            var doRemoveValue = valueExists(value, isClassBased);
            if (doRemoveValue) {
                setDirty(context, ctxIndex, true);
                setValue(context, ctxIndex, null);
                // we keep the player factory the same so that the `nulled` value can
                // be instructed into the player because removing a style and/or a class
                // is a valid animation player instruction.
                var playerBuilderIndex = isClassBased ? classesPlayerBuilderIndex : stylesPlayerBuilderIndex;
                setPlayerBuilderIndex(context, ctxIndex, playerBuilderIndex, directiveIndex);
                dirty = true;
            }
        }
        ctxIndex += 4 /* Size */;
    }
    // this means that there are left-over properties in the context that
    // were not detected in the context during the loop above. In that
    // case we want to add the new entries into the list
    var sanitizer = getStyleSanitizer(context, directiveIndex);
    while (propIndex < propLimit) {
        var isClassBased = propIndex >= classesStartIndex;
        var processValue = (!isClassBased && !ignoreAllStyleUpdates) || (isClassBased && !ignoreAllClassUpdates);
        if (processValue) {
            var adjustedPropIndex = isClassBased ? propIndex - classesStartIndex : propIndex;
            var prop = isClassBased ? classNames[adjustedPropIndex] : styleProps[adjustedPropIndex];
            var value = isClassBased ? (applyAllClasses ? true : classes[prop]) : styles[prop];
            var flag = prepareInitialFlag(context, prop, isClassBased, sanitizer) | 1 /* Dirty */;
            var playerBuilderIndex = isClassBased ? classesPlayerBuilderIndex : stylesPlayerBuilderIndex;
            var ctxIndex_1 = context.length;
            context.push(flag, prop, value, 0);
            setPlayerBuilderIndex(context, ctxIndex_1, playerBuilderIndex, directiveIndex);
            dirty = true;
        }
        propIndex++;
    }
    if (dirty) {
        setContextDirty(context, true);
        setDirectiveDirty(context, directiveIndex, true);
    }
    if (playerBuildersAreDirty) {
        setContextPlayersDirty(context, true);
    }
}
/**
 * This method will toggle the referenced CSS class (by the provided index)
 * within the given context.
 *
 * @param context The styling context that will be updated with the
 *    newly provided class value.
 * @param offset The index of the CSS class which is being updated.
 * @param addOrRemove Whether or not to add or remove the CSS class
 */
export function updateClassProp(context, offset, addOrRemove, directiveRef) {
    _updateSingleStylingValue(context, offset, addOrRemove, true, directiveRef);
}
/**
 * Sets and resolves a single style value on the provided `StylingContext` so
 * that they can be applied to the element once `renderStyling` is called.
 *
 * Note that prop-level styling values are considered higher priority than any styling that
 * has been applied using `updateStylingMap`, therefore, when styling values are rendered
 * then any styles/classes that have been applied using this function will be considered first
 * (then multi values second and then initial values as a backup).
 *
 * @param context The styling context that will be updated with the
 *    newly provided style value.
 * @param offset The index of the property which is being updated.
 * @param value The CSS style value that will be assigned
 * @param directiveRef an optional reference to the directive responsible
 *    for this binding change. If present then style binding will only
 *    actualize if the directive has ownership over this binding
 *    (see styling.ts#directives for more information about the algorithm).
 */
export function updateStyleProp(context, offset, input, directiveRef) {
    _updateSingleStylingValue(context, offset, input, false, directiveRef);
}
function _updateSingleStylingValue(context, offset, input, isClassBased, directiveRef) {
    var directiveIndex = getDirectiveIndexFromRegistry(context, directiveRef || null);
    var singleIndex = getSinglePropIndexValue(context, directiveIndex, offset, isClassBased);
    var currValue = getValue(context, singleIndex);
    var currFlag = getPointers(context, singleIndex);
    var currDirective = getDirectiveIndexFromEntry(context, singleIndex);
    var value = (input instanceof BoundPlayerFactory) ? input.value : input;
    if (hasValueChanged(currFlag, currValue, value) &&
        allowValueChange(currValue, value, currDirective, directiveIndex)) {
        var isClassBased_1 = (currFlag & 2 /* Class */) === 2 /* Class */;
        var element = context[5 /* ElementPosition */];
        var playerBuilder = input instanceof BoundPlayerFactory ?
            new ClassAndStylePlayerBuilder(input, element, isClassBased_1 ? 1 /* Class */ : 2 /* Style */) :
            null;
        var value_1 = (playerBuilder ? input.value : input);
        var currPlayerIndex = getPlayerBuilderIndex(context, singleIndex);
        var playerBuildersAreDirty = false;
        var playerBuilderIndex = playerBuilder ? currPlayerIndex : 0;
        if (hasPlayerBuilderChanged(context, playerBuilder, currPlayerIndex)) {
            var newIndex = setPlayerBuilder(context, playerBuilder, currPlayerIndex);
            playerBuilderIndex = playerBuilder ? newIndex : 0;
            playerBuildersAreDirty = true;
        }
        if (playerBuildersAreDirty || currDirective !== directiveIndex) {
            setPlayerBuilderIndex(context, singleIndex, playerBuilderIndex, directiveIndex);
        }
        if (currDirective !== directiveIndex) {
            var prop = getProp(context, singleIndex);
            var sanitizer = getStyleSanitizer(context, directiveIndex);
            setSanitizeFlag(context, singleIndex, (sanitizer && sanitizer(prop)) ? true : false);
        }
        // the value will always get updated (even if the dirty flag is skipped)
        setValue(context, singleIndex, value_1);
        var indexForMulti = getMultiOrSingleIndex(currFlag);
        // if the value is the same in the multi-area then there's no point in re-assembling
        var valueForMulti = getValue(context, indexForMulti);
        if (!valueForMulti || hasValueChanged(currFlag, valueForMulti, value_1)) {
            var multiDirty = false;
            var singleDirty = true;
            // only when the value is set to `null` should the multi-value get flagged
            if (!valueExists(value_1, isClassBased_1) && valueExists(valueForMulti, isClassBased_1)) {
                multiDirty = true;
                singleDirty = false;
            }
            setDirty(context, indexForMulti, multiDirty);
            setDirty(context, singleIndex, singleDirty);
            setDirectiveDirty(context, directiveIndex, true);
            setContextDirty(context, true);
        }
        if (playerBuildersAreDirty) {
            setContextPlayersDirty(context, true);
        }
    }
}
/**
 * Renders all queued styling using a renderer onto the given element.
 *
 * This function works by rendering any styles (that have been applied
 * using `updateStylingMap`) and any classes (that have been applied using
 * `updateStyleProp`) onto the provided element using the provided renderer.
 * Just before the styles/classes are rendered a final key/value style map
 * will be assembled (if `styleStore` or `classStore` are provided).
 *
 * @param lElement the element that the styles will be rendered on
 * @param context The styling context that will be used to determine
 *      what styles will be rendered
 * @param renderer the renderer that will be used to apply the styling
 * @param classesStore if provided, the updated class values will be applied
 *    to this key/value map instead of being renderered via the renderer.
 * @param stylesStore if provided, the updated style values will be applied
 *    to this key/value map instead of being renderered via the renderer.
 * @param directiveRef an optional directive that will be used to target which
 *    styling values are rendered. If left empty, only the bindings that are
 *    registered on the template will be rendered.
 * @returns number the total amount of players that got queued for animation (if any)
 */
export function renderStyling(context, renderer, rootOrView, isFirstRender, classesStore, stylesStore, directiveRef) {
    var totalPlayersQueued = 0;
    var targetDirectiveIndex = getDirectiveIndexFromRegistry(context, directiveRef || null);
    if (isContextDirty(context) && isDirectiveDirty(context, targetDirectiveIndex)) {
        var flushPlayerBuilders = context[0 /* MasterFlagPosition */] & 8 /* PlayerBuildersDirty */;
        var native = context[5 /* ElementPosition */];
        var multiStartIndex = getMultiStartIndex(context);
        var onlySingleClasses = limitToSingleClasses(context);
        var stillDirty = false;
        for (var i = 9 /* SingleStylesStartPosition */; i < context.length; i += 4 /* Size */) {
            // there is no point in rendering styles that have not changed on screen
            if (isDirty(context, i)) {
                var flag = getPointers(context, i);
                var directiveIndex = getDirectiveIndexFromEntry(context, i);
                if (targetDirectiveIndex !== directiveIndex) {
                    stillDirty = true;
                    continue;
                }
                var prop = getProp(context, i);
                var value = getValue(context, i);
                var styleSanitizer = (flag & 4 /* Sanitize */) ? getStyleSanitizer(context, directiveIndex) : null;
                var playerBuilder = getPlayerBuilder(context, i);
                var isClassBased = flag & 2 /* Class */ ? true : false;
                var isInSingleRegion = i < multiStartIndex;
                var readInitialValue = !isClassBased || !onlySingleClasses;
                var valueToApply = value;
                // VALUE DEFER CASE 1: Use a multi value instead of a null single value
                // this check implies that a single value was removed and we
                // should now defer to a multi value and use that (if set).
                if (isInSingleRegion && !valueExists(valueToApply, isClassBased)) {
                    // single values ALWAYS have a reference to a multi index
                    var multiIndex = getMultiOrSingleIndex(flag);
                    valueToApply = getValue(context, multiIndex);
                }
                // VALUE DEFER CASE 2: Use the initial value if all else fails (is falsy)
                // the initial value will always be a string or null,
                // therefore we can safely adopt it incase there's nothing else
                // note that this should always be a falsy check since `false` is used
                // for both class and style comparisons (styles can't be false and false
                // classes are turned off and should therefore defer to their initial values)
                // Note that we ignore class-based deferals because otherwise a class can never
                // be removed in the case that it exists as true in the initial classes list...
                if (!isClassBased && !valueExists(valueToApply, isClassBased) && readInitialValue) {
                    valueToApply = getInitialValue(context, flag);
                }
                // if the first render is true then we do not want to start applying falsy
                // values to the DOM element's styling. Otherwise then we know there has
                // been a change and even if it's falsy then it's removing something that
                // was truthy before.
                var doApplyValue = isFirstRender ? valueToApply : true;
                if (doApplyValue) {
                    if (isClassBased) {
                        setClass(native, prop, valueToApply ? true : false, renderer, classesStore, playerBuilder);
                    }
                    else {
                        setStyle(native, prop, valueToApply, renderer, styleSanitizer, stylesStore, playerBuilder);
                    }
                }
                setDirty(context, i, false);
            }
        }
        if (flushPlayerBuilders) {
            var rootContext = Array.isArray(rootOrView) ? getRootContext(rootOrView) : rootOrView;
            var playerContext = getPlayerContext(context);
            var playersStartIndex = playerContext[0 /* NonBuilderPlayersStart */];
            for (var i = 1 /* PlayerBuildersStartPosition */; i < playersStartIndex; i += 2 /* PlayerAndPlayerBuildersTupleSize */) {
                var builder = playerContext[i];
                var playerInsertionIndex = i + 1 /* PlayerOffsetPosition */;
                var oldPlayer = playerContext[playerInsertionIndex];
                if (builder) {
                    var player = builder.buildPlayer(oldPlayer, isFirstRender);
                    if (player !== undefined) {
                        if (player != null) {
                            var wasQueued = addPlayerInternal(playerContext, rootContext, native, player, playerInsertionIndex);
                            wasQueued && totalPlayersQueued++;
                        }
                        if (oldPlayer) {
                            oldPlayer.destroy();
                        }
                    }
                }
                else if (oldPlayer) {
                    // the player builder has been removed ... therefore we should delete the associated
                    // player
                    oldPlayer.destroy();
                }
            }
            setContextPlayersDirty(context, false);
        }
        setDirectiveDirty(context, targetDirectiveIndex, false);
        setContextDirty(context, stillDirty);
    }
    return totalPlayersQueued;
}
/**
 * This function renders a given CSS prop/value entry using the
 * provided renderer. If a `store` value is provided then
 * that will be used a render context instead of the provided
 * renderer.
 *
 * @param native the DOM Element
 * @param prop the CSS style property that will be rendered
 * @param value the CSS style value that will be rendered
 * @param renderer
 * @param store an optional key/value map that will be used as a context to render styles on
 */
export function setStyle(native, prop, value, renderer, sanitizer, store, playerBuilder) {
    value = sanitizer && value ? sanitizer(prop, value) : value;
    if (store || playerBuilder) {
        if (store) {
            store.setValue(prop, value);
        }
        if (playerBuilder) {
            playerBuilder.setValue(prop, value);
        }
    }
    else if (value) {
        value = value.toString(); // opacity, z-index and flexbox all have number values which may not
        // assign as numbers
        ngDevMode && ngDevMode.rendererSetStyle++;
        isProceduralRenderer(renderer) ?
            renderer.setStyle(native, prop, value, RendererStyleFlags3.DashCase) :
            native['style'].setProperty(prop, value);
    }
    else {
        ngDevMode && ngDevMode.rendererRemoveStyle++;
        isProceduralRenderer(renderer) ?
            renderer.removeStyle(native, prop, RendererStyleFlags3.DashCase) :
            native['style'].removeProperty(prop);
    }
}
/**
 * This function renders a given CSS class value using the provided
 * renderer (by adding or removing it from the provided element).
 * If a `store` value is provided then that will be used a render
 * context instead of the provided renderer.
 *
 * @param native the DOM Element
 * @param prop the CSS style property that will be rendered
 * @param value the CSS style value that will be rendered
 * @param renderer
 * @param store an optional key/value map that will be used as a context to render styles on
 */
function setClass(native, className, add, renderer, store, playerBuilder) {
    if (store || playerBuilder) {
        if (store) {
            store.setValue(className, add);
        }
        if (playerBuilder) {
            playerBuilder.setValue(className, add);
        }
    }
    else if (add) {
        ngDevMode && ngDevMode.rendererAddClass++;
        isProceduralRenderer(renderer) ? renderer.addClass(native, className) :
            native['classList'].add(className);
    }
    else {
        ngDevMode && ngDevMode.rendererRemoveClass++;
        isProceduralRenderer(renderer) ? renderer.removeClass(native, className) :
            native['classList'].remove(className);
    }
}
function setSanitizeFlag(context, index, sanitizeYes) {
    if (sanitizeYes) {
        context[index] |= 4 /* Sanitize */;
    }
    else {
        context[index] &= ~4 /* Sanitize */;
    }
}
function setDirty(context, index, isDirtyYes) {
    var adjustedIndex = index >= 9 /* SingleStylesStartPosition */ ? (index + 0 /* FlagsOffset */) : index;
    if (isDirtyYes) {
        context[adjustedIndex] |= 1 /* Dirty */;
    }
    else {
        context[adjustedIndex] &= ~1 /* Dirty */;
    }
}
function isDirty(context, index) {
    var adjustedIndex = index >= 9 /* SingleStylesStartPosition */ ? (index + 0 /* FlagsOffset */) : index;
    return (context[adjustedIndex] & 1 /* Dirty */) == 1 /* Dirty */;
}
export function isClassBasedValue(context, index) {
    var adjustedIndex = index >= 9 /* SingleStylesStartPosition */ ? (index + 0 /* FlagsOffset */) : index;
    return (context[adjustedIndex] & 2 /* Class */) == 2 /* Class */;
}
function isSanitizable(context, index) {
    var adjustedIndex = index >= 9 /* SingleStylesStartPosition */ ? (index + 0 /* FlagsOffset */) : index;
    return (context[adjustedIndex] & 4 /* Sanitize */) == 4 /* Sanitize */;
}
function pointers(configFlag, staticIndex, dynamicIndex) {
    return (configFlag & 63 /* BitMask */) | (staticIndex << 6 /* BitCountSize */) |
        (dynamicIndex << (14 /* BitCountSize */ + 6 /* BitCountSize */));
}
function getInitialValue(context, flag) {
    var index = getInitialIndex(flag);
    var entryIsClassBased = flag & 2 /* Class */;
    var initialValues = entryIsClassBased ? context[3 /* InitialClassValuesPosition */] :
        context[2 /* InitialStyleValuesPosition */];
    return initialValues[index];
}
function getInitialIndex(flag) {
    return (flag >> 6 /* BitCountSize */) & 16383 /* BitMask */;
}
function getMultiOrSingleIndex(flag) {
    var index = (flag >> (14 /* BitCountSize */ + 6 /* BitCountSize */)) & 16383 /* BitMask */;
    return index >= 9 /* SingleStylesStartPosition */ ? index : -1;
}
function getMultiStartIndex(context) {
    return getMultiOrSingleIndex(context[0 /* MasterFlagPosition */]);
}
function setProp(context, index, prop) {
    context[index + 1 /* PropertyOffset */] = prop;
}
function setValue(context, index, value) {
    context[index + 2 /* ValueOffset */] = value;
}
function hasPlayerBuilderChanged(context, builder, index) {
    var playerContext = context[8 /* PlayerContext */];
    if (builder) {
        if (!playerContext || index === 0) {
            return true;
        }
    }
    else if (!playerContext) {
        return false;
    }
    return playerContext[index] !== builder;
}
function setPlayerBuilder(context, builder, insertionIndex) {
    var playerContext = context[8 /* PlayerContext */] || allocPlayerContext(context);
    if (insertionIndex > 0) {
        playerContext[insertionIndex] = builder;
    }
    else {
        insertionIndex = playerContext[0 /* NonBuilderPlayersStart */];
        playerContext.splice(insertionIndex, 0, builder, null);
        playerContext[0 /* NonBuilderPlayersStart */] +=
            2 /* PlayerAndPlayerBuildersTupleSize */;
    }
    return insertionIndex;
}
export function directiveOwnerPointers(directiveIndex, playerIndex) {
    return (playerIndex << 16 /* BitCountSize */) | directiveIndex;
}
function setPlayerBuilderIndex(context, index, playerBuilderIndex, directiveIndex) {
    var value = directiveOwnerPointers(directiveIndex, playerBuilderIndex);
    context[index + 3 /* PlayerBuilderIndexOffset */] = value;
}
function getPlayerBuilderIndex(context, index) {
    var flag = context[index + 3 /* PlayerBuilderIndexOffset */];
    var playerBuilderIndex = (flag >> 16 /* BitCountSize */) &
        65535 /* BitMask */;
    return playerBuilderIndex;
}
function getPlayerBuilder(context, index) {
    var playerBuilderIndex = getPlayerBuilderIndex(context, index);
    if (playerBuilderIndex) {
        var playerContext = context[8 /* PlayerContext */];
        if (playerContext) {
            return playerContext[playerBuilderIndex];
        }
    }
    return null;
}
function setFlag(context, index, flag) {
    var adjustedIndex = index === 0 /* MasterFlagPosition */ ? index : (index + 0 /* FlagsOffset */);
    context[adjustedIndex] = flag;
}
function getPointers(context, index) {
    var adjustedIndex = index === 0 /* MasterFlagPosition */ ? index : (index + 0 /* FlagsOffset */);
    return context[adjustedIndex];
}
export function getValue(context, index) {
    return context[index + 2 /* ValueOffset */];
}
export function getProp(context, index) {
    return context[index + 1 /* PropertyOffset */];
}
export function isContextDirty(context) {
    return isDirty(context, 0 /* MasterFlagPosition */);
}
export function limitToSingleClasses(context) {
    return context[0 /* MasterFlagPosition */] & 16 /* OnlyProcessSingleClasses */;
}
export function setContextDirty(context, isDirtyYes) {
    setDirty(context, 0 /* MasterFlagPosition */, isDirtyYes);
}
export function setContextPlayersDirty(context, isDirtyYes) {
    if (isDirtyYes) {
        context[0 /* MasterFlagPosition */] |= 8 /* PlayerBuildersDirty */;
    }
    else {
        context[0 /* MasterFlagPosition */] &= ~8 /* PlayerBuildersDirty */;
    }
}
function findEntryPositionByProp(context, prop, startIndex) {
    for (var i = (startIndex || 0) + 1 /* PropertyOffset */; i < context.length; i += 4 /* Size */) {
        var thisProp = context[i];
        if (thisProp == prop) {
            return i - 1 /* PropertyOffset */;
        }
    }
    return -1;
}
function swapMultiContextEntries(context, indexA, indexB) {
    var tmpValue = getValue(context, indexA);
    var tmpProp = getProp(context, indexA);
    var tmpFlag = getPointers(context, indexA);
    var tmpPlayerBuilderIndex = getPlayerBuilderIndex(context, indexA);
    var flagA = tmpFlag;
    var flagB = getPointers(context, indexB);
    var singleIndexA = getMultiOrSingleIndex(flagA);
    if (singleIndexA >= 0) {
        var _flag = getPointers(context, singleIndexA);
        var _initial = getInitialIndex(_flag);
        setFlag(context, singleIndexA, pointers(_flag, _initial, indexB));
    }
    var singleIndexB = getMultiOrSingleIndex(flagB);
    if (singleIndexB >= 0) {
        var _flag = getPointers(context, singleIndexB);
        var _initial = getInitialIndex(_flag);
        setFlag(context, singleIndexB, pointers(_flag, _initial, indexA));
    }
    setValue(context, indexA, getValue(context, indexB));
    setProp(context, indexA, getProp(context, indexB));
    setFlag(context, indexA, getPointers(context, indexB));
    var playerIndexA = getPlayerBuilderIndex(context, indexB);
    var directiveIndexA = 0;
    setPlayerBuilderIndex(context, indexA, playerIndexA, directiveIndexA);
    setValue(context, indexB, tmpValue);
    setProp(context, indexB, tmpProp);
    setFlag(context, indexB, tmpFlag);
    setPlayerBuilderIndex(context, indexB, tmpPlayerBuilderIndex, directiveIndexA);
}
function updateSinglePointerValues(context, indexStartPosition) {
    for (var i = indexStartPosition; i < context.length; i += 4 /* Size */) {
        var multiFlag = getPointers(context, i);
        var singleIndex = getMultiOrSingleIndex(multiFlag);
        if (singleIndex > 0) {
            var singleFlag = getPointers(context, singleIndex);
            var initialIndexForSingle = getInitialIndex(singleFlag);
            var flagValue = (isDirty(context, singleIndex) ? 1 /* Dirty */ : 0 /* None */) |
                (isClassBasedValue(context, singleIndex) ? 2 /* Class */ : 0 /* None */) |
                (isSanitizable(context, singleIndex) ? 4 /* Sanitize */ : 0 /* None */);
            var updatedFlag = pointers(flagValue, initialIndexForSingle, i);
            setFlag(context, singleIndex, updatedFlag);
        }
    }
}
function insertNewMultiProperty(context, index, classBased, name, flag, value, directiveIndex, playerIndex) {
    var doShift = index < context.length;
    // prop does not exist in the list, add it in
    context.splice(index, 0, flag | 1 /* Dirty */ | (classBased ? 2 /* Class */ : 0 /* None */), name, value, 0);
    setPlayerBuilderIndex(context, index, playerIndex, directiveIndex);
    if (doShift) {
        // because the value was inserted midway into the array then we
        // need to update all the shifted multi values' single value
        // pointers to point to the newly shifted location
        updateSinglePointerValues(context, index + 4 /* Size */);
    }
}
function valueExists(value, isClassBased) {
    if (isClassBased) {
        return value ? true : false;
    }
    return value !== null;
}
function prepareInitialFlag(context, prop, entryIsClassBased, sanitizer) {
    var flag = (sanitizer && sanitizer(prop)) ? 4 /* Sanitize */ : 0 /* None */;
    var initialIndex;
    if (entryIsClassBased) {
        flag |= 2 /* Class */;
        initialIndex =
            getInitialStylingValuesIndexOf(context[3 /* InitialClassValuesPosition */], prop);
    }
    else {
        initialIndex =
            getInitialStylingValuesIndexOf(context[2 /* InitialStyleValuesPosition */], prop);
    }
    initialIndex = initialIndex > 0 ? (initialIndex + 1 /* ValueOffset */) : 0;
    return pointers(flag, initialIndex, 0);
}
function hasValueChanged(flag, a, b) {
    var isClassBased = flag & 2 /* Class */;
    var hasValues = a && b;
    var usesSanitizer = flag & 4 /* Sanitize */;
    // the toString() comparison ensures that a value is checked
    // ... otherwise (during sanitization bypassing) the === comparsion
    // would fail since a new String() instance is created
    if (!isClassBased && hasValues && usesSanitizer) {
        // we know for sure we're dealing with strings at this point
        return a.toString() !== b.toString();
    }
    // everything else is safe to check with a normal equality check
    return a !== b;
}
var ClassAndStylePlayerBuilder = /** @class */ (function () {
    function ClassAndStylePlayerBuilder(factory, _element, _type) {
        this._element = _element;
        this._type = _type;
        this._values = {};
        this._dirty = false;
        this._factory = factory;
    }
    ClassAndStylePlayerBuilder.prototype.setValue = function (prop, value) {
        if (this._values[prop] !== value) {
            this._values[prop] = value;
            this._dirty = true;
        }
    };
    ClassAndStylePlayerBuilder.prototype.buildPlayer = function (currentPlayer, isFirstRender) {
        // if no values have been set here then this means the binding didn't
        // change and therefore the binding values were not updated through
        // `setValue` which means no new player will be provided.
        if (this._dirty) {
            var player = this._factory.fn(this._element, this._type, this._values, isFirstRender, currentPlayer || null);
            this._values = {};
            this._dirty = false;
            return player;
        }
        return undefined;
    };
    return ClassAndStylePlayerBuilder;
}());
export { ClassAndStylePlayerBuilder };
export function generateConfigSummary(source, index) {
    var flag, name = 'config value for ';
    if (Array.isArray(source)) {
        if (index) {
            name += 'index: ' + index;
        }
        else {
            name += 'master config';
        }
        index = index || 0 /* MasterFlagPosition */;
        flag = source[index];
    }
    else {
        flag = source;
        name += 'index: ' + flag;
    }
    var dynamicIndex = getMultiOrSingleIndex(flag);
    var staticIndex = getInitialIndex(flag);
    return {
        name: name,
        staticIndex: staticIndex,
        dynamicIndex: dynamicIndex,
        value: flag,
        flags: {
            dirty: flag & 1 /* Dirty */ ? true : false,
            class: flag & 2 /* Class */ ? true : false,
            sanitize: flag & 4 /* Sanitize */ ? true : false,
            playerBuildersDirty: flag & 8 /* PlayerBuildersDirty */ ? true : false,
            onlyProcessSingleClasses: flag & 16 /* OnlyProcessSingleClasses */ ? true : false,
            bindingAllocationLocked: flag & 32 /* BindingAllocationLocked */ ? true : false,
        }
    };
}
export function getDirectiveIndexFromEntry(context, index) {
    var value = context[index + 3 /* PlayerBuilderIndexOffset */];
    return value & 65535 /* BitMask */;
}
function getDirectiveIndexFromRegistry(context, directive) {
    var index = getDirectiveRegistryValuesIndexOf(context[1 /* DirectiveRegistryPosition */], directive);
    ngDevMode &&
        assertNotEqual(index, -1, "The provided directive " + directive + " has not been allocated to the element's style/class bindings");
    return index > 0 ? index / 4 /* Size */ : 0;
    // return index / DirectiveRegistryValuesIndex.Size;
}
function getDirectiveRegistryValuesIndexOf(directives, directive) {
    for (var i = 0; i < directives.length; i += 4 /* Size */) {
        if (directives[i] === directive) {
            return i;
        }
    }
    return -1;
}
function getInitialStylingValuesIndexOf(keyValues, key) {
    for (var i = 1 /* KeyValueStartPosition */; i < keyValues.length; i += 2 /* Size */) {
        if (keyValues[i] === key)
            return i;
    }
    return -1;
}
export function compareLogSummaries(a, b) {
    var log = [];
    var diffs = [];
    diffSummaryValues(diffs, 'staticIndex', 'staticIndex', a, b);
    diffSummaryValues(diffs, 'dynamicIndex', 'dynamicIndex', a, b);
    Object.keys(a.flags).forEach(function (name) { diffSummaryValues(diffs, 'flags.' + name, name, a.flags, b.flags); });
    if (diffs.length) {
        log.push('Log Summaries for:');
        log.push('  A: ' + a.name);
        log.push('  B: ' + b.name);
        log.push('\n  Differ in the following way (A !== B):');
        diffs.forEach(function (result) {
            var _a = tslib_1.__read(result, 3), name = _a[0], aVal = _a[1], bVal = _a[2];
            log.push('    => ' + name);
            log.push('    => ' + aVal + ' !== ' + bVal + '\n');
        });
    }
    return log;
}
function diffSummaryValues(result, name, prop, a, b) {
    var aVal = a[prop];
    var bVal = b[prop];
    if (aVal !== bVal) {
        result.push([name, aVal, bVal]);
    }
}
function getSinglePropIndexValue(context, directiveIndex, offset, isClassBased) {
    var singlePropOffsetRegistryIndex = context[1 /* DirectiveRegistryPosition */][(directiveIndex * 4 /* Size */) +
        1 /* SinglePropValuesIndexOffset */];
    var offsets = context[4 /* SinglePropOffsetPositions */];
    var indexForOffset = singlePropOffsetRegistryIndex +
        2 /* ValueStartPosition */ +
        (isClassBased ?
            offsets[singlePropOffsetRegistryIndex + 0 /* StylesCountPosition */] :
            0) +
        offset;
    return offsets[indexForOffset];
}
function getStyleSanitizer(context, directiveIndex) {
    var dirs = context[1 /* DirectiveRegistryPosition */];
    var value = dirs[directiveIndex * 4 /* Size */ +
        3 /* StyleSanitizerOffset */] ||
        dirs[3 /* StyleSanitizerOffset */] || null;
    return value;
}
function isDirectiveDirty(context, directiveIndex) {
    var dirs = context[1 /* DirectiveRegistryPosition */];
    return dirs[directiveIndex * 4 /* Size */ +
        2 /* DirtyFlagOffset */];
}
function setDirectiveDirty(context, directiveIndex, dirtyYes) {
    var dirs = context[1 /* DirectiveRegistryPosition */];
    dirs[directiveIndex * 4 /* Size */ +
        2 /* DirtyFlagOffset */] = dirtyYes;
}
function allowValueChange(currentValue, newValue, currentDirectiveOwner, newDirectiveOwner) {
    // the code below relies the importance of directive's being tied to their
    // index value. The index values for each directive are derived from being
    // registered into the styling context directive registry. The most important
    // directive is the parent component directive (the template) and each directive
    // that is added after is considered less important than the previous entry. This
    // prioritization of directives enables the styling algorithm to decide if a style
    // or class should be allowed to be updated/replaced incase an earlier directive
    // already wrote to the exact same style-property or className value. In other words
    // ... this decides what to do if and when there is a collision.
    if (currentValue) {
        if (newValue) {
            // if a directive index is lower than it always has priority over the
            // previous directive's value...
            return newDirectiveOwner <= currentDirectiveOwner;
        }
        else {
            // only write a null value incase it's the same owner writing it.
            // this avoids having a higher-priority directive write to null
            // only to have a lesser-priority directive change right to a
            // non-null value immediately afterwards.
            return currentDirectiveOwner === newDirectiveOwner;
        }
    }
    return true;
}
/**
 * This function is only designed to be called for `[class]` bindings when
 * `[ngClass]` (or something that uses `class` as an input) is present. Once
 * directive host bindings fully work for `[class]` and `[style]` inputs
 * then this can be deleted.
 */
export function getInitialClassNameValue(context) {
    var className = context[6 /* CachedClassValueOrInitialClassString */];
    if (className == null) {
        className = '';
        var initialClassValues = context[3 /* InitialClassValuesPosition */];
        for (var i = 1 /* KeyValueStartPosition */; i < initialClassValues.length; i += 2 /* Size */) {
            var isPresent = initialClassValues[i + 1];
            if (isPresent) {
                className += (className.length ? ' ' : '') + initialClassValues[i];
            }
        }
        context[6 /* CachedClassValueOrInitialClassString */] = className;
    }
    return className;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhc3NfYW5kX3N0eWxlX2JpbmRpbmdzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29yZS9zcmMvcmVuZGVyMy9zdHlsaW5nL2NsYXNzX2FuZF9zdHlsZV9iaW5kaW5ncy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBUUEsT0FBTyxFQUFDLGNBQWMsRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUN6QyxPQUFPLEVBQUMsV0FBVyxFQUFFLFNBQVMsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUdoRCxPQUFPLEVBQXNCLG1CQUFtQixFQUFFLG9CQUFvQixFQUFDLE1BQU0sd0JBQXdCLENBQUM7QUFHdEcsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUNwQyxPQUFPLEVBQUMsY0FBYyxFQUFDLE1BQU0sU0FBUyxDQUFDO0FBRXZDLE9BQU8sRUFBQyxrQkFBa0IsRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQ3BELE9BQU8sRUFBQyxpQkFBaUIsRUFBRSxrQkFBa0IsRUFBRSx5QkFBeUIsRUFBRSxnQkFBZ0IsRUFBQyxNQUFNLFFBQVEsQ0FBQztBQUcxRzs7Ozs7Ozs7Ozs7R0FXRztBQUlIOztHQUVHO0FBQ0gsTUFBTSxVQUFVLHVCQUF1QixDQUFDLEtBQWtCO0lBQ3hELElBQU0sT0FBTyxHQUFHLHlCQUF5QixFQUFFLENBQUM7SUFDNUMsSUFBTSxjQUFjLEdBQXlCLE9BQU8sb0NBQXlDO1FBQ3pGLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDWCxJQUFNLGFBQWEsR0FBeUIsT0FBTyxvQ0FBeUM7UUFDeEYsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUVYLGtGQUFrRjtJQUNsRiwyRkFBMkY7SUFDM0YsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDZCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFB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QUcsa0JBQWtCLENBQUMsTUFBTSxFQUN0RixDQUFDLGdCQUFrQyxFQUFFO1lBQ3hDLElBQU0sU0FBUyxHQUFHLGtCQUFrQixDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUM1QyxJQUFJLFNBQVMsRUFBRTtnQkFDYixTQUFTLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ3BFO1NBQ0Y7UUFDRCxPQUFPLDhDQUFtRCxHQUFHLFNBQVMsQ0FBQztLQUN4RTtJQUNELE9BQU8sU0FBUyxDQUFDO0FBQ25CLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiogQGxpY2Vuc2VcbiogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4qXG4qIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4qIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiovXG5pbXBvcnQge1N0eWxlU2FuaXRpemVGbn0gZnJvbSAnLi4vLi4vc2FuaXRpemF0aW9uL3N0eWxlX3Nhbml0aXplcic7XG5pbXBvcnQge2Fzc2VydE5vdEVxdWFsfSBmcm9tICcuLi9hc3NlcnQnO1xuaW1wb3J0IHtFTVBUWV9BUlJBWSwgRU1QVFlfT0JKfSBmcm9tICcuLi9lbXB0eSc7XG5pbXBvcnQge0F0dHJpYnV0ZU1hcmtlciwgVEF0dHJpYnV0ZXN9IGZyb20gJy4uL2ludGVyZmFjZXMvbm9kZSc7XG5pbXBvcnQge0JpbmRpbmdTdG9yZSwgQmluZGluZ1R5cGUsIFBsYXllciwgUGxheWVyQnVpbGRlciwgUGxheWVyRmFjdG9yeSwgUGxheWVySW5kZXh9IGZyb20gJy4uL2ludGVyZmFjZXMvcGxheWVyJztcbmltcG9ydCB7UkVsZW1lbnQsIFJlbmRlcmVyMywgUmVuZGVyZXJTdHlsZUZsYWdzMywgaXNQcm9jZWR1cmFsUmVuZGVyZXJ9IGZyb20gJy4uL2ludGVyZmFjZXMvcmVuZGVyZXInO1xuaW1wb3J0IHtEaXJlY3RpdmVPd25lckFuZFBsYXllckJ1aWxkZXJJbmRleCwgRGlyZWN0aXZlUmVnaXN0cnlWYWx1ZXMsIERpcmVjdGl2ZVJlZ2lzdHJ5VmFsdWVzSW5kZXgsIEluaXRpYWxTdHlsaW5nVmFsdWVzLCBJbml0aWFsU3R5bGluZ1ZhbHVlc0luZGV4LCBTaW5nbGVQcm9wT2Zmc2V0VmFsdWVzLCBTaW5nbGVQcm9wT2Zmc2V0VmFsdWVzSW5kZXgsIFN0eWxpbmdDb250ZXh0LCBTdHlsaW5nRmxhZ3MsIFN0eWxpbmdJbmRleH0gZnJvbSAnLi4vaW50ZXJmYWNlcy9zdHlsaW5nJztcbmltcG9ydCB7TFZpZXcsIFJvb3RDb250ZXh0fSBmcm9tICcuLi9pbnRlcmZhY2VzL3ZpZXcnO1xuaW1wb3J0IHtOT19DSEFOR0V9IGZyb20gJy4uL3Rva2Vucyc7XG5pbXBvcnQge2dldFJvb3RDb250ZXh0fSBmcm9tICcuLi91dGlsJztcblxuaW1wb3J0IHtCb3VuZFBsYXllckZhY3Rvcnl9IGZyb20gJy4vcGxheWVyX2ZhY3RvcnknO1xuaW1wb3J0IHthZGRQbGF5ZXJJbnRlcm5hbCwgYWxsb2NQbGF5ZXJDb250ZXh0LCBjcmVhdGVFbXB0eVN0eWxpbmdDb250ZXh0LCBnZXRQbGF5ZXJDb250ZXh0fSBmcm9tICcuL3V0aWwnO1xuXG5cbi8qKlxuICogVGhpcyBmaWxlIGluY2x1ZGVzIHRoZSBjb2RlIHRvIHBvd2VyIGFsbCBzdHlsaW5nLWJpbmRpbmcgb3BlcmF0aW9ucyBpbiBBbmd1bGFyLlxuICpcbiAqIFRoZXNlIGluY2x1ZGU6XG4gKiBbc3R5bGVdPVwibXlTdHlsZU9ialwiXG4gKiBbY2xhc3NdPVwibXlDbGFzc09ialwiXG4gKiBbc3R5bGUucHJvcF09XCJteVByb3BWYWx1ZVwiXG4gKiBbY2xhc3MubmFtZV09XCJteUNsYXNzVmFsdWVcIlxuICpcbiAqIFRoZXJlIGFyZSBtYW55IGRpZmZlcmVudCB3YXlzIGluIHdoaWNoIHRoZXNlIGZ1bmN0aW9ucyBiZWxvdyBhcmUgY2FsbGVkLiBQbGVhc2Ugc2VlXG4gKiBgaW50ZXJmYWNlcy9zdHlsZXMudHNgIHRvIGdldCBhIGJldHRlciBpZGVhIG9mIGhvdyB0aGUgc3R5bGluZyBhbGdvcml0aG0gd29ya3MuXG4gKi9cblxuXG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBTdHlsaW5nQ29udGV4dCBhbiBmaWxscyBpdCB3aXRoIHRoZSBwcm92aWRlZCBzdGF0aWMgc3R5bGluZyBhdHRyaWJ1dGUgdmFsdWVzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5pdGlhbGl6ZVN0YXRpY0NvbnRleHQoYXR0cnM6IFRBdHRyaWJ1dGVzKSB7XG4gIGNvbnN0IGNvbnRleHQgPSBjcmVhdGVFbXB0eVN0eWxpbmdDb250ZXh0KCk7XG4gIGNvbnN0IGluaXRpYWxDbGFzc2VzOiBJbml0aWFsU3R5bGluZ1ZhbHVlcyA9IGNvbnRleHRbU3R5bGluZ0luZGV4LkluaXRpYWxDbGFzc1ZhbHVlc1Bvc2l0aW9uXSA9XG4gICAgICBbbnVsbF07XG4gIGNvbnN0IGluaXRpYWxTdHlsZXM6IEluaXRpYWxTdHlsaW5nVmFsdWVzID0gY29udGV4dFtTdHlsaW5nSW5kZXguSW5pdGlhbFN0eWxlVmFsdWVzUG9zaXRpb25dID1cbiAgICAgIFtudWxsXTtcblxuICAvLyBUaGUgYXR0cmlidXRlcyBhcnJheSBoYXMgbWFya2VyIHZhbHVlcyAobnVtYmVycykgaW5kaWNhdGluZyB3aGF0IHRoZSBzdWJzZXF1ZW50XG4gIC8vIHZhbHVlcyByZXByZXNlbnQuIFdoZW4gd2UgZW5jb3VudGVyIGEgbnVtYmVyLCB3ZSBzZXQgdGhlIG1vZGUgdG8gdGhhdCB0eXBlIG9mIGF0dHJpYnV0ZS5cbiAgbGV0IG1vZGUgPSAtMTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBhdHRycy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGF0dHIgPSBhdHRyc1tpXTtcbiAgICBpZiAodHlwZW9mIGF0dHIgPT0gJ251bWJlcicpIHtcbiAgICAgIG1vZGUgPSBhdHRyO1xuICAgIH0gZWxzZSBpZiAobW9kZSA9PT0gQXR0cmlidXRlTWFya2VyLlN0eWxlcykge1xuICAgICAgaW5pdGlhbFN0eWxlcy5wdXNoKGF0dHIgYXMgc3RyaW5nLCBhdHRyc1srK2ldIGFzIHN0cmluZyk7XG4gICAgfSBlbHNlIGlmIChtb2RlID09PSBBdHRyaWJ1dGVNYXJrZXIuQ2xhc3Nlcykge1xuICAgICAgaW5pdGlhbENsYXNzZXMucHVzaChhdHRyIGFzIHN0cmluZywgdHJ1ZSk7XG4gICAgfSBlbHNlIGlmIChtb2RlID09PSBBdHRyaWJ1dGVNYXJrZXIuU2VsZWN0T25seSkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGNvbnRleHQ7XG59XG5cbi8qKlxuICogRGVzaWduZWQgdG8gdXBkYXRlIGFuIGV4aXN0aW5nIHN0eWxpbmcgY29udGV4dCB3aXRoIG5ldyBzdGF0aWMgc3R5bGluZ1xuICogZGF0YSAoY2xhc3NlcyBhbmQgc3R5bGVzKS5cbiAqXG4gKiBAcGFyYW0gY29udGV4dCB0aGUgZXhpc3Rpbmcgc3R5bGluZyBjb250ZXh0XG4gKiBAcGFyYW0gYXR0cnMgYW4gYXJyYXkgb2YgbmV3IHN0YXRpYyBzdHlsaW5nIGF0dHJpYnV0ZXMgdGhhdCB3aWxsIGJlXG4gKiAgICAgICAgICAgICAgYXNzaWduZWQgdG8gdGhlIGNvbnRleHRcbiAqIEBwYXJhbSBkaXJlY3RpdmUgdGhlIGRpcmVjdGl2ZSBpbnN0YW5jZSB3aXRoIHdoaWNoIHN0YXRpYyBkYXRhIGlzIGFzc29jaWF0ZWQgd2l0aC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhdGNoQ29udGV4dFdpdGhTdGF0aWNBdHRycyhcbiAgICBjb250ZXh0OiBTdHlsaW5nQ29udGV4dCwgYXR0cnM6IFRBdHRyaWJ1dGVzLCBkaXJlY3RpdmU6IGFueSk6IHZvaWQge1xuICAvLyBJZiB0aGUgc3R5bGluZyBjb250ZXh0IGhhcyBhbHJlYWR5IGJlZW4gcGF0Y2hlZCB3aXRoIHRoZSBnaXZlbiBkaXJlY3RpdmUncyBiaW5kaW5ncyxcbiAgLy8gdGhlbiB0aGVyZSBpcyBubyBwb2ludCBpbiBkb2luZyBpdCBhZ2Fpbi4gVGhlIHJlYXNvbiB3aHkgdGhpcyBtYXkgaGFwcGVuICh0aGUgZGlyZWN0aXZlXG4gIC8vIHN0eWxpbmcgYmVpbmcgcGF0Y2hlZCB0d2ljZSkgaXMgYmVjYXVzZSB0aGUgYHN0eWxpbmdCaW5kaW5nYCBmdW5jdGlvbiBpcyBjYWxsZWQgZWFjaCB0aW1lXG4gIC8vIGFuIGVsZW1lbnQgaXMgY3JlYXRlZCAoYm90aCB3aXRoaW4gYSB0ZW1wbGF0ZSBmdW5jdGlvbiBhbmQgd2l0aGluIGRpcmVjdGl2ZSBob3N0IGJpbmRpbmdzKS5cbiAgY29uc3QgZGlyZWN0aXZlcyA9IGNvbnRleHRbU3R5bGluZ0luZGV4LkRpcmVjdGl2ZVJlZ2lzdHJ5UG9zaXRpb25dO1xuICBpZiAoZ2V0RGlyZWN0aXZlUmVnaXN0cnlWYWx1ZXNJbmRleE9mKGRpcmVjdGl2ZXMsIGRpcmVjdGl2ZSkgPT0gLTEpIHtcbiAgICAvLyB0aGlzIGlzIGEgbmV3IGRpcmVjdGl2ZSB3aGljaCB3ZSBoYXZlIG5vdCBzZWVuIHlldC5cbiAgICBkaXJlY3RpdmVzLnB1c2goZGlyZWN0aXZlLCAtMSwgZmFsc2UsIG51bGwpO1xuXG4gICAgbGV0IGluaXRpYWxDbGFzc2VzOiBJbml0aWFsU3R5bGluZ1ZhbHVlc3xudWxsID0gbnVsbDtcbiAgICBsZXQgaW5pdGlhbFN0eWxlczogSW5pdGlhbFN0eWxpbmdWYWx1ZXN8bnVsbCA9IG51bGw7XG5cbiAgICBsZXQgbW9kZSA9IC0xO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXR0cnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IGF0dHIgPSBhdHRyc1tpXTtcbiAgICAgIGlmICh0eXBlb2YgYXR0ciA9PSAnbnVtYmVyJykge1xuICAgICAgICBtb2RlID0gYXR0cjtcbiAgICAgIH0gZWxzZSBpZiAobW9kZSA9PSBBdHRyaWJ1dGVNYXJrZXIuQ2xhc3Nlcykge1xuICAgICAgICBpbml0aWFsQ2xhc3NlcyA9IGluaXRpYWxDbGFzc2VzIHx8IGNvbnRleHRbU3R5bGluZ0luZGV4LkluaXRpYWxDbGFzc1ZhbHVlc1Bvc2l0aW9uXTtcbiAgICAgICAgcGF0Y2hJbml0aWFsU3R5bGluZ1ZhbHVlKGluaXRpYWxDbGFzc2VzLCBhdHRyLCB0cnVlKTtcbiAgICAgIH0gZWxzZSBpZiAobW9kZSA9PSBBdHRyaWJ1dGVNYXJrZXIuU3R5bGVzKSB7XG4gICAgICAgIGluaXRpYWxTdHlsZXMgPSBpbml0aWFsU3R5bGVzIHx8IGNvbnRleHRbU3R5bGluZ0luZGV4LkluaXRpYWxTdHlsZVZhbHVlc1Bvc2l0aW9uXTtcbiAgICAgICAgcGF0Y2hJbml0aWFsU3R5bGluZ1ZhbHVlKGluaXRpYWxTdHlsZXMsIGF0dHIsIGF0dHJzWysraV0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIERlc2lnbmVkIHRvIGFkZCBhIHN0eWxlIG9yIGNsYXNzIHZhbHVlIGludG8gdGhlIGV4aXN0aW5nIHNldCBvZiBpbml0aWFsIHN0eWxlcy5cbiAqXG4gKiBUaGUgZnVuY3Rpb24gd2lsbCBzZWFyY2ggYW5kIGZpZ3VyZSBvdXQgaWYgYSBzdHlsZS9jbGFzcyB2YWx1ZSBpcyBhbHJlYWR5IHByZXNlbnRcbiAqIHdpdGhpbiB0aGUgcHJvdmlkZWQgaW5pdGlhbCBzdHlsaW5nIGFycmF5LiBJZiBhbmQgd2hlbiBhIHN0eWxlL2NsYXNzIHZhbHVlIGlzIG5vdFxuICogcHJlc2VudCAob3IgaWYgaXQncyB2YWx1ZSBpcyBmYWxzeSkgdGhlbiBpdCB3aWxsIGJlIGluc2VydGVkL3VwZGF0ZWQgaW4gdGhlIGxpc3RcbiAqIG9mIGluaXRpYWwgc3R5bGluZyB2YWx1ZXMuXG4gKi9cbmZ1bmN0aW9uIHBhdGNoSW5pdGlhbFN0eWxpbmdWYWx1ZShcbiAgICBpbml0aWFsU3R5bGluZzogSW5pdGlhbFN0eWxpbmdWYWx1ZXMsIHByb3A6IHN0cmluZywgdmFsdWU6IGFueSk6IHZvaWQge1xuICAvLyBFdmVuIHZhbHVlcyBhcmUga2V5czsgT2RkIG51bWJlcnMgYXJlIHZhbHVlczsgU2VhcmNoIGtleXMgb25seVxuICBmb3IgKGxldCBpID0gSW5pdGlhbFN0eWxpbmdWYWx1ZXNJbmRleC5LZXlWYWx1ZVN0YXJ0UG9zaXRpb247IGkgPCBpbml0aWFsU3R5bGluZy5sZW5ndGg7KSB7XG4gICAgY29uc3Qga2V5ID0gaW5pdGlhbFN0eWxpbmdbaV07XG4gICAgaWYgKGtleSA9PT0gcHJvcCkge1xuICAgICAgY29uc3QgZXhpc3RpbmdWYWx1ZSA9IGluaXRpYWxTdHlsaW5nW2kgKyBJbml0aWFsU3R5bGluZ1ZhbHVlc0luZGV4LlZhbHVlT2Zmc2V0XTtcblxuICAgICAgLy8gSWYgdGhlcmUgaXMgbm8gcHJldmlvdXMgc3R5bGUgdmFsdWUgKHdoZW4gYG51bGxgKSBvciBubyBwcmV2aW91cyBjbGFzc1xuICAgICAgLy8gYXBwbGllZCAod2hlbiBgZmFsc2VgKSB0aGVuIHdlIHVwZGF0ZSB0aGUgdGhlIG5ld2x5IGdpdmVuIHZhbHVlLlxuICAgICAgaWYgKGV4aXN0aW5nVmFsdWUgPT0gbnVsbCB8fCBleGlzdGluZ1ZhbHVlID09IGZhbHNlKSB7XG4gICAgICAgIGluaXRpYWxTdHlsaW5nW2kgKyBJbml0aWFsU3R5bGluZ1ZhbHVlc0luZGV4LlZhbHVlT2Zmc2V0XSA9IHZhbHVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpID0gaSArIEluaXRpYWxTdHlsaW5nVmFsdWVzSW5kZXguU2l6ZTtcbiAgfVxuICAvLyBXZSBkaWQgbm90IGZpbmQgZXhpc3Rpbmcga2V5LCBhZGQgYSBuZXcgb25lLlxuICBpbml0aWFsU3R5bGluZy5wdXNoKHByb3AsIHZhbHVlKTtcbn1cblxuLyoqXG4gKiBSdW5zIHRocm91Z2ggdGhlIGluaXRpYWwgc3R5bGluZyBkYXRhIHByZXNlbnQgaW4gdGhlIGNvbnRleHQgYW5kIHJlbmRlcnNcbiAqIHRoZW0gdmlhIHRoZSByZW5kZXJlciBvbiB0aGUgZWxlbWVudC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlckluaXRpYWxTdHlsZXNBbmRDbGFzc2VzKFxuICAgIGVsZW1lbnQ6IFJFbGVtZW50LCBjb250ZXh0OiBTdHlsaW5nQ29udGV4dCwgcmVuZGVyZXI6IFJlbmRlcmVyMykge1xuICBjb25zdCBpbml0aWFsQ2xhc3NlcyA9IGNvbnRleHRbU3R5bGluZ0luZGV4LkluaXRpYWxDbGFzc1ZhbHVlc1Bvc2l0aW9uXTtcbiAgcmVuZGVySW5pdGlhbFN0eWxpbmdWYWx1ZXMoZWxlbWVudCwgcmVuZGVyZXIsIGluaXRpYWxDbGFzc2VzLCB0cnVlKTtcblxuICBjb25zdCBpbml0aWFsU3R5bGVzID0gY29udGV4dFtTdHlsaW5nSW5kZXguSW5pdGlhbFN0eWxlVmFsdWVzUG9zaXRpb25dO1xuICByZW5kZXJJbml0aWFsU3R5bGluZ1ZhbHVlcyhlbGVtZW50LCByZW5kZXJlciwgaW5pdGlhbFN0eWxlcywgZmFsc2UpO1xufVxuXG4vKipcbiAqIFRoaXMgaXMgYSBoZWxwZXIgZnVuY3Rpb24gZGVzaWduZWQgdG8gcmVuZGVyIGVhY2ggZW50cnkgcHJlc2VudCB3aXRoaW4gdGhlXG4gKiBwcm92aWRlZCBsaXN0IG9mIGluaXRpYWxTdHlsaW5nVmFsdWVzLlxuICovXG5mdW5jdGlvbiByZW5kZXJJbml0aWFsU3R5bGluZ1ZhbHVlcyhcbiAgICBlbGVtZW50OiBSRWxlbWVudCwgcmVuZGVyZXI6IFJlbmRlcmVyMywgaW5pdGlhbFN0eWxpbmdWYWx1ZXM6IEluaXRpYWxTdHlsaW5nVmFsdWVzLFxuICAgIGlzRW50cnlDbGFzc0Jhc2VkOiBib29sZWFuKSB7XG4gIGZvciAobGV0IGkgPSBJbml0aWFsU3R5bGluZ1ZhbHVlc0luZGV4LktleVZhbHVlU3RhcnRQb3NpdGlvbjsgaSA8IGluaXRpYWxTdHlsaW5nVmFsdWVzLmxlbmd0aDtcbiAgICAgICBpICs9IEluaXRpYWxTdHlsaW5nVmFsdWVzSW5kZXguU2l6ZSkge1xuICAgIGNvbnN0IHZhbHVlID0gaW5pdGlhbFN0eWxpbmdWYWx1ZXNbaSArIEluaXRpYWxTdHlsaW5nVmFsdWVzSW5kZXguVmFsdWVPZmZzZXRdO1xuICAgIGlmICh2YWx1ZSkge1xuICAgICAgaWYgKGlzRW50cnlDbGFzc0Jhc2VkKSB7XG4gICAgICAgIHNldENsYXNzKFxuICAgICAgICAgICAgZWxlbWVudCwgaW5pdGlhbFN0eWxpbmdWYWx1ZXNbaSArIEluaXRpYWxTdHlsaW5nVmFsdWVzSW5kZXguUHJvcE9mZnNldF0gYXMgc3RyaW5nLCB0cnVlLFxuICAgICAgICAgICAgcmVuZGVyZXIsIG51bGwpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2V0U3R5bGUoXG4gICAgICAgICAgICBlbGVtZW50LCBpbml0aWFsU3R5bGluZ1ZhbHVlc1tpICsgSW5pdGlhbFN0eWxpbmdWYWx1ZXNJbmRleC5Qcm9wT2Zmc2V0XSBhcyBzdHJpbmcsXG4gICAgICAgICAgICB2YWx1ZSBhcyBzdHJpbmcsIHJlbmRlcmVyLCBudWxsKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFsbG93TmV3QmluZGluZ3NGb3JTdHlsaW5nQ29udGV4dChjb250ZXh0OiBTdHlsaW5nQ29udGV4dCk6IGJvb2xlYW4ge1xuICByZXR1cm4gKGNvbnRleHRbU3R5bGluZ0luZGV4Lk1hc3RlckZsYWdQb3NpdGlvbl0gJiBTdHlsaW5nRmxhZ3MuQmluZGluZ0FsbG9jYXRpb25Mb2NrZWQpID09PSAwO1xufVxuXG4vKipcbiAqIEFkZHMgaW4gbmV3IGJpbmRpbmcgdmFsdWVzIHRvIGEgc3R5bGluZyBjb250ZXh0LlxuICpcbiAqIElmIGEgZGlyZWN0aXZlIHZhbHVlIGlzIHByb3ZpZGVkIHRoZW4gYWxsIHByb3ZpZGVkIGNsYXNzL3N0eWxlIGJpbmRpbmcgbmFtZXMgd2lsbFxuICogcmVmZXJlbmNlIHRoZSBwcm92aWRlZCBkaXJlY3RpdmUuXG4gKlxuICogQHBhcmFtIGNvbnRleHQgdGhlIGV4aXN0aW5nIHN0eWxpbmcgY29udGV4dFxuICogQHBhcmFtIGRpcmVjdGl2ZVJlZiB0aGUgZGlyZWN0aXZlIHRoYXQgdGhlIG5ldyBiaW5kaW5ncyB3aWxsIHJlZmVyZW5jZVxuICogQHBhcmFtIGNsYXNzQmluZGluZ05hbWVzIGFuIGFycmF5IG9mIGNsYXNzIGJpbmRpbmcgbmFtZXMgdGhhdCB3aWxsIGJlIGFkZGVkIHRvIHRoZSBjb250ZXh0XG4gKiBAcGFyYW0gc3R5bGVCaW5kaW5nTmFtZXMgYW4gYXJyYXkgb2Ygc3R5bGUgYmluZGluZyBuYW1lcyB0aGF0IHdpbGwgYmUgYWRkZWQgdG8gdGhlIGNvbnRleHRcbiAqIEBwYXJhbSBzdHlsZVNhbml0aXplciBhbiBvcHRpb25hbCBzYW5pdGl6ZXIgdGhhdCBoYW5kbGUgYWxsIHNhbml0aXphdGlvbiBvbiBmb3IgZWFjaCBvZlxuICogICAgdGhlIGJpbmRpbmdzIGFkZGVkIHRvIHRoZSBjb250ZXh0LiBOb3RlIHRoYXQgaWYgYSBkaXJlY3RpdmUgaXMgcHJvdmlkZWQgdGhlbiB0aGUgc2FuaXRpemVyXG4gKiAgICBpbnN0YW5jZSB3aWxsIG9ubHkgYmUgYWN0aXZlIGlmIGFuZCB3aGVuIHRoZSBkaXJlY3RpdmUgdXBkYXRlcyB0aGUgYmluZGluZ3MgdGhhdCBpdCBvd25zLlxuICovXG5leHBvcnQgZnVuY3Rpb24gdXBkYXRlQ29udGV4dFdpdGhCaW5kaW5ncyhcbiAgICBjb250ZXh0OiBTdHlsaW5nQ29udGV4dCwgZGlyZWN0aXZlUmVmOiBhbnkgfCBudWxsLCBjbGFzc0JpbmRpbmdOYW1lcz86IHN0cmluZ1tdIHwgbnVsbCxcbiAgICBzdHlsZUJpbmRpbmdOYW1lcz86IHN0cmluZ1tdIHwgbnVsbCwgc3R5bGVTYW5pdGl6ZXI/OiBTdHlsZVNhbml0aXplRm4gfCBudWxsLFxuICAgIG9ubHlQcm9jZXNzU2luZ2xlQ2xhc3Nlcz86IGJvb2xlYW4pIHtcbiAgaWYgKGNvbnRleHRbU3R5bGluZ0luZGV4Lk1hc3RlckZsYWdQb3NpdGlvbl0gJiBTdHlsaW5nRmxhZ3MuQmluZGluZ0FsbG9jYXRpb25Mb2NrZWQpIHJldHVybjtcblxuICAvLyB0aGlzIG1lYW5zIHRoZSBjb250ZXh0IGhhcyBhbHJlYWR5IGJlZW4gcGF0Y2hlZCB3aXRoIHRoZSBkaXJlY3RpdmUncyBiaW5kaW5nc1xuICBjb25zdCBkaXJlY3RpdmVJbmRleCA9IGZpbmRPclBhdGNoRGlyZWN0aXZlSW50b1JlZ2lzdHJ5KGNvbnRleHQsIGRpcmVjdGl2ZVJlZiwgc3R5bGVTYW5pdGl6ZXIpO1xuICBpZiAoZGlyZWN0aXZlSW5kZXggPT09IC0xKSB7XG4gICAgLy8gdGhpcyBtZWFucyB0aGUgZGlyZWN0aXZlIGhhcyBhbHJlYWR5IGJlZW4gcGF0Y2hlZCBpbiAuLi4gTm8gcG9pbnQgaW4gZG9pbmcgYW55dGhpbmdcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyB0aGVyZSBhcmUgYWxvdCBvZiB2YXJpYWJsZXMgYmVpbmcgdXNlZCBiZWxvdyB0byB0cmFjayB3aGVyZSBpbiB0aGUgY29udGV4dCB0aGUgbmV3XG4gIC8vIGJpbmRpbmcgdmFsdWVzIHdpbGwgYmUgcGxhY2VkLiBCZWNhdXNlIHRoZSBjb250ZXh0IGNvbnNpc3RzIG9mIG11bHRpcGxlIHR5cGVzIG9mXG4gIC8vIGVudHJpZXMgKHNpbmdsZSBjbGFzc2VzL3N0eWxlcyBhbmQgbXVsdGkgY2xhc3Nlcy9zdHlsZXMpIGFsb3Qgb2YgdGhlIGluZGV4IHBvc2l0aW9uc1xuICAvLyBuZWVkIHRvIGJlIGNvbXB1dGVkIGFoZWFkIG9mIHRpbWUgYW5kIHRoZSBjb250ZXh0IG5lZWRzIHRvIGJlIGV4dGVuZGVkIGJlZm9yZSB0aGUgdmFsdWVzXG4gIC8vIGFyZSBpbnNlcnRlZCBpbi5cbiAgY29uc3Qgc2luZ2xlUHJvcE9mZnNldFZhbHVlcyA9IGNvbnRleHRbU3R5bGluZ0luZGV4LlNpbmdsZVByb3BPZmZzZXRQb3NpdGlvbnNdO1xuICBjb25zdCB0b3RhbEN1cnJlbnRDbGFzc0JpbmRpbmdzID1cbiAgICAgIHNpbmdsZVByb3BPZmZzZXRWYWx1ZXNbU2luZ2xlUHJvcE9mZnNldFZhbHVlc0luZGV4LkNsYXNzZXNDb3VudFBvc2l0aW9uXTtcbiAgY29uc3QgdG90YWxDdXJyZW50U3R5bGVCaW5kaW5ncyA9XG4gICAgICBzaW5nbGVQcm9wT2Zmc2V0VmFsdWVzW1NpbmdsZVByb3BPZmZzZXRWYWx1ZXNJbmRleC5TdHlsZXNDb3VudFBvc2l0aW9uXTtcblxuICBjb25zdCBjbGFzc2VzT2Zmc2V0ID0gdG90YWxDdXJyZW50Q2xhc3NCaW5kaW5ncyAqIFN0eWxpbmdJbmRleC5TaXplO1xuICBjb25zdCBzdHlsZXNPZmZzZXQgPSB0b3RhbEN1cnJlbnRTdHlsZUJpbmRpbmdzICogU3R5bGluZ0luZGV4LlNpemU7XG5cbiAgY29uc3Qgc2luZ2xlU3R5bGVzU3RhcnRJbmRleCA9IFN0eWxpbmdJbmRleC5TaW5nbGVTdHlsZXNTdGFydFBvc2l0aW9uO1xuICBsZXQgc2luZ2xlQ2xhc3Nlc1N0YXJ0SW5kZXggPSBzaW5nbGVTdHlsZXNTdGFydEluZGV4ICsgc3R5bGVzT2Zmc2V0O1xuICBsZXQgbXVsdGlTdHlsZXNTdGFydEluZGV4ID0gc2luZ2xlQ2xhc3Nlc1N0YXJ0SW5kZXggKyBjbGFzc2VzT2Zmc2V0O1xuICBsZXQgbXVsdGlDbGFzc2VzU3RhcnRJbmRleCA9IG11bHRpU3R5bGVzU3RhcnRJbmRleCArIHN0eWxlc09mZnNldDtcblxuICAvLyBiZWNhdXNlIHdlJ3JlIGluc2VydGluZyBtb3JlIGJpbmRpbmdzIGludG8gdGhlIGNvbnRleHQsIHRoaXMgbWVhbnMgdGhhdCB0aGVcbiAgLy8gYmluZGluZyB2YWx1ZXMgbmVlZCB0byBiZSByZWZlcmVuY2VkIHRoZSBzaW5nbGVQcm9wT2Zmc2V0VmFsdWVzIGFycmF5IHNvIHRoYXRcbiAgLy8gdGhlIHRlbXBsYXRlL2RpcmVjdGl2ZSBjYW4gZWFzaWx5IGZpbmQgdGhlbSBpbnNpZGUgb2YgdGhlIGBlbGVtZW50U3R5bGVQcm9wYFxuICAvLyBhbmQgdGhlIGBlbGVtZW50Q2xhc3NQcm9wYCBmdW5jdGlvbnMgd2l0aG91dCBpdGVyYXRpbmcgdGhyb3VnaCB0aGUgZW50aXJlIGNvbnRleHQuXG4gIC8vIFRoZSBmaXJzdCBzdGVwIHRvIHNldHRpbmcgdXAgdGhlc2UgcmVmZXJlbmNlIHBvaW50cyBpcyB0byBtYXJrIGhvdyBtYW55IGJpbmRpbmdzXG4gIC8vIGFyZSBiZWluZyBhZGRlZC4gRXZlbiBpZiB0aGVzZSBiaW5kaW5ncyBhbHJlYWR5IGV4aXN0IGluIHRoZSBjb250ZXh0LCB0aGUgZGlyZWN0aXZlXG4gIC8vIG9yIHRlbXBsYXRlIGNvZGUgd2lsbCBzdGlsbCBjYWxsIHRoZW0gdW5rbm93aW5nbHkuIFRoZXJlZm9yZSB0aGUgdG90YWwgdmFsdWVzIG5lZWRcbiAgLy8gdG8gYmUgcmVnaXN0ZXJlZCBzbyB0aGF0IHdlIGtub3cgaG93IG1hbnkgYmluZGluZ3MgYXJlIGFzc2lnbmVkIHRvIGVhY2ggZGlyZWN0aXZlLlxuICBjb25zdCBjdXJyZW50U2luZ2xlUHJvcHNMZW5ndGggPSBzaW5nbGVQcm9wT2Zmc2V0VmFsdWVzLmxlbmd0aDtcbiAgc2luZ2xlUHJvcE9mZnNldFZhbHVlcy5wdXNoKFxuICAgICAgc3R5bGVCaW5kaW5nTmFtZXMgPyBzdHlsZUJpbmRpbmdOYW1lcy5sZW5ndGggOiAwLFxuICAgICAgY2xhc3NCaW5kaW5nTmFtZXMgPyBjbGFzc0JpbmRpbmdOYW1lcy5sZW5ndGggOiAwKTtcblxuICAvLyB0aGUgY29kZSBiZWxvdyB3aWxsIGNoZWNrIHRvIHNlZSBpZiBhIG5ldyBzdHlsZSBiaW5kaW5nIGFscmVhZHkgZXhpc3RzIGluIHRoZSBjb250ZXh0XG4gIC8vIGlmIHNvIHRoZW4gdGhlcmUgaXMgbm8gcG9pbnQgaW4gaW5zZXJ0aW5nIGl0IGludG8gdGhlIGNvbnRleHQgYWdhaW4uIFdoZXRoZXIgb3Igbm90IGl0XG4gIC8vIGV4aXN0cyB0aGUgc3R5bGluZyBvZmZzZXQgY29kZSB3aWxsIG5vdyBrbm93IGV4YWN0bHkgd2hlcmUgaXQgaXNcbiAgbGV0IGluc2VydGlvbk9mZnNldCA9IDA7XG4gIGNvbnN0IGZpbHRlcmVkU3R5bGVCaW5kaW5nTmFtZXM6IHN0cmluZ1tdID0gW107XG4gIGlmIChzdHlsZUJpbmRpbmdOYW1lcyAmJiBzdHlsZUJpbmRpbmdOYW1lcy5sZW5ndGgpIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHN0eWxlQmluZGluZ05hbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBuYW1lID0gc3R5bGVCaW5kaW5nTmFtZXNbaV07XG4gICAgICBsZXQgc2luZ2xlUHJvcEluZGV4ID1cbiAgICAgICAgICBnZXRNYXRjaGluZ0JpbmRpbmdJbmRleChjb250ZXh0LCBuYW1lLCBzaW5nbGVTdHlsZXNTdGFydEluZGV4LCBzaW5nbGVDbGFzc2VzU3RhcnRJbmRleCk7XG4gICAgICBpZiAoc2luZ2xlUHJvcEluZGV4ID09IC0xKSB7XG4gICAgICAgIHNpbmdsZVByb3BJbmRleCA9IHNpbmdsZUNsYXNzZXNTdGFydEluZGV4ICsgaW5zZXJ0aW9uT2Zmc2V0O1xuICAgICAgICBpbnNlcnRpb25PZmZzZXQgKz0gU3R5bGluZ0luZGV4LlNpemU7XG4gICAgICAgIGZpbHRlcmVkU3R5bGVCaW5kaW5nTmFtZXMucHVzaChuYW1lKTtcbiAgICAgIH1cbiAgICAgIHNpbmdsZVByb3BPZmZzZXRWYWx1ZXMucHVzaChzaW5nbGVQcm9wSW5kZXgpO1xuICAgIH1cbiAgfVxuXG4gIC8vIGp1c3QgbGlrZSB3aXRoIHRoZSBzdHlsZSBiaW5kaW5nIGxvb3AgYWJvdmUsIHRoZSBuZXcgY2xhc3MgYmluZGluZ3MgZ2V0IHRoZSBzYW1lIHRyZWF0bWVudC4uLlxuICBjb25zdCBmaWx0ZXJlZENsYXNzQmluZGluZ05hbWVzOiBzdHJpbmdbXSA9IFtdO1xuICBpZiAoY2xhc3NCaW5kaW5nTmFtZXMgJiYgY2xhc3NCaW5kaW5nTmFtZXMubGVuZ3RoKSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjbGFzc0JpbmRpbmdOYW1lcy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgbmFtZSA9IGNsYXNzQmluZGluZ05hbWVzW2ldO1xuICAgICAgbGV0IHNpbmdsZVByb3BJbmRleCA9XG4gICAgICAgICAgZ2V0TWF0Y2hpbmdCaW5kaW5nSW5kZXgoY29udGV4dCwgbmFtZSwgc2luZ2xlQ2xhc3Nlc1N0YXJ0SW5kZXgsIG11bHRpU3R5bGVzU3RhcnRJbmRleCk7XG4gICAgICBpZiAoc2luZ2xlUHJvcEluZGV4ID09IC0xKSB7XG4gICAgICAgIHNpbmdsZVByb3BJbmRleCA9IG11bHRpU3R5bGVzU3RhcnRJbmRleCArIGluc2VydGlvbk9mZnNldDtcbiAgICAgICAgaW5zZXJ0aW9uT2Zmc2V0ICs9IFN0eWxpbmdJbmRleC5TaXplO1xuICAgICAgICBmaWx0ZXJlZENsYXNzQmluZGluZ05hbWVzLnB1c2gobmFtZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzaW5nbGVQcm9wSW5kZXggKz0gZmlsdGVyZWRTdHlsZUJpbmRpbmdOYW1lcy5sZW5ndGggKiBTdHlsaW5nSW5kZXguU2l6ZTtcbiAgICAgIH1cbiAgICAgIHNpbmdsZVByb3BPZmZzZXRWYWx1ZXMucHVzaChzaW5nbGVQcm9wSW5kZXgpO1xuICAgIH1cbiAgfVxuXG4gIC8vIGJlY2F1c2UgbmV3IHN0eWxlcyBhcmUgYmVpbmcgaW5zZXJ0ZWQsIHRoaXMgbWVhbnMgdGhlIGV4aXN0aW5nIGNvbGxlY3Rpb24gb2Ygc3R5bGUgb2Zmc2V0XG4gIC8vIGluZGV4IHZhbHVlcyBhcmUgaW5jb3JyZWN0ICh0aGV5IHBvaW50IHRvIHRoZSB3cm9uZyB2YWx1ZXMpLiBUaGUgY29kZSBiZWxvdyB3aWxsIHJ1biB0aHJvdWdoXG4gIC8vIHRoZSBlbnRpcmUgb2Zmc2V0IGFycmF5IGFuZCB1cGRhdGUgdGhlIGV4aXN0aW5nIHNldCBvZiBpbmRleCB2YWx1ZXMgdG8gcG9pbnQgdG8gdGhlaXIgbmV3XG4gIC8vIGxvY2F0aW9ucyB3aGlsZSB0YWtpbmcgdGhlIG5ldyBiaW5kaW5nIHZhbHVlcyBpbnRvIGNvbnNpZGVyYXRpb24uXG4gIGxldCBpID0gU2luZ2xlUHJvcE9mZnNldFZhbHVlc0luZGV4LlZhbHVlU3RhcnRQb3NpdGlvbjtcbiAgaWYgKGZpbHRlcmVkU3R5bGVCaW5kaW5nTmFtZXMubGVuZ3RoKSB7XG4gICAgd2hpbGUgKGkgPCBjdXJyZW50U2luZ2xlUHJvcHNMZW5ndGgpIHtcbiAgICAgIGNvbnN0IHRvdGFsU3R5bGVzID1cbiAgICAgICAgICBzaW5nbGVQcm9wT2Zmc2V0VmFsdWVzW2kgKyBTaW5nbGVQcm9wT2Zmc2V0VmFsdWVzSW5kZXguU3R5bGVzQ291bnRQb3NpdGlvbl07XG4gICAgICBjb25zdCB0b3RhbENsYXNzZXMgPVxuICAgICAgICAgIHNpbmdsZVByb3BPZmZzZXRWYWx1ZXNbaSArIFNpbmdsZVByb3BPZmZzZXRWYWx1ZXNJbmRleC5DbGFzc2VzQ291bnRQb3NpdGlvbl07XG4gICAgICBpZiAodG90YWxDbGFzc2VzKSB7XG4gICAgICAgIGNvbnN0IHN0YXJ0ID0gaSArIFNpbmdsZVByb3BPZmZzZXRWYWx1ZXNJbmRleC5WYWx1ZVN0YXJ0UG9zaXRpb24gKyB0b3RhbFN0eWxlcztcbiAgICAgICAgZm9yIChsZXQgaiA9IHN0YXJ0OyBqIDwgc3RhcnQgKyB0b3RhbENsYXNzZXM7IGorKykge1xuICAgICAgICAgIHNpbmdsZVByb3BPZmZzZXRWYWx1ZXNbal0gKz0gZmlsdGVyZWRTdHlsZUJpbmRpbmdOYW1lcy5sZW5ndGggKiBTdHlsaW5nSW5kZXguU2l6ZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjb25zdCB0b3RhbCA9IHRvdGFsU3R5bGVzICsgdG90YWxDbGFzc2VzO1xuICAgICAgaSArPSBTaW5nbGVQcm9wT2Zmc2V0VmFsdWVzSW5kZXguVmFsdWVTdGFydFBvc2l0aW9uICsgdG90YWw7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgdG90YWxOZXdFbnRyaWVzID0gZmlsdGVyZWRDbGFzc0JpbmRpbmdOYW1lcy5sZW5ndGggKyBmaWx0ZXJlZFN0eWxlQmluZGluZ05hbWVzLmxlbmd0aDtcblxuICAvLyBpbiB0aGUgZXZlbnQgdGhhdCB0aGVyZSBhcmUgbmV3IHN0eWxlIHZhbHVlcyBiZWluZyBpbnNlcnRlZCwgYWxsIGV4aXN0aW5nIGNsYXNzIGFuZCBzdHlsZVxuICAvLyBiaW5kaW5ncyBuZWVkIHRvIGhhdmUgdGhlaXIgcG9pbnRlciB2YWx1ZXMgb2Zmc2V0dGVkIHdpdGggdGhlIG5ldyBhbW91bnQgb2Ygc3BhY2UgdGhhdCBpc1xuICAvLyB1c2VkIGZvciB0aGUgbmV3IHN0eWxlL2NsYXNzIGJpbmRpbmdzLlxuICBmb3IgKGxldCBpID0gc2luZ2xlU3R5bGVzU3RhcnRJbmRleDsgaSA8IGNvbnRleHQubGVuZ3RoOyBpICs9IFN0eWxpbmdJbmRleC5TaXplKSB7XG4gICAgY29uc3QgaXNNdWx0aUJhc2VkID0gaSA+PSBtdWx0aVN0eWxlc1N0YXJ0SW5kZXg7XG4gICAgY29uc3QgaXNDbGFzc0Jhc2VkID0gaSA+PSAoaXNNdWx0aUJhc2VkID8gbXVsdGlDbGFzc2VzU3RhcnRJbmRleCA6IHNpbmdsZUNsYXNzZXNTdGFydEluZGV4KTtcbiAgICBjb25zdCBmbGFnID0gZ2V0UG9pbnRlcnMoY29udGV4dCwgaSk7XG4gICAgY29uc3Qgc3RhdGljSW5kZXggPSBnZXRJbml0aWFsSW5kZXgoZmxhZyk7XG4gICAgbGV0IHNpbmdsZU9yTXVsdGlJbmRleCA9IGdldE11bHRpT3JTaW5nbGVJbmRleChmbGFnKTtcbiAgICBpZiAoaXNNdWx0aUJhc2VkKSB7XG4gICAgICBzaW5nbGVPck11bHRpSW5kZXggKz1cbiAgICAgICAgICBpc0NsYXNzQmFzZWQgPyAoZmlsdGVyZWRTdHlsZUJpbmRpbmdOYW1lcy5sZW5ndGggKiBTdHlsaW5nSW5kZXguU2l6ZSkgOiAwO1xuICAgIH0gZWxzZSB7XG4gICAgICBzaW5nbGVPck11bHRpSW5kZXggKz0gKHRvdGFsTmV3RW50cmllcyAqIFN0eWxpbmdJbmRleC5TaXplKSArXG4gICAgICAgICAgKChpc0NsYXNzQmFzZWQgPyBmaWx0ZXJlZFN0eWxlQmluZGluZ05hbWVzLmxlbmd0aCA6IDApICogU3R5bGluZ0luZGV4LlNpemUpO1xuICAgIH1cbiAgICBzZXRGbGFnKGNvbnRleHQsIGksIHBvaW50ZXJzKGZsYWcsIHN0YXRpY0luZGV4LCBzaW5nbGVPck11bHRpSW5kZXgpKTtcbiAgfVxuXG4gIC8vIHRoaXMgaXMgd2hlcmUgd2UgbWFrZSBzcGFjZSBpbiB0aGUgY29udGV4dCBmb3IgdGhlIG5ldyBzdHlsZSBiaW5kaW5nc1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGZpbHRlcmVkU3R5bGVCaW5kaW5nTmFtZXMubGVuZ3RoICogU3R5bGluZ0luZGV4LlNpemU7IGkrKykge1xuICAgIGNvbnRleHQuc3BsaWNlKG11bHRpQ2xhc3Nlc1N0YXJ0SW5kZXgsIDAsIG51bGwpO1xuICAgIGNvbnRleHQuc3BsaWNlKHNpbmdsZUNsYXNzZXNTdGFydEluZGV4LCAwLCBudWxsKTtcbiAgICBzaW5nbGVDbGFzc2VzU3RhcnRJbmRleCsrO1xuICAgIG11bHRpU3R5bGVzU3RhcnRJbmRleCsrO1xuICAgIG11bHRpQ2xhc3Nlc1N0YXJ0SW5kZXggKz0gMjsgIC8vIGJvdGggc2luZ2xlICsgbXVsdGkgc2xvdHMgd2VyZSBpbnNlcnRlZFxuICB9XG5cbiAgLy8gdGhpcyBpcyB3aGVyZSB3ZSBtYWtlIHNwYWNlIGluIHRoZSBjb250ZXh0IGZvciB0aGUgbmV3IGNsYXNzIGJpbmRpbmdzXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgZmlsdGVyZWRDbGFzc0JpbmRpbmdOYW1lcy5sZW5ndGggKiBTdHlsaW5nSW5kZXguU2l6ZTsgaSsrKSB7XG4gICAgY29udGV4dC5zcGxpY2UobXVsdGlTdHlsZXNTdGFydEluZGV4LCAwLCBudWxsKTtcbiAgICBjb250ZXh0LnB1c2gobnVsbCk7XG4gICAgbXVsdGlTdHlsZXNTdGFydEluZGV4Kys7XG4gICAgbXVsdGlDbGFzc2VzU3RhcnRJbmRleCsrO1xuICB9XG5cbiAgY29uc3QgaW5pdGlhbENsYXNzZXMgPSBjb250ZXh0W1N0eWxpbmdJbmRleC5Jbml0aWFsQ2xhc3NWYWx1ZXNQb3NpdGlvbl07XG4gIGNvbnN0IGluaXRpYWxTdHlsZXMgPSBjb250ZXh0W1N0eWxpbmdJbmRleC5Jbml0aWFsU3R5bGVWYWx1ZXNQb3NpdGlvbl07XG5cbiAgLy8gdGhlIGNvZGUgYmVsb3cgd2lsbCBpbnNlcnQgZWFjaCBuZXcgZW50cnkgaW50byB0aGUgY29udGV4dCBhbmQgYXNzaWduIHRoZSBhcHByb3ByaWF0ZVxuICAvLyBmbGFncyBhbmQgaW5kZXggdmFsdWVzIHRvIHRoZW0uIEl0J3MgaW1wb3J0YW50IHRoaXMgcnVucyBhdCB0aGUgZW5kIG9mIHRoaXMgZnVuY3Rpb25cbiAgLy8gYmVjYXVzZSB0aGUgY29udGV4dCwgcHJvcGVydHkgb2Zmc2V0IGFuZCBpbmRleCB2YWx1ZXMgaGF2ZSBhbGwgYmVlbiBjb21wdXRlZCBqdXN0IGJlZm9yZS5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCB0b3RhbE5ld0VudHJpZXM7IGkrKykge1xuICAgIGNvbnN0IGVudHJ5SXNDbGFzc0Jhc2VkID0gaSA+PSBmaWx0ZXJlZFN0eWxlQmluZGluZ05hbWVzLmxlbmd0aDtcbiAgICBjb25zdCBhZGp1c3RlZEluZGV4ID0gZW50cnlJc0NsYXNzQmFzZWQgPyAoaSAtIGZpbHRlcmVkU3R5bGVCaW5kaW5nTmFtZXMubGVuZ3RoKSA6IGk7XG4gICAgY29uc3QgcHJvcE5hbWUgPSBlbnRyeUlzQ2xhc3NCYXNlZCA/IGZpbHRlcmVkQ2xhc3NCaW5kaW5nTmFtZXNbYWRqdXN0ZWRJbmRleF0gOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWx0ZXJlZFN0eWxlQmluZGluZ05hbWVzW2FkanVzdGVkSW5kZXhdO1xuXG4gICAgbGV0IG11bHRpSW5kZXgsIHNpbmdsZUluZGV4O1xuICAgIGlmIChlbnRyeUlzQ2xhc3NCYXNlZCkge1xuICAgICAgbXVsdGlJbmRleCA9IG11bHRpQ2xhc3Nlc1N0YXJ0SW5kZXggK1xuICAgICAgICAgICgodG90YWxDdXJyZW50Q2xhc3NCaW5kaW5ncyArIGFkanVzdGVkSW5kZXgpICogU3R5bGluZ0luZGV4LlNpemUpO1xuICAgICAgc2luZ2xlSW5kZXggPSBzaW5nbGVDbGFzc2VzU3RhcnRJbmRleCArXG4gICAgICAgICAgKCh0b3RhbEN1cnJlbnRDbGFzc0JpbmRpbmdzICsgYWRqdXN0ZWRJbmRleCkgKiBTdHlsaW5nSW5kZXguU2l6ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG11bHRpSW5kZXggPVxuICAgICAgICAgIG11bHRpU3R5bGVzU3RhcnRJbmRleCArICgodG90YWxDdXJyZW50U3R5bGVCaW5kaW5ncyArIGFkanVzdGVkSW5kZXgpICogU3R5bGluZ0luZGV4LlNpemUpO1xuICAgICAgc2luZ2xlSW5kZXggPSBzaW5nbGVTdHlsZXNTdGFydEluZGV4ICtcbiAgICAgICAgICAoKHRvdGFsQ3VycmVudFN0eWxlQmluZGluZ3MgKyBhZGp1c3RlZEluZGV4KSAqIFN0eWxpbmdJbmRleC5TaXplKTtcbiAgICB9XG5cbiAgICAvLyBpZiBhIHByb3BlcnR5IGlzIG5vdCBmb3VuZCBpbiB0aGUgaW5pdGlhbCBzdHlsZSB2YWx1ZXMgbGlzdCB0aGVuIGl0XG4gICAgLy8gaXMgQUxXQVlTIGFkZGVkIGluY2FzZSBhIGZvbGxvdy11cCBkaXJlY3RpdmUgaW50cm9kdWNlcyB0aGUgc2FtZSBpbml0aWFsXG4gICAgLy8gc3R5bGUvY2xhc3MgdmFsdWUgbGF0ZXIgb24uXG4gICAgbGV0IGluaXRpYWxWYWx1ZXNUb0xvb2t1cCA9IGVudHJ5SXNDbGFzc0Jhc2VkID8gaW5pdGlhbENsYXNzZXMgOiBpbml0aWFsU3R5bGVzO1xuICAgIGxldCBpbmRleEZvckluaXRpYWwgPSBnZXRJbml0aWFsU3R5bGluZ1ZhbHVlc0luZGV4T2YoaW5pdGlhbFZhbHVlc1RvTG9va3VwLCBwcm9wTmFtZSk7XG4gICAgaWYgKGluZGV4Rm9ySW5pdGlhbCA9PT0gLTEpIHtcbiAgICAgIGluZGV4Rm9ySW5pdGlhbCA9IGluaXRpYWxWYWx1ZXNUb0xvb2t1cC5sZW5ndGggKyBJbml0aWFsU3R5bGluZ1ZhbHVlc0luZGV4LlZhbHVlT2Zmc2V0O1xuICAgICAgaW5pdGlhbFZhbHVlc1RvTG9va3VwLnB1c2gocHJvcE5hbWUsIGVudHJ5SXNDbGFzc0Jhc2VkID8gZmFsc2UgOiBudWxsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaW5kZXhGb3JJbml0aWFsICs9IEluaXRpYWxTdHlsaW5nVmFsdWVzSW5kZXguVmFsdWVPZmZzZXQ7XG4gICAgfVxuXG4gICAgY29uc3QgaW5pdGlhbEZsYWcgPVxuICAgICAgICBwcmVwYXJlSW5pdGlhbEZsYWcoY29udGV4dCwgcHJvcE5hbWUsIGVudHJ5SXNDbGFzc0Jhc2VkLCBzdHlsZVNhbml0aXplciB8fCBudWxsKTtcblxuICAgIHNldEZsYWcoY29udGV4dCwgc2luZ2xlSW5kZXgsIHBvaW50ZXJzKGluaXRpYWxGbGFnLCBpbmRleEZvckluaXRpYWwsIG11bHRpSW5kZXgpKTtcbiAgICBzZXRQcm9wKGNvbnRleHQsIHNpbmdsZUluZGV4LCBwcm9wTmFtZSk7XG4gICAgc2V0VmFsdWUoY29udGV4dCwgc2luZ2xlSW5kZXgsIG51bGwpO1xuICAgIHNldFBsYXllckJ1aWxkZXJJbmRleChjb250ZXh0LCBzaW5nbGVJbmRleCwgMCwgZGlyZWN0aXZlSW5kZXgpO1xuXG4gICAgc2V0RmxhZyhjb250ZXh0LCBtdWx0aUluZGV4LCBwb2ludGVycyhpbml0aWFsRmxhZywgaW5kZXhGb3JJbml0aWFsLCBzaW5nbGVJbmRleCkpO1xuICAgIHNldFByb3AoY29udGV4dCwgbXVsdGlJbmRleCwgcHJvcE5hbWUpO1xuICAgIHNldFZhbHVlKGNvbnRleHQsIG11bHRpSW5kZXgsIG51bGwpO1xuICAgIHNldFBsYXllckJ1aWxkZXJJbmRleChjb250ZXh0LCBtdWx0aUluZGV4LCAwLCBkaXJlY3RpdmVJbmRleCk7XG4gIH1cblxuICAvLyB0aGUgdG90YWwgY2xhc3Nlcy9zdHlsZSB2YWx1ZXMgYXJlIHVwZGF0ZWQgc28gdGhlIG5leHQgdGltZSB0aGUgY29udGV4dCBpcyBwYXRjaGVkXG4gIC8vIGFkZGl0aW9uYWwgc3R5bGUvY2xhc3MgYmluZGluZ3MgZnJvbSBhbm90aGVyIGRpcmVjdGl2ZSB0aGVuIGl0IGtub3dzIGV4YWN0bHkgd2hlcmVcbiAgLy8gdG8gaW5zZXJ0IHRoZW0gaW4gdGhlIGNvbnRleHRcbiAgc2luZ2xlUHJvcE9mZnNldFZhbHVlc1tTaW5nbGVQcm9wT2Zmc2V0VmFsdWVzSW5kZXguQ2xhc3Nlc0NvdW50UG9zaXRpb25dID1cbiAgICAgIHRvdGFsQ3VycmVudENsYXNzQmluZGluZ3MgKyBmaWx0ZXJlZENsYXNzQmluZGluZ05hbWVzLmxlbmd0aDtcbiAgc2luZ2xlUHJvcE9mZnNldFZhbHVlc1tTaW5nbGVQcm9wT2Zmc2V0VmFsdWVzSW5kZXguU3R5bGVzQ291bnRQb3NpdGlvbl0gPVxuICAgICAgdG90YWxDdXJyZW50U3R5bGVCaW5kaW5ncyArIGZpbHRlcmVkU3R5bGVCaW5kaW5nTmFtZXMubGVuZ3RoO1xuXG4gIC8vIHRoZXJlIGlzIG5vIGluaXRpYWwgdmFsdWUgZmxhZyBmb3IgdGhlIG1hc3RlciBpbmRleCBzaW5jZSBpdCBkb2Vzbid0XG4gIC8vIHJlZmVyZW5jZSBhbiBpbml0aWFsIHN0eWxlIHZhbHVlXG4gIGNvbnN0IG1hc3RlckZsYWcgPSBwb2ludGVycygwLCAwLCBtdWx0aVN0eWxlc1N0YXJ0SW5kZXgpIHxcbiAgICAgIChvbmx5UHJvY2Vzc1NpbmdsZUNsYXNzZXMgPyBTdHlsaW5nRmxhZ3MuT25seVByb2Nlc3NTaW5nbGVDbGFzc2VzIDogMCk7XG4gIHNldEZsYWcoY29udGV4dCwgU3R5bGluZ0luZGV4Lk1hc3RlckZsYWdQb3NpdGlvbiwgbWFzdGVyRmxhZyk7XG59XG5cbi8qKlxuICogU2VhcmNoZXMgdGhyb3VnaCB0aGUgZXhpc3RpbmcgcmVnaXN0cnkgb2YgZGlyZWN0aXZlc1xuICovXG5mdW5jdGlvbiBmaW5kT3JQYXRjaERpcmVjdGl2ZUludG9SZWdpc3RyeShcbiAgICBjb250ZXh0OiBTdHlsaW5nQ29udGV4dCwgZGlyZWN0aXZlUmVmOiBhbnksIHN0eWxlU2FuaXRpemVyPzogU3R5bGVTYW5pdGl6ZUZuIHwgbnVsbCkge1xuICBjb25zdCBkaXJlY3RpdmVSZWZzID0gY29udGV4dFtTdHlsaW5nSW5kZXguRGlyZWN0aXZlUmVnaXN0cnlQb3NpdGlvbl07XG4gIGNvbnN0IG5leHRPZmZzZXRJbnNlcnRpb25JbmRleCA9IGNvbnRleHRbU3R5bGluZ0luZGV4LlNpbmdsZVByb3BPZmZzZXRQb3NpdGlvbnNdLmxlbmd0aDtcblxuICBsZXQgZGlyZWN0aXZlSW5kZXg6IG51bWJlcjtcbiAgY29uc3QgZGV0ZWN0ZWRJbmRleCA9IGdldERpcmVjdGl2ZVJlZ2lzdHJ5VmFsdWVzSW5kZXhPZihkaXJlY3RpdmVSZWZzLCBkaXJlY3RpdmVSZWYpO1xuXG4gIGlmIChkZXRlY3RlZEluZGV4ID09PSAtMSkge1xuICAgIGRpcmVjdGl2ZUluZGV4ID0gZGlyZWN0aXZlUmVmcy5sZW5ndGggLyBEaXJlY3RpdmVSZWdpc3RyeVZhbHVlc0luZGV4LlNpemU7XG4gICAgZGlyZWN0aXZlUmVmcy5wdXNoKGRpcmVjdGl2ZVJlZiwgbmV4dE9mZnNldEluc2VydGlvbkluZGV4LCBmYWxzZSwgc3R5bGVTYW5pdGl6ZXIgfHwgbnVsbCk7XG4gIH0gZWxzZSB7XG4gICAgY29uc3Qgc2luZ2xlUHJvcFN0YXJ0UG9zaXRpb24gPVxuICAgICAgICBkZXRlY3RlZEluZGV4ICsgRGlyZWN0aXZlUmVnaXN0cnlWYWx1ZXNJbmRleC5TaW5nbGVQcm9wVmFsdWVzSW5kZXhPZmZzZXQ7XG4gICAgaWYgKGRpcmVjdGl2ZVJlZnNbc2luZ2xlUHJvcFN0YXJ0UG9zaXRpb25dICEgPj0gMCkge1xuICAgICAgLy8gdGhlIGRpcmVjdGl2ZSBoYXMgYWxyZWFkeSBiZWVuIHBhdGNoZWQgaW50byB0aGUgY29udGV4dFxuICAgICAgcmV0dXJuIC0xO1xuICAgIH1cblxuICAgIGRpcmVjdGl2ZUluZGV4ID0gZGV0ZWN0ZWRJbmRleCAvIERpcmVjdGl2ZVJlZ2lzdHJ5VmFsdWVzSW5kZXguU2l6ZTtcblxuICAgIC8vIGJlY2F1c2UgdGhlIGRpcmVjdGl2ZSBhbHJlYWR5IGV4aXN0ZWQgdGhpcyBtZWFucyB0aGF0IGl0IHdhcyBzZXQgZHVyaW5nIGVsZW1lbnRIb3N0QXR0cnMgb3JcbiAgICAvLyBlbGVtZW50U3RhcnQgd2hpY2ggbWVhbnMgdGhhdCB0aGUgYmluZGluZyB2YWx1ZXMgd2VyZSBub3QgaGVyZS4gVGhlcmVmb3JlLCB0aGUgdmFsdWVzIGJlbG93XG4gICAgLy8gbmVlZCB0byBiZSBhcHBsaWVkIHNvIHRoYXQgc2luZ2xlIGNsYXNzIGFuZCBzdHlsZSBwcm9wZXJ0aWVzIGNhbiBiZSBhc3NpZ25lZCBsYXRlci5cbiAgICBjb25zdCBzaW5nbGVQcm9wUG9zaXRpb25JbmRleCA9XG4gICAgICAgIGRldGVjdGVkSW5kZXggKyBEaXJlY3RpdmVSZWdpc3RyeVZhbHVlc0luZGV4LlNpbmdsZVByb3BWYWx1ZXNJbmRleE9mZnNldDtcbiAgICBkaXJlY3RpdmVSZWZzW3NpbmdsZVByb3BQb3NpdGlvbkluZGV4XSA9IG5leHRPZmZzZXRJbnNlcnRpb25JbmRleDtcblxuICAgIC8vIHRoZSBzYW5pdGl6ZXIgaXMgYWxzbyBhcGFydCBvZiB0aGUgYmluZGluZyBwcm9jZXNzIGFuZCB3aWxsIGJlIHVzZWQgd2hlbiBiaW5kaW5ncyBhcmVcbiAgICAvLyBhcHBsaWVkLlxuICAgIGNvbnN0IHN0eWxlU2FuaXRpemVySW5kZXggPSBkZXRlY3RlZEluZGV4ICsgRGlyZWN0aXZlUmVnaXN0cnlWYWx1ZXNJbmRleC5TdHlsZVNhbml0aXplck9mZnNldDtcbiAgICBkaXJlY3RpdmVSZWZzW3N0eWxlU2FuaXRpemVySW5kZXhdID0gc3R5bGVTYW5pdGl6ZXIgfHwgbnVsbDtcbiAgfVxuXG4gIHJldHVybiBkaXJlY3RpdmVJbmRleDtcbn1cblxuZnVuY3Rpb24gZ2V0TWF0Y2hpbmdCaW5kaW5nSW5kZXgoXG4gICAgY29udGV4dDogU3R5bGluZ0NvbnRleHQsIGJpbmRpbmdOYW1lOiBzdHJpbmcsIHN0YXJ0OiBudW1iZXIsIGVuZDogbnVtYmVyKSB7XG4gIGZvciAobGV0IGogPSBzdGFydDsgaiA8IGVuZDsgaiArPSBTdHlsaW5nSW5kZXguU2l6ZSkge1xuICAgIGlmIChnZXRQcm9wKGNvbnRleHQsIGopID09PSBiaW5kaW5nTmFtZSkgcmV0dXJuIGo7XG4gIH1cbiAgcmV0dXJuIC0xO1xufVxuXG4vKipcbiAqIFNldHMgYW5kIHJlc29sdmVzIGFsbCBgbXVsdGlgIHN0eWxpbmcgb24gYW4gYFN0eWxpbmdDb250ZXh0YCBzbyB0aGF0IHRoZXkgY2FuIGJlXG4gKiBhcHBsaWVkIHRvIHRoZSBlbGVtZW50IG9uY2UgYHJlbmRlclN0eWxpbmdgIGlzIGNhbGxlZC5cbiAqXG4gKiBBbGwgbWlzc2luZyBzdHlsZXMvY2xhc3MgKGFueSB2YWx1ZXMgdGhhdCBhcmUgbm90IHByb3ZpZGVkIGluIHRoZSBuZXcgYHN0eWxlc2BcbiAqIG9yIGBjbGFzc2VzYCBwYXJhbXMpIHdpbGwgcmVzb2x2ZSB0byBgbnVsbGAgd2l0aGluIHRoZWlyIHJlc3BlY3RpdmUgcG9zaXRpb25zXG4gKiBpbiB0aGUgY29udGV4dC5cbiAqXG4gKiBAcGFyYW0gY29udGV4dCBUaGUgc3R5bGluZyBjb250ZXh0IHRoYXQgd2lsbCBiZSB1cGRhdGVkIHdpdGggdGhlXG4gKiAgICBuZXdseSBwcm92aWRlZCBzdHlsZSB2YWx1ZXMuXG4gKiBAcGFyYW0gY2xhc3Nlc0lucHV0IFRoZSBrZXkvdmFsdWUgbWFwIG9mIENTUyBjbGFzcyBuYW1lcyB0aGF0IHdpbGwgYmUgdXNlZCBmb3IgdGhlIHVwZGF0ZS5cbiAqIEBwYXJhbSBzdHlsZXNJbnB1dCBUaGUga2V5L3ZhbHVlIG1hcCBvZiBDU1Mgc3R5bGVzIHRoYXQgd2lsbCBiZSB1c2VkIGZvciB0aGUgdXBkYXRlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gdXBkYXRlU3R5bGluZ01hcChcbiAgICBjb250ZXh0OiBTdHlsaW5nQ29udGV4dCwgY2xhc3Nlc0lucHV0OiB7W2tleTogc3RyaW5nXTogYW55fSB8IHN0cmluZyB8XG4gICAgICAgIEJvdW5kUGxheWVyRmFjdG9yeTxudWxsfHN0cmluZ3x7W2tleTogc3RyaW5nXTogYW55fT58IE5PX0NIQU5HRSB8IG51bGwsXG4gICAgc3R5bGVzSW5wdXQ/OiB7W2tleTogc3RyaW5nXTogYW55fSB8IEJvdW5kUGxheWVyRmFjdG9yeTxudWxsfHtba2V5OiBzdHJpbmddOiBhbnl9PnwgTk9fQ0hBTkdFIHxcbiAgICAgICAgbnVsbCxcbiAgICBkaXJlY3RpdmVSZWY/OiBhbnkpOiB2b2lkIHtcbiAgc3R5bGVzSW5wdXQgPSBzdHlsZXNJbnB1dCB8fCBudWxsO1xuXG4gIGNvbnN0IGRpcmVjdGl2ZUluZGV4ID0gZ2V0RGlyZWN0aXZlSW5kZXhGcm9tUmVnaXN0cnkoY29udGV4dCwgZGlyZWN0aXZlUmVmIHx8IG51bGwpO1xuICBjb25zdCBlbGVtZW50ID0gY29udGV4dFtTdHlsaW5nSW5kZXguRWxlbWVudFBvc2l0aW9uXSAhYXMgSFRNTEVsZW1lbnQ7XG4gIGNvbnN0IGNsYXNzZXNQbGF5ZXJCdWlsZGVyID0gY2xhc3Nlc0lucHV0IGluc3RhbmNlb2YgQm91bmRQbGF5ZXJGYWN0b3J5ID9cbiAgICAgIG5ldyBDbGFzc0FuZFN0eWxlUGxheWVyQnVpbGRlcihjbGFzc2VzSW5wdXQgYXMgYW55LCBlbGVtZW50LCBCaW5kaW5nVHlwZS5DbGFzcykgOlxuICAgICAgbnVsbDtcbiAgY29uc3Qgc3R5bGVzUGxheWVyQnVpbGRlciA9IHN0eWxlc0lucHV0IGluc3RhbmNlb2YgQm91bmRQbGF5ZXJGYWN0b3J5ID9cbiAgICAgIG5ldyBDbGFzc0FuZFN0eWxlUGxheWVyQnVpbGRlcihzdHlsZXNJbnB1dCBhcyBhbnksIGVsZW1lbnQsIEJpbmRpbmdUeXBlLlN0eWxlKSA6XG4gICAgICBudWxsO1xuXG4gIGNvbnN0IGNsYXNzZXNWYWx1ZSA9IGNsYXNzZXNQbGF5ZXJCdWlsZGVyID9cbiAgICAgIChjbGFzc2VzSW5wdXQgYXMgQm91bmRQbGF5ZXJGYWN0b3J5PHtba2V5OiBzdHJpbmddOiBhbnl9fHN0cmluZz4pICEudmFsdWUgOlxuICAgICAgY2xhc3Nlc0lucHV0O1xuICBjb25zdCBzdHlsZXNWYWx1ZSA9IHN0eWxlc1BsYXllckJ1aWxkZXIgPyBzdHlsZXNJbnB1dCAhLnZhbHVlIDogc3R5bGVzSW5wdXQ7XG4gIC8vIGVhcmx5IGV4aXQgKHRoaXMgaXMgd2hhdCdzIGRvbmUgdG8gYXZvaWQgdXNpbmcgY3R4LmJpbmQoKSB0byBjYWNoZSB0aGUgdmFsdWUpXG4gIGNvbnN0IGlnbm9yZUFsbENsYXNzVXBkYXRlcyA9IGxpbWl0VG9TaW5nbGVDbGFzc2VzKGNvbnRleHQpIHx8IGNsYXNzZXNWYWx1ZSA9PT0gTk9fQ0hBTkdFIHx8XG4gICAgICBjbGFzc2VzVmFsdWUgPT09IGNvbnRleHRbU3R5bGluZ0luZGV4LkNhY2hlZENsYXNzVmFsdWVPckluaXRpYWxDbGFzc1N0cmluZ107XG4gIGNvbnN0IGlnbm9yZUFsbFN0eWxlVXBkYXRlcyA9XG4gICAgICBzdHlsZXNWYWx1ZSA9PT0gTk9fQ0hBTkdFIHx8IHN0eWxlc1ZhbHVlID09PSBjb250ZXh0W1N0eWxpbmdJbmRleC5DYWNoZWRTdHlsZVZhbHVlXTtcbiAgaWYgKGlnbm9yZUFsbENsYXNzVXBkYXRlcyAmJiBpZ25vcmVBbGxTdHlsZVVwZGF0ZXMpIHJldHVybjtcblxuICBjb250ZXh0W1N0eWxpbmdJbmRleC5DYWNoZWRDbGFzc1ZhbHVlT3JJbml0aWFsQ2xhc3NTdHJpbmddID0gY2xhc3Nlc1ZhbHVlO1xuICBjb250ZXh0W1N0eWxpbmdJbmRleC5DYWNoZWRTdHlsZVZhbHVlXSA9IHN0eWxlc1ZhbHVlO1xuXG4gIGxldCBjbGFzc05hbWVzOiBzdHJpbmdbXSA9IEVNUFRZX0FSUkFZO1xuICBsZXQgYXBwbHlBbGxDbGFzc2VzID0gZmFsc2U7XG4gIGxldCBwbGF5ZXJCdWlsZGVyc0FyZURpcnR5ID0gZmFsc2U7XG5cbiAgY29uc3QgY2xhc3Nlc1BsYXllckJ1aWxkZXJJbmRleCA9XG4gICAgICBjbGFzc2VzUGxheWVyQnVpbGRlciA/IFBsYXllckluZGV4LkNsYXNzTWFwUGxheWVyQnVpbGRlclBvc2l0aW9uIDogMDtcbiAgaWYgKGhhc1BsYXllckJ1aWxkZXJDaGFuZ2VkKFxuICAgICAgICAgIGNvbnRleHQsIGNsYXNzZXNQbGF5ZXJCdWlsZGVyLCBQbGF5ZXJJbmRleC5DbGFzc01hcFBsYXllckJ1aWxkZXJQb3NpdGlvbikpIHtcbiAgICBzZXRQbGF5ZXJCdWlsZGVyKGNvbnRleHQsIGNsYXNzZXNQbGF5ZXJCdWlsZGVyLCBQbGF5ZXJJbmRleC5DbGFzc01hcFBsYXllckJ1aWxkZXJQb3NpdGlvbik7XG4gICAgcGxheWVyQnVpbGRlcnNBcmVEaXJ0eSA9IHRydWU7XG4gIH1cblxuICBjb25zdCBzdHlsZXNQbGF5ZXJCdWlsZGVySW5kZXggPVxuICAgICAgc3R5bGVzUGxheWVyQnVpbGRlciA/IFBsYXllckluZGV4LlN0eWxlTWFwUGxheWVyQnVpbGRlclBvc2l0aW9uIDogMDtcbiAgaWYgKGhhc1BsYXllckJ1aWxkZXJDaGFuZ2VkKFxuICAgICAgICAgIGNvbnRleHQsIHN0eWxlc1BsYXllckJ1aWxkZXIsIFBsYXllckluZGV4LlN0eWxlTWFwUGxheWVyQnVpbGRlclBvc2l0aW9uKSkge1xuICAgIHNldFBsYXllckJ1aWxkZXIoY29udGV4dCwgc3R5bGVzUGxheWVyQnVpbGRlciwgUGxheWVySW5kZXguU3R5bGVNYXBQbGF5ZXJCdWlsZGVyUG9zaXRpb24pO1xuICAgIHBsYXllckJ1aWxkZXJzQXJlRGlydHkgPSB0cnVlO1xuICB9XG5cbiAgLy8gZWFjaCB0aW1lIGEgc3RyaW5nLWJhc2VkIHZhbHVlIHBvcHMgdXAgdGhlbiBpdCBzaG91bGRuJ3QgcmVxdWlyZSBhIGRlZXBcbiAgLy8gY2hlY2sgb2Ygd2hhdCdzIGNoYW5nZWQuXG4gIGlmICghaWdub3JlQWxsQ2xhc3NVcGRhdGVzKSB7XG4gICAgaWYgKHR5cGVvZiBjbGFzc2VzVmFsdWUgPT0gJ3N0cmluZycpIHtcbiAgICAgIGNsYXNzTmFtZXMgPSBjbGFzc2VzVmFsdWUuc3BsaXQoL1xccysvKTtcbiAgICAgIC8vIHRoaXMgYm9vbGVhbiBpcyB1c2VkIHRvIGF2b2lkIGhhdmluZyB0byBjcmVhdGUgYSBrZXkvdmFsdWUgbWFwIG9mIGB0cnVlYCB2YWx1ZXNcbiAgICAgIC8vIHNpbmNlIGEgY2xhc3NuYW1lIHN0cmluZyBpbXBsaWVzIHRoYXQgYWxsIHRob3NlIGNsYXNzZXMgYXJlIGFkZGVkXG4gICAgICBhcHBseUFsbENsYXNzZXMgPSB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICBjbGFzc05hbWVzID0gY2xhc3Nlc1ZhbHVlID8gT2JqZWN0LmtleXMoY2xhc3Nlc1ZhbHVlKSA6IEVNUFRZX0FSUkFZO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IGNsYXNzZXMgPSAoY2xhc3Nlc1ZhbHVlIHx8IEVNUFRZX09CSikgYXN7W2tleTogc3RyaW5nXTogYW55fTtcbiAgY29uc3Qgc3R5bGVQcm9wcyA9IHN0eWxlc1ZhbHVlID8gT2JqZWN0LmtleXMoc3R5bGVzVmFsdWUpIDogRU1QVFlfQVJSQVk7XG4gIGNvbnN0IHN0eWxlcyA9IHN0eWxlc1ZhbHVlIHx8IEVNUFRZX09CSjtcblxuICBjb25zdCBjbGFzc2VzU3RhcnRJbmRleCA9IHN0eWxlUHJvcHMubGVuZ3RoO1xuICBsZXQgbXVsdGlTdGFydEluZGV4ID0gZ2V0TXVsdGlTdGFydEluZGV4KGNvbnRleHQpO1xuXG4gIGxldCBkaXJ0eSA9IGZhbHNlO1xuICBsZXQgY3R4SW5kZXggPSBtdWx0aVN0YXJ0SW5kZXg7XG5cbiAgbGV0IHByb3BJbmRleCA9IDA7XG4gIGNvbnN0IHByb3BMaW1pdCA9IHN0eWxlUHJvcHMubGVuZ3RoICsgY2xhc3NOYW1lcy5sZW5ndGg7XG5cbiAgLy8gdGhlIG1haW4gbG9vcCBoZXJlIHdpbGwgdHJ5IGFuZCBmaWd1cmUgb3V0IGhvdyB0aGUgc2hhcGUgb2YgdGhlIHByb3ZpZGVkXG4gIC8vIHN0eWxlcyBkaWZmZXIgd2l0aCByZXNwZWN0IHRvIHRoZSBjb250ZXh0LiBMYXRlciBpZiB0aGUgY29udGV4dC9zdHlsZXMvY2xhc3Nlc1xuICAvLyBhcmUgb2ZmLWJhbGFuY2UgdGhlbiB0aGV5IHdpbGwgYmUgZGVhbHQgaW4gYW5vdGhlciBsb29wIGFmdGVyIHRoaXMgb25lXG4gIHdoaWxlIChjdHhJbmRleCA8IGNvbnRleHQubGVuZ3RoICYmIHByb3BJbmRleCA8IHByb3BMaW1pdCkge1xuICAgIGNvbnN0IGlzQ2xhc3NCYXNlZCA9IHByb3BJbmRleCA+PSBjbGFzc2VzU3RhcnRJbmRleDtcbiAgICBjb25zdCBwcm9jZXNzVmFsdWUgPVxuICAgICAgICAoIWlzQ2xhc3NCYXNlZCAmJiAhaWdub3JlQWxsU3R5bGVVcGRhdGVzKSB8fCAoaXNDbGFzc0Jhc2VkICYmICFpZ25vcmVBbGxDbGFzc1VwZGF0ZXMpO1xuXG4gICAgLy8gd2hlbiB0aGVyZSBpcyBhIGNhY2hlLWhpdCBmb3IgYSBzdHJpbmctYmFzZWQgY2xhc3MgdGhlbiB3ZSBzaG91bGRcbiAgICAvLyBhdm9pZCBkb2luZyBhbnkgd29yayBkaWZmaW5nIGFueSBvZiB0aGUgY2hhbmdlc1xuICAgIGlmIChwcm9jZXNzVmFsdWUpIHtcbiAgICAgIGNvbnN0IGFkanVzdGVkUHJvcEluZGV4ID0gaXNDbGFzc0Jhc2VkID8gcHJvcEluZGV4IC0gY2xhc3Nlc1N0YXJ0SW5kZXggOiBwcm9wSW5kZXg7XG4gICAgICBjb25zdCBuZXdQcm9wOiBzdHJpbmcgPVxuICAgICAgICAgIGlzQ2xhc3NCYXNlZCA/IGNsYXNzTmFtZXNbYWRqdXN0ZWRQcm9wSW5kZXhdIDogc3R5bGVQcm9wc1thZGp1c3RlZFByb3BJbmRleF07XG4gICAgICBjb25zdCBuZXdWYWx1ZTogc3RyaW5nfGJvb2xlYW4gPVxuICAgICAgICAgIGlzQ2xhc3NCYXNlZCA/IChhcHBseUFsbENsYXNzZXMgPyB0cnVlIDogY2xhc3Nlc1tuZXdQcm9wXSkgOiBzdHlsZXNbbmV3UHJvcF07XG4gICAgICBjb25zdCBwbGF5ZXJCdWlsZGVySW5kZXggPVxuICAgICAgICAgIGlzQ2xhc3NCYXNlZCA/IGNsYXNzZXNQbGF5ZXJCdWlsZGVySW5kZXggOiBzdHlsZXNQbGF5ZXJCdWlsZGVySW5kZXg7XG5cbiAgICAgIGNvbnN0IHByb3AgPSBnZXRQcm9wKGNvbnRleHQsIGN0eEluZGV4KTtcbiAgICAgIGlmIChwcm9wID09PSBuZXdQcm9wKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gZ2V0VmFsdWUoY29udGV4dCwgY3R4SW5kZXgpO1xuICAgICAgICBjb25zdCBmbGFnID0gZ2V0UG9pbnRlcnMoY29udGV4dCwgY3R4SW5kZXgpO1xuICAgICAgICBzZXRQbGF5ZXJCdWlsZGVySW5kZXgoY29udGV4dCwgY3R4SW5kZXgsIHBsYXllckJ1aWxkZXJJbmRleCwgZGlyZWN0aXZlSW5kZXgpO1xuXG4gICAgICAgIGlmIChoYXNWYWx1ZUNoYW5nZWQoZmxhZywgdmFsdWUsIG5ld1ZhbHVlKSkge1xuICAgICAgICAgIHNldFZhbHVlKGNvbnRleHQsIGN0eEluZGV4LCBuZXdWYWx1ZSk7XG4gICAgICAgICAgcGxheWVyQnVpbGRlcnNBcmVEaXJ0eSA9IHBsYXllckJ1aWxkZXJzQXJlRGlydHkgfHwgISFwbGF5ZXJCdWlsZGVySW5kZXg7XG5cbiAgICAgICAgICBjb25zdCBpbml0aWFsVmFsdWUgPSBnZXRJbml0aWFsVmFsdWUoY29udGV4dCwgZmxhZyk7XG5cbiAgICAgICAgICAvLyBTS0lQIElGIElOSVRJQUwgQ0hFQ0tcbiAgICAgICAgICAvLyBJZiB0aGUgZm9ybWVyIGB2YWx1ZWAgaXMgYG51bGxgIHRoZW4gaXQgbWVhbnMgdGhhdCBhbiBpbml0aWFsIHZhbHVlXG4gICAgICAgICAgLy8gY291bGQgYmUgYmVpbmcgcmVuZGVyZWQgb24gc2NyZWVuLiBJZiB0aGF0IGlzIHRoZSBjYXNlIHRoZW4gdGhlcmUgaXNcbiAgICAgICAgICAvLyBubyBwb2ludCBpbiB1cGRhdGluZyB0aGUgdmFsdWUgaW5jYXNlIGl0IG1hdGNoZXMuIEluIG90aGVyIHdvcmRzIGlmIHRoZVxuICAgICAgICAgIC8vIG5ldyB2YWx1ZSBpcyB0aGUgZXhhY3Qgc2FtZSBhcyB0aGUgcHJldmlvdXNseSByZW5kZXJlZCB2YWx1ZSAod2hpY2hcbiAgICAgICAgICAvLyBoYXBwZW5zIHRvIGJlIHRoZSBpbml0aWFsIHZhbHVlKSB0aGVuIGRvIG5vdGhpbmcuXG4gICAgICAgICAgaWYgKHZhbHVlICE9IG51bGwgfHwgaGFzVmFsdWVDaGFuZ2VkKGZsYWcsIGluaXRpYWxWYWx1ZSwgbmV3VmFsdWUpKSB7XG4gICAgICAgICAgICBzZXREaXJ0eShjb250ZXh0LCBjdHhJbmRleCwgdHJ1ZSk7XG4gICAgICAgICAgICBkaXJ0eSA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBpbmRleE9mRW50cnkgPSBmaW5kRW50cnlQb3NpdGlvbkJ5UHJvcChjb250ZXh0LCBuZXdQcm9wLCBjdHhJbmRleCk7XG4gICAgICAgIGlmIChpbmRleE9mRW50cnkgPiAwKSB7XG4gICAgICAgICAgLy8gaXQgd2FzIGZvdW5kIGF0IGEgbGF0ZXIgcG9pbnQgLi4uIGp1c3Qgc3dhcCB0aGUgdmFsdWVzXG4gICAgICAgICAgY29uc3QgdmFsdWVUb0NvbXBhcmUgPSBnZXRWYWx1ZShjb250ZXh0LCBpbmRleE9mRW50cnkpO1xuICAgICAgICAgIGNvbnN0IGZsYWdUb0NvbXBhcmUgPSBnZXRQb2ludGVycyhjb250ZXh0LCBpbmRleE9mRW50cnkpO1xuICAgICAgICAgIHN3YXBNdWx0aUNvbnRleHRFbnRyaWVzKGNvbnRleHQsIGN0eEluZGV4LCBpbmRleE9mRW50cnkpO1xuICAgICAgICAgIGlmIChoYXNWYWx1ZUNoYW5nZWQoZmxhZ1RvQ29tcGFyZSwgdmFsdWVUb0NvbXBhcmUsIG5ld1ZhbHVlKSkge1xuICAgICAgICAgICAgY29uc3QgaW5pdGlhbFZhbHVlID0gZ2V0SW5pdGlhbFZhbHVlKGNvbnRleHQsIGZsYWdUb0NvbXBhcmUpO1xuICAgICAgICAgICAgc2V0VmFsdWUoY29udGV4dCwgY3R4SW5kZXgsIG5ld1ZhbHVlKTtcblxuICAgICAgICAgICAgLy8gc2FtZSBpZiBzdGF0ZW1lbnQgbG9naWMgYXMgYWJvdmUgKGxvb2sgZm9yIFNLSVAgSUYgSU5JVElBTCBDSEVDSykuXG4gICAgICAgICAgICBpZiAodmFsdWVUb0NvbXBhcmUgIT0gbnVsbCB8fCBoYXNWYWx1ZUNoYW5nZWQoZmxhZ1RvQ29tcGFyZSwgaW5pdGlhbFZhbHVlLCBuZXdWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgc2V0RGlydHkoY29udGV4dCwgY3R4SW5kZXgsIHRydWUpO1xuICAgICAgICAgICAgICBwbGF5ZXJCdWlsZGVyc0FyZURpcnR5ID0gcGxheWVyQnVpbGRlcnNBcmVEaXJ0eSB8fCAhIXBsYXllckJ1aWxkZXJJbmRleDtcbiAgICAgICAgICAgICAgZGlydHkgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyB3ZSBvbmx5IGNhcmUgdG8gZG8gdGhpcyBpZiB0aGUgaW5zZXJ0aW9uIGlzIGluIHRoZSBtaWRkbGVcbiAgICAgICAgICBjb25zdCBuZXdGbGFnID0gcHJlcGFyZUluaXRpYWxGbGFnKFxuICAgICAgICAgICAgICBjb250ZXh0LCBuZXdQcm9wLCBpc0NsYXNzQmFzZWQsIGdldFN0eWxlU2FuaXRpemVyKGNvbnRleHQsIGRpcmVjdGl2ZUluZGV4KSk7XG4gICAgICAgICAgcGxheWVyQnVpbGRlcnNBcmVEaXJ0eSA9IHBsYXllckJ1aWxkZXJzQXJlRGlydHkgfHwgISFwbGF5ZXJCdWlsZGVySW5kZXg7XG4gICAgICAgICAgaW5zZXJ0TmV3TXVsdGlQcm9wZXJ0eShcbiAgICAgICAgICAgICAgY29udGV4dCwgY3R4SW5kZXgsIGlzQ2xhc3NCYXNlZCwgbmV3UHJvcCwgbmV3RmxhZywgbmV3VmFsdWUsIGRpcmVjdGl2ZUluZGV4LFxuICAgICAgICAgICAgICBwbGF5ZXJCdWlsZGVySW5kZXgpO1xuICAgICAgICAgIGRpcnR5ID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGN0eEluZGV4ICs9IFN0eWxpbmdJbmRleC5TaXplO1xuICAgIHByb3BJbmRleCsrO1xuICB9XG5cbiAgLy8gdGhpcyBtZWFucyB0aGF0IHRoZXJlIGFyZSBsZWZ0LW92ZXIgdmFsdWVzIGluIHRoZSBjb250ZXh0IHRoYXRcbiAgLy8gd2VyZSBub3QgaW5jbHVkZWQgaW4gdGhlIHByb3ZpZGVkIHN0eWxlcy9jbGFzc2VzIGFuZCBpbiB0aGlzXG4gIC8vIGNhc2UgdGhlICBnb2FsIGlzIHRvIFwicmVtb3ZlXCIgdGhlbSBmcm9tIHRoZSBjb250ZXh0IChieSBudWxsaWZ5aW5nKVxuICB3aGlsZSAoY3R4SW5kZXggPCBjb250ZXh0Lmxlbmd0aCkge1xuICAgIGNvbnN0IGZsYWcgPSBnZXRQb2ludGVycyhjb250ZXh0LCBjdHhJbmRleCk7XG4gICAgY29uc3QgaXNDbGFzc0Jhc2VkID0gKGZsYWcgJiBTdHlsaW5nRmxhZ3MuQ2xhc3MpID09PSBTdHlsaW5nRmxhZ3MuQ2xhc3M7XG4gICAgY29uc3QgcHJvY2Vzc1ZhbHVlID1cbiAgICAgICAgKCFpc0NsYXNzQmFzZWQgJiYgIWlnbm9yZUFsbFN0eWxlVXBkYXRlcykgfHwgKGlzQ2xhc3NCYXNlZCAmJiAhaWdub3JlQWxsQ2xhc3NVcGRhdGVzKTtcbiAgICBpZiAocHJvY2Vzc1ZhbHVlKSB7XG4gICAgICBjb25zdCB2YWx1ZSA9IGdldFZhbHVlKGNvbnRleHQsIGN0eEluZGV4KTtcbiAgICAgIGNvbnN0IGRvUmVtb3ZlVmFsdWUgPSB2YWx1ZUV4aXN0cyh2YWx1ZSwgaXNDbGFzc0Jhc2VkKTtcbiAgICAgIGlmIChkb1JlbW92ZVZhbHVlKSB7XG4gICAgICAgIHNldERpcnR5KGNvbnRleHQsIGN0eEluZGV4LCB0cnVlKTtcbiAgICAgICAgc2V0VmFsdWUoY29udGV4dCwgY3R4SW5kZXgsIG51bGwpO1xuXG4gICAgICAgIC8vIHdlIGtlZXAgdGhlIHBsYXllciBmYWN0b3J5IHRoZSBzYW1lIHNvIHRoYXQgdGhlIGBudWxsZWRgIHZhbHVlIGNhblxuICAgICAgICAvLyBiZSBpbnN0cnVjdGVkIGludG8gdGhlIHBsYXllciBiZWNhdXNlIHJlbW92aW5nIGEgc3R5bGUgYW5kL29yIGEgY2xhc3NcbiAgICAgICAgLy8gaXMgYSB2YWxpZCBhbmltYXRpb24gcGxheWVyIGluc3RydWN0aW9uLlxuICAgICAgICBjb25zdCBwbGF5ZXJCdWlsZGVySW5kZXggPVxuICAgICAgICAgICAgaXNDbGFzc0Jhc2VkID8gY2xhc3Nlc1BsYXllckJ1aWxkZXJJbmRleCA6IHN0eWxlc1BsYXllckJ1aWxkZXJJbmRleDtcbiAgICAgICAgc2V0UGxheWVyQnVpbGRlckluZGV4KGNvbnRleHQsIGN0eEluZGV4LCBwbGF5ZXJCdWlsZGVySW5kZXgsIGRpcmVjdGl2ZUluZGV4KTtcbiAgICAgICAgZGlydHkgPSB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICBjdHhJbmRleCArPSBTdHlsaW5nSW5kZXguU2l6ZTtcbiAgfVxuXG4gIC8vIHRoaXMgbWVhbnMgdGhhdCB0aGVyZSBhcmUgbGVmdC1vdmVyIHByb3BlcnRpZXMgaW4gdGhlIGNvbnRleHQgdGhhdFxuICAvLyB3ZXJlIG5vdCBkZXRlY3RlZCBpbiB0aGUgY29udGV4dCBkdXJpbmcgdGhlIGxvb3AgYWJvdmUuIEluIHRoYXRcbiAgLy8gY2FzZSB3ZSB3YW50IHRvIGFkZCB0aGUgbmV3IGVudHJpZXMgaW50byB0aGUgbGlzdFxuICBjb25zdCBzYW5pdGl6ZXIgPSBnZXRTdHlsZVNhbml0aXplcihjb250ZXh0LCBkaXJlY3RpdmVJbmRleCk7XG4gIHdoaWxlIChwcm9wSW5kZXggPCBwcm9wTGltaXQpIHtcbiAgICBjb25zdCBpc0NsYXNzQmFzZWQgPSBwcm9wSW5kZXggPj0gY2xhc3Nlc1N0YXJ0SW5kZXg7XG4gICAgY29uc3QgcHJvY2Vzc1ZhbHVlID1cbiAgICAgICAgKCFpc0NsYXNzQmFzZWQgJiYgIWlnbm9yZUFsbFN0eWxlVXBkYXRlcykgfHwgKGlzQ2xhc3NCYXNlZCAmJiAhaWdub3JlQWxsQ2xhc3NVcGRhdGVzKTtcbiAgICBpZiAocHJvY2Vzc1ZhbHVlKSB7XG4gICAgICBjb25zdCBhZGp1c3RlZFByb3BJbmRleCA9IGlzQ2xhc3NCYXNlZCA/IHByb3BJbmRleCAtIGNsYXNzZXNTdGFydEluZGV4IDogcHJvcEluZGV4O1xuICAgICAgY29uc3QgcHJvcCA9IGlzQ2xhc3NCYXNlZCA/IGNsYXNzTmFtZXNbYWRqdXN0ZWRQcm9wSW5kZXhdIDogc3R5bGVQcm9wc1thZGp1c3RlZFByb3BJbmRleF07XG4gICAgICBjb25zdCB2YWx1ZTogc3RyaW5nfGJvb2xlYW4gPVxuICAgICAgICAgIGlzQ2xhc3NCYXNlZCA/IChhcHBseUFsbENsYXNzZXMgPyB0cnVlIDogY2xhc3Nlc1twcm9wXSkgOiBzdHlsZXNbcHJvcF07XG4gICAgICBjb25zdCBmbGFnID0gcHJlcGFyZUluaXRpYWxGbGFnKGNvbnRleHQsIHByb3AsIGlzQ2xhc3NCYXNlZCwgc2FuaXRpemVyKSB8IFN0eWxpbmdGbGFncy5EaXJ0eTtcbiAgICAgIGNvbnN0IHBsYXllckJ1aWxkZXJJbmRleCA9XG4gICAgICAgICAgaXNDbGFzc0Jhc2VkID8gY2xhc3Nlc1BsYXllckJ1aWxkZXJJbmRleCA6IHN0eWxlc1BsYXllckJ1aWxkZXJJbmRleDtcbiAgICAgIGNvbnN0IGN0eEluZGV4ID0gY29udGV4dC5sZW5ndGg7XG4gICAgICBjb250ZXh0LnB1c2goZmxhZywgcHJvcCwgdmFsdWUsIDApO1xuICAgICAgc2V0UGxheWVyQnVpbGRlckluZGV4KGNvbnRleHQsIGN0eEluZGV4LCBwbGF5ZXJCdWlsZGVySW5kZXgsIGRpcmVjdGl2ZUluZGV4KTtcbiAgICAgIGRpcnR5ID0gdHJ1ZTtcbiAgICB9XG4gICAgcHJvcEluZGV4Kys7XG4gIH1cblxuICBpZiAoZGlydHkpIHtcbiAgICBzZXRDb250ZXh0RGlydHkoY29udGV4dCwgdHJ1ZSk7XG4gICAgc2V0RGlyZWN0aXZlRGlydHkoY29udGV4dCwgZGlyZWN0aXZlSW5kZXgsIHRydWUpO1xuICB9XG5cbiAgaWYgKHBsYXllckJ1aWxkZXJzQXJlRGlydHkpIHtcbiAgICBzZXRDb250ZXh0UGxheWVyc0RpcnR5KGNvbnRleHQsIHRydWUpO1xuICB9XG59XG5cbi8qKlxuICogVGhpcyBtZXRob2Qgd2lsbCB0b2dnbGUgdGhlIHJlZmVyZW5jZWQgQ1NTIGNsYXNzIChieSB0aGUgcHJvdmlkZWQgaW5kZXgpXG4gKiB3aXRoaW4gdGhlIGdpdmVuIGNvbnRleHQuXG4gKlxuICogQHBhcmFtIGNvbnRleHQgVGhlIHN0eWxpbmcgY29udGV4dCB0aGF0IHdpbGwgYmUgdXBkYXRlZCB3aXRoIHRoZVxuICogICAgbmV3bHkgcHJvdmlkZWQgY2xhc3MgdmFsdWUuXG4gKiBAcGFyYW0gb2Zmc2V0IFRoZSBpbmRleCBvZiB0aGUgQ1NTIGNsYXNzIHdoaWNoIGlzIGJlaW5nIHVwZGF0ZWQuXG4gKiBAcGFyYW0gYWRkT3JSZW1vdmUgV2hldGhlciBvciBub3QgdG8gYWRkIG9yIHJlbW92ZSB0aGUgQ1NTIGNsYXNzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1cGRhdGVDbGFzc1Byb3AoXG4gICAgY29udGV4dDogU3R5bGluZ0NvbnRleHQsIG9mZnNldDogbnVtYmVyLCBhZGRPclJlbW92ZTogYm9vbGVhbiB8IEJvdW5kUGxheWVyRmFjdG9yeTxib29sZWFuPixcbiAgICBkaXJlY3RpdmVSZWY/OiBhbnkpOiB2b2lkIHtcbiAgX3VwZGF0ZVNpbmdsZVN0eWxpbmdWYWx1ZShjb250ZXh0LCBvZmZzZXQsIGFkZE9yUmVtb3ZlLCB0cnVlLCBkaXJlY3RpdmVSZWYpO1xufVxuXG4vKipcbiAqIFNldHMgYW5kIHJlc29sdmVzIGEgc2luZ2xlIHN0eWxlIHZhbHVlIG9uIHRoZSBwcm92aWRlZCBgU3R5bGluZ0NvbnRleHRgIHNvXG4gKiB0aGF0IHRoZXkgY2FuIGJlIGFwcGxpZWQgdG8gdGhlIGVsZW1lbnQgb25jZSBgcmVuZGVyU3R5bGluZ2AgaXMgY2FsbGVkLlxuICpcbiAqIE5vdGUgdGhhdCBwcm9wLWxldmVsIHN0eWxpbmcgdmFsdWVzIGFyZSBjb25zaWRlcmVkIGhpZ2hlciBwcmlvcml0eSB0aGFuIGFueSBzdHlsaW5nIHRoYXRcbiAqIGhhcyBiZWVuIGFwcGxpZWQgdXNpbmcgYHVwZGF0ZVN0eWxpbmdNYXBgLCB0aGVyZWZvcmUsIHdoZW4gc3R5bGluZyB2YWx1ZXMgYXJlIHJlbmRlcmVkXG4gKiB0aGVuIGFueSBzdHlsZXMvY2xhc3NlcyB0aGF0IGhhdmUgYmVlbiBhcHBsaWVkIHVzaW5nIHRoaXMgZnVuY3Rpb24gd2lsbCBiZSBjb25zaWRlcmVkIGZpcnN0XG4gKiAodGhlbiBtdWx0aSB2YWx1ZXMgc2Vjb25kIGFuZCB0aGVuIGluaXRpYWwgdmFsdWVzIGFzIGEgYmFja3VwKS5cbiAqXG4gKiBAcGFyYW0gY29udGV4dCBUaGUgc3R5bGluZyBjb250ZXh0IHRoYXQgd2lsbCBiZSB1cGRhdGVkIHdpdGggdGhlXG4gKiAgICBuZXdseSBwcm92aWRlZCBzdHlsZSB2YWx1ZS5cbiAqIEBwYXJhbSBvZmZzZXQgVGhlIGluZGV4IG9mIHRoZSBwcm9wZXJ0eSB3aGljaCBpcyBiZWluZyB1cGRhdGVkLlxuICogQHBhcmFtIHZhbHVlIFRoZSBDU1Mgc3R5bGUgdmFsdWUgdGhhdCB3aWxsIGJlIGFzc2lnbmVkXG4gKiBAcGFyYW0gZGlyZWN0aXZlUmVmIGFuIG9wdGlvbmFsIHJlZmVyZW5jZSB0byB0aGUgZGlyZWN0aXZlIHJlc3BvbnNpYmxlXG4gKiAgICBmb3IgdGhpcyBiaW5kaW5nIGNoYW5nZS4gSWYgcHJlc2VudCB0aGVuIHN0eWxlIGJpbmRpbmcgd2lsbCBvbmx5XG4gKiAgICBhY3R1YWxpemUgaWYgdGhlIGRpcmVjdGl2ZSBoYXMgb3duZXJzaGlwIG92ZXIgdGhpcyBiaW5kaW5nXG4gKiAgICAoc2VlIHN0eWxpbmcudHMjZGlyZWN0aXZlcyBmb3IgbW9yZSBpbmZvcm1hdGlvbiBhYm91dCB0aGUgYWxnb3JpdGhtKS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZVN0eWxlUHJvcChcbiAgICBjb250ZXh0OiBTdHlsaW5nQ29udGV4dCwgb2Zmc2V0OiBudW1iZXIsXG4gICAgaW5wdXQ6IHN0cmluZyB8IGJvb2xlYW4gfCBudWxsIHwgQm91bmRQbGF5ZXJGYWN0b3J5PHN0cmluZ3xib29sZWFufG51bGw+LFxuICAgIGRpcmVjdGl2ZVJlZj86IGFueSk6IHZvaWQge1xuICBfdXBkYXRlU2luZ2xlU3R5bGluZ1ZhbHVlKGNvbnRleHQsIG9mZnNldCwgaW5wdXQsIGZhbHNlLCBkaXJlY3RpdmVSZWYpO1xufVxuXG5mdW5jdGlvbiBfdXBkYXRlU2luZ2xlU3R5bGluZ1ZhbHVlKFxuICAgIGNvbnRleHQ6IFN0eWxpbmdDb250ZXh0LCBvZmZzZXQ6IG51bWJlcixcbiAgICBpbnB1dDogc3RyaW5nIHwgYm9vbGVhbiB8IG51bGwgfCBCb3VuZFBsYXllckZhY3Rvcnk8c3RyaW5nfGJvb2xlYW58bnVsbD4sIGlzQ2xhc3NCYXNlZDogYm9vbGVhbixcbiAgICBkaXJlY3RpdmVSZWY6IGFueSk6IHZvaWQge1xuICBjb25zdCBkaXJlY3RpdmVJbmRleCA9IGdldERpcmVjdGl2ZUluZGV4RnJvbVJlZ2lzdHJ5KGNvbnRleHQsIGRpcmVjdGl2ZVJlZiB8fCBudWxsKTtcbiAgY29uc3Qgc2luZ2xlSW5kZXggPSBnZXRTaW5nbGVQcm9wSW5kZXhWYWx1ZShjb250ZXh0LCBkaXJlY3RpdmVJbmRleCwgb2Zmc2V0LCBpc0NsYXNzQmFzZWQpO1xuICBjb25zdCBjdXJyVmFsdWUgPSBnZXRWYWx1ZShjb250ZXh0LCBzaW5nbGVJbmRleCk7XG4gIGNvbnN0IGN1cnJGbGFnID0gZ2V0UG9pbnRlcnMoY29udGV4dCwgc2luZ2xlSW5kZXgpO1xuICBjb25zdCBjdXJyRGlyZWN0aXZlID0gZ2V0RGlyZWN0aXZlSW5kZXhGcm9tRW50cnkoY29udGV4dCwgc2luZ2xlSW5kZXgpO1xuICBjb25zdCB2YWx1ZTogc3RyaW5nfGJvb2xlYW58bnVsbCA9IChpbnB1dCBpbnN0YW5jZW9mIEJvdW5kUGxheWVyRmFjdG9yeSkgPyBpbnB1dC52YWx1ZSA6IGlucHV0O1xuXG4gIGlmIChoYXNWYWx1ZUNoYW5nZWQoY3VyckZsYWcsIGN1cnJWYWx1ZSwgdmFsdWUpICYmXG4gICAgICBhbGxvd1ZhbHVlQ2hhbmdlKGN1cnJWYWx1ZSwgdmFsdWUsIGN1cnJEaXJlY3RpdmUsIGRpcmVjdGl2ZUluZGV4KSkge1xuICAgIGNvbnN0IGlzQ2xhc3NCYXNlZCA9IChjdXJyRmxhZyAmIFN0eWxpbmdGbGFncy5DbGFzcykgPT09IFN0eWxpbmdGbGFncy5DbGFzcztcbiAgICBjb25zdCBlbGVtZW50ID0gY29udGV4dFtTdHlsaW5nSW5kZXguRWxlbWVudFBvc2l0aW9uXSAhYXMgSFRNTEVsZW1lbnQ7XG4gICAgY29uc3QgcGxheWVyQnVpbGRlciA9IGlucHV0IGluc3RhbmNlb2YgQm91bmRQbGF5ZXJGYWN0b3J5ID9cbiAgICAgICAgbmV3IENsYXNzQW5kU3R5bGVQbGF5ZXJCdWlsZGVyKFxuICAgICAgICAgICAgaW5wdXQgYXMgYW55LCBlbGVtZW50LCBpc0NsYXNzQmFzZWQgPyBCaW5kaW5nVHlwZS5DbGFzcyA6IEJpbmRpbmdUeXBlLlN0eWxlKSA6XG4gICAgICAgIG51bGw7XG4gICAgY29uc3QgdmFsdWUgPSAocGxheWVyQnVpbGRlciA/IChpbnB1dCBhcyBCb3VuZFBsYXllckZhY3Rvcnk8YW55PikudmFsdWUgOiBpbnB1dCkgYXMgc3RyaW5nIHxcbiAgICAgICAgYm9vbGVhbiB8IG51bGw7XG4gICAgY29uc3QgY3VyclBsYXllckluZGV4ID0gZ2V0UGxheWVyQnVpbGRlckluZGV4KGNvbnRleHQsIHNpbmdsZUluZGV4KTtcblxuICAgIGxldCBwbGF5ZXJCdWlsZGVyc0FyZURpcnR5ID0gZmFsc2U7XG4gICAgbGV0IHBsYXllckJ1aWxkZXJJbmRleCA9IHBsYXllckJ1aWxkZXIgPyBjdXJyUGxheWVySW5kZXggOiAwO1xuICAgIGlmIChoYXNQbGF5ZXJCdWlsZGVyQ2hhbmdlZChjb250ZXh0LCBwbGF5ZXJCdWlsZGVyLCBjdXJyUGxheWVySW5kZXgpKSB7XG4gICAgICBjb25zdCBuZXdJbmRleCA9IHNldFBsYXllckJ1aWxkZXIoY29udGV4dCwgcGxheWVyQnVpbGRlciwgY3VyclBsYXllckluZGV4KTtcbiAgICAgIHBsYXllckJ1aWxkZXJJbmRleCA9IHBsYXllckJ1aWxkZXIgPyBuZXdJbmRleCA6IDA7XG4gICAgICBwbGF5ZXJCdWlsZGVyc0FyZURpcnR5ID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAocGxheWVyQnVpbGRlcnNBcmVEaXJ0eSB8fCBjdXJyRGlyZWN0aXZlICE9PSBkaXJlY3RpdmVJbmRleCkge1xuICAgICAgc2V0UGxheWVyQnVpbGRlckluZGV4KGNvbnRleHQsIHNpbmdsZUluZGV4LCBwbGF5ZXJCdWlsZGVySW5kZXgsIGRpcmVjdGl2ZUluZGV4KTtcbiAgICB9XG5cbiAgICBpZiAoY3VyckRpcmVjdGl2ZSAhPT0gZGlyZWN0aXZlSW5kZXgpIHtcbiAgICAgIGNvbnN0IHByb3AgPSBnZXRQcm9wKGNvbnRleHQsIHNpbmdsZUluZGV4KTtcbiAgICAgIGNvbnN0IHNhbml0aXplciA9IGdldFN0eWxlU2FuaXRpemVyKGNvbnRleHQsIGRpcmVjdGl2ZUluZGV4KTtcbiAgICAgIHNldFNhbml0aXplRmxhZyhjb250ZXh0LCBzaW5nbGVJbmRleCwgKHNhbml0aXplciAmJiBzYW5pdGl6ZXIocHJvcCkpID8gdHJ1ZSA6IGZhbHNlKTtcbiAgICB9XG5cbiAgICAvLyB0aGUgdmFsdWUgd2lsbCBhbHdheXMgZ2V0IHVwZGF0ZWQgKGV2ZW4gaWYgdGhlIGRpcnR5IGZsYWcgaXMgc2tpcHBlZClcbiAgICBzZXRWYWx1ZShjb250ZXh0LCBzaW5nbGVJbmRleCwgdmFsdWUpO1xuICAgIGNvbnN0IGluZGV4Rm9yTXVsdGkgPSBnZXRNdWx0aU9yU2luZ2xlSW5kZXgoY3VyckZsYWcpO1xuXG4gICAgLy8gaWYgdGhlIHZhbHVlIGlzIHRoZSBzYW1lIGluIHRoZSBtdWx0aS1hcmVhIHRoZW4gdGhlcmUncyBubyBwb2ludCBpbiByZS1hc3NlbWJsaW5nXG4gICAgY29uc3QgdmFsdWVGb3JNdWx0aSA9IGdldFZhbHVlKGNvbnRleHQsIGluZGV4Rm9yTXVsdGkpO1xuICAgIGlmICghdmFsdWVGb3JNdWx0aSB8fCBoYXNWYWx1ZUNoYW5nZWQoY3VyckZsYWcsIHZhbHVlRm9yTXVsdGksIHZhbHVlKSkge1xuICAgICAgbGV0IG11bHRpRGlydHkgPSBmYWxzZTtcbiAgICAgIGxldCBzaW5nbGVEaXJ0eSA9IHRydWU7XG5cbiAgICAgIC8vIG9ubHkgd2hlbiB0aGUgdmFsdWUgaXMgc2V0IHRvIGBudWxsYCBzaG91bGQgdGhlIG11bHRpLXZhbHVlIGdldCBmbGFnZ2VkXG4gICAgICBpZiAoIXZhbHVlRXhpc3RzKHZhbHVlLCBpc0NsYXNzQmFzZWQpICYmIHZhbHVlRXhpc3RzKHZhbHVlRm9yTXVsdGksIGlzQ2xhc3NCYXNlZCkpIHtcbiAgICAgICAgbXVsdGlEaXJ0eSA9IHRydWU7XG4gICAgICAgIHNpbmdsZURpcnR5ID0gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIHNldERpcnR5KGNvbnRleHQsIGluZGV4Rm9yTXVsdGksIG11bHRpRGlydHkpO1xuICAgICAgc2V0RGlydHkoY29udGV4dCwgc2luZ2xlSW5kZXgsIHNpbmdsZURpcnR5KTtcbiAgICAgIHNldERpcmVjdGl2ZURpcnR5KGNvbnRleHQsIGRpcmVjdGl2ZUluZGV4LCB0cnVlKTtcbiAgICAgIHNldENvbnRleHREaXJ0eShjb250ZXh0LCB0cnVlKTtcbiAgICB9XG5cbiAgICBpZiAocGxheWVyQnVpbGRlcnNBcmVEaXJ0eSkge1xuICAgICAgc2V0Q29udGV4dFBsYXllcnNEaXJ0eShjb250ZXh0LCB0cnVlKTtcbiAgICB9XG4gIH1cbn1cblxuXG4vKipcbiAqIFJlbmRlcnMgYWxsIHF1ZXVlZCBzdHlsaW5nIHVzaW5nIGEgcmVuZGVyZXIgb250byB0aGUgZ2l2ZW4gZWxlbWVudC5cbiAqXG4gKiBUaGlzIGZ1bmN0aW9uIHdvcmtzIGJ5IHJlbmRlcmluZyBhbnkgc3R5bGVzICh0aGF0IGhhdmUgYmVlbiBhcHBsaWVkXG4gKiB1c2luZyBgdXBkYXRlU3R5bGluZ01hcGApIGFuZCBhbnkgY2xhc3NlcyAodGhhdCBoYXZlIGJlZW4gYXBwbGllZCB1c2luZ1xuICogYHVwZGF0ZVN0eWxlUHJvcGApIG9udG8gdGhlIHByb3ZpZGVkIGVsZW1lbnQgdXNpbmcgdGhlIHByb3ZpZGVkIHJlbmRlcmVyLlxuICogSnVzdCBiZWZvcmUgdGhlIHN0eWxlcy9jbGFzc2VzIGFyZSByZW5kZXJlZCBhIGZpbmFsIGtleS92YWx1ZSBzdHlsZSBtYXBcbiAqIHdpbGwgYmUgYXNzZW1ibGVkIChpZiBgc3R5bGVTdG9yZWAgb3IgYGNsYXNzU3RvcmVgIGFyZSBwcm92aWRlZCkuXG4gKlxuICogQHBhcmFtIGxFbGVtZW50IHRoZSBlbGVtZW50IHRoYXQgdGhlIHN0eWxlcyB3aWxsIGJlIHJlbmRlcmVkIG9uXG4gKiBAcGFyYW0gY29udGV4dCBUaGUgc3R5bGluZyBjb250ZXh0IHRoYXQgd2lsbCBiZSB1c2VkIHRvIGRldGVybWluZVxuICogICAgICB3aGF0IHN0eWxlcyB3aWxsIGJlIHJlbmRlcmVkXG4gKiBAcGFyYW0gcmVuZGVyZXIgdGhlIHJlbmRlcmVyIHRoYXQgd2lsbCBiZSB1c2VkIHRvIGFwcGx5IHRoZSBzdHlsaW5nXG4gKiBAcGFyYW0gY2xhc3Nlc1N0b3JlIGlmIHByb3ZpZGVkLCB0aGUgdXBkYXRlZCBjbGFzcyB2YWx1ZXMgd2lsbCBiZSBhcHBsaWVkXG4gKiAgICB0byB0aGlzIGtleS92YWx1ZSBtYXAgaW5zdGVhZCBvZiBiZWluZyByZW5kZXJlcmVkIHZpYSB0aGUgcmVuZGVyZXIuXG4gKiBAcGFyYW0gc3R5bGVzU3RvcmUgaWYgcHJvdmlkZWQsIHRoZSB1cGRhdGVkIHN0eWxlIHZhbHVlcyB3aWxsIGJlIGFwcGxpZWRcbiAqICAgIHRvIHRoaXMga2V5L3ZhbHVlIG1hcCBpbnN0ZWFkIG9mIGJlaW5nIHJlbmRlcmVyZWQgdmlhIHRoZSByZW5kZXJlci5cbiAqIEBwYXJhbSBkaXJlY3RpdmVSZWYgYW4gb3B0aW9uYWwgZGlyZWN0aXZlIHRoYXQgd2lsbCBiZSB1c2VkIHRvIHRhcmdldCB3aGljaFxuICogICAgc3R5bGluZyB2YWx1ZXMgYXJlIHJlbmRlcmVkLiBJZiBsZWZ0IGVtcHR5LCBvbmx5IHRoZSBiaW5kaW5ncyB0aGF0IGFyZVxuICogICAgcmVnaXN0ZXJlZCBvbiB0aGUgdGVtcGxhdGUgd2lsbCBiZSByZW5kZXJlZC5cbiAqIEByZXR1cm5zIG51bWJlciB0aGUgdG90YWwgYW1vdW50IG9mIHBsYXllcnMgdGhhdCBnb3QgcXVldWVkIGZvciBhbmltYXRpb24gKGlmIGFueSlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlclN0eWxpbmcoXG4gICAgY29udGV4dDogU3R5bGluZ0NvbnRleHQsIHJlbmRlcmVyOiBSZW5kZXJlcjMsIHJvb3RPclZpZXc6IFJvb3RDb250ZXh0IHwgTFZpZXcsXG4gICAgaXNGaXJzdFJlbmRlcjogYm9vbGVhbiwgY2xhc3Nlc1N0b3JlPzogQmluZGluZ1N0b3JlIHwgbnVsbCwgc3R5bGVzU3RvcmU/OiBCaW5kaW5nU3RvcmUgfCBudWxsLFxuICAgIGRpcmVjdGl2ZVJlZj86IGFueSk6IG51bWJlciB7XG4gIGxldCB0b3RhbFBsYXllcnNRdWV1ZWQgPSAwO1xuICBjb25zdCB0YXJnZXREaXJlY3RpdmVJbmRleCA9IGdldERpcmVjdGl2ZUluZGV4RnJvbVJlZ2lzdHJ5KGNvbnRleHQsIGRpcmVjdGl2ZVJlZiB8fCBudWxsKTtcblxuICBpZiAoaXNDb250ZXh0RGlydHkoY29udGV4dCkgJiYgaXNEaXJlY3RpdmVEaXJ0eShjb250ZXh0LCB0YXJnZXREaXJlY3RpdmVJbmRleCkpIHtcbiAgICBjb25zdCBmbHVzaFBsYXllckJ1aWxkZXJzOiBhbnkgPVxuICAgICAgICBjb250ZXh0W1N0eWxpbmdJbmRleC5NYXN0ZXJGbGFnUG9zaXRpb25dICYgU3R5bGluZ0ZsYWdzLlBsYXllckJ1aWxkZXJzRGlydHk7XG4gICAgY29uc3QgbmF0aXZlID0gY29udGV4dFtTdHlsaW5nSW5kZXguRWxlbWVudFBvc2l0aW9uXSAhO1xuICAgIGNvbnN0IG11bHRpU3RhcnRJbmRleCA9IGdldE11bHRpU3RhcnRJbmRleChjb250ZXh0KTtcbiAgICBjb25zdCBvbmx5U2luZ2xlQ2xhc3NlcyA9IGxpbWl0VG9TaW5nbGVDbGFzc2VzKGNvbnRleHQpO1xuXG4gICAgbGV0IHN0aWxsRGlydHkgPSBmYWxzZTtcbiAgICBmb3IgKGxldCBpID0gU3R5bGluZ0luZGV4LlNpbmdsZVN0eWxlc1N0YXJ0UG9zaXRpb247IGkgPCBjb250ZXh0Lmxlbmd0aDtcbiAgICAgICAgIGkgKz0gU3R5bGluZ0luZGV4LlNpemUpIHtcbiAgICAgIC8vIHRoZXJlIGlzIG5vIHBvaW50IGluIHJlbmRlcmluZyBzdHlsZXMgdGhhdCBoYXZlIG5vdCBjaGFuZ2VkIG9uIHNjcmVlblxuICAgICAgaWYgKGlzRGlydHkoY29udGV4dCwgaSkpIHtcbiAgICAgICAgY29uc3QgZmxhZyA9IGdldFBvaW50ZXJzKGNvbnRleHQsIGkpO1xuICAgICAgICBjb25zdCBkaXJlY3RpdmVJbmRleCA9IGdldERpcmVjdGl2ZUluZGV4RnJvbUVudHJ5KGNvbnRleHQsIGkpO1xuICAgICAgICBpZiAodGFyZ2V0RGlyZWN0aXZlSW5kZXggIT09IGRpcmVjdGl2ZUluZGV4KSB7XG4gICAgICAgICAgc3RpbGxEaXJ0eSA9IHRydWU7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBwcm9wID0gZ2V0UHJvcChjb250ZXh0LCBpKTtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBnZXRWYWx1ZShjb250ZXh0LCBpKTtcbiAgICAgICAgY29uc3Qgc3R5bGVTYW5pdGl6ZXIgPVxuICAgICAgICAgICAgKGZsYWcgJiBTdHlsaW5nRmxhZ3MuU2FuaXRpemUpID8gZ2V0U3R5bGVTYW5pdGl6ZXIoY29udGV4dCwgZGlyZWN0aXZlSW5kZXgpIDogbnVsbDtcbiAgICAgICAgY29uc3QgcGxheWVyQnVpbGRlciA9IGdldFBsYXllckJ1aWxkZXIoY29udGV4dCwgaSk7XG4gICAgICAgIGNvbnN0IGlzQ2xhc3NCYXNlZCA9IGZsYWcgJiBTdHlsaW5nRmxhZ3MuQ2xhc3MgPyB0cnVlIDogZmFsc2U7XG4gICAgICAgIGNvbnN0IGlzSW5TaW5nbGVSZWdpb24gPSBpIDwgbXVsdGlTdGFydEluZGV4O1xuICAgICAgICBjb25zdCByZWFkSW5pdGlhbFZhbHVlID0gIWlzQ2xhc3NCYXNlZCB8fCAhb25seVNpbmdsZUNsYXNzZXM7XG5cbiAgICAgICAgbGV0IHZhbHVlVG9BcHBseTogc3RyaW5nfGJvb2xlYW58bnVsbCA9IHZhbHVlO1xuXG4gICAgICAgIC8vIFZBTFVFIERFRkVSIENBU0UgMTogVXNlIGEgbXVsdGkgdmFsdWUgaW5zdGVhZCBvZiBhIG51bGwgc2luZ2xlIHZhbHVlXG4gICAgICAgIC8vIHRoaXMgY2hlY2sgaW1wbGllcyB0aGF0IGEgc2luZ2xlIHZhbHVlIHdhcyByZW1vdmVkIGFuZCB3ZVxuICAgICAgICAvLyBzaG91bGQgbm93IGRlZmVyIHRvIGEgbXVsdGkgdmFsdWUgYW5kIHVzZSB0aGF0IChpZiBzZXQpLlxuICAgICAgICBpZiAoaXNJblNpbmdsZVJlZ2lvbiAmJiAhdmFsdWVFeGlzdHModmFsdWVUb0FwcGx5LCBpc0NsYXNzQmFzZWQpKSB7XG4gICAgICAgICAgLy8gc2luZ2xlIHZhbHVlcyBBTFdBWVMgaGF2ZSBhIHJlZmVyZW5jZSB0byBhIG11bHRpIGluZGV4XG4gICAgICAgICAgY29uc3QgbXVsdGlJbmRleCA9IGdldE11bHRpT3JTaW5nbGVJbmRleChmbGFnKTtcbiAgICAgICAgICB2YWx1ZVRvQXBwbHkgPSBnZXRWYWx1ZShjb250ZXh0LCBtdWx0aUluZGV4KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFZBTFVFIERFRkVSIENBU0UgMjogVXNlIHRoZSBpbml0aWFsIHZhbHVlIGlmIGFsbCBlbHNlIGZhaWxzIChpcyBmYWxzeSlcbiAgICAgICAgLy8gdGhlIGluaXRpYWwgdmFsdWUgd2lsbCBhbHdheXMgYmUgYSBzdHJpbmcgb3IgbnVsbCxcbiAgICAgICAgLy8gdGhlcmVmb3JlIHdlIGNhbiBzYWZlbHkgYWRvcHQgaXQgaW5jYXNlIHRoZXJlJ3Mgbm90aGluZyBlbHNlXG4gICAgICAgIC8vIG5vdGUgdGhhdCB0aGlzIHNob3VsZCBhbHdheXMgYmUgYSBmYWxzeSBjaGVjayBzaW5jZSBgZmFsc2VgIGlzIHVzZWRcbiAgICAgICAgLy8gZm9yIGJvdGggY2xhc3MgYW5kIHN0eWxlIGNvbXBhcmlzb25zIChzdHlsZXMgY2FuJ3QgYmUgZmFsc2UgYW5kIGZhbHNlXG4gICAgICAgIC8vIGNsYXNzZXMgYXJlIHR1cm5lZCBvZmYgYW5kIHNob3VsZCB0aGVyZWZvcmUgZGVmZXIgdG8gdGhlaXIgaW5pdGlhbCB2YWx1ZXMpXG4gICAgICAgIC8vIE5vdGUgdGhhdCB3ZSBpZ25vcmUgY2xhc3MtYmFzZWQgZGVmZXJhbHMgYmVjYXVzZSBvdGhlcndpc2UgYSBjbGFzcyBjYW4gbmV2ZXJcbiAgICAgICAgLy8gYmUgcmVtb3ZlZCBpbiB0aGUgY2FzZSB0aGF0IGl0IGV4aXN0cyBhcyB0cnVlIGluIHRoZSBpbml0aWFsIGNsYXNzZXMgbGlzdC4uLlxuICAgICAgICBpZiAoIWlzQ2xhc3NCYXNlZCAmJiAhdmFsdWVFeGlzdHModmFsdWVUb0FwcGx5LCBpc0NsYXNzQmFzZWQpICYmIHJlYWRJbml0aWFsVmFsdWUpIHtcbiAgICAgICAgICB2YWx1ZVRvQXBwbHkgPSBnZXRJbml0aWFsVmFsdWUoY29udGV4dCwgZmxhZyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBpZiB0aGUgZmlyc3QgcmVuZGVyIGlzIHRydWUgdGhlbiB3ZSBkbyBub3Qgd2FudCB0byBzdGFydCBhcHBseWluZyBmYWxzeVxuICAgICAgICAvLyB2YWx1ZXMgdG8gdGhlIERPTSBlbGVtZW50J3Mgc3R5bGluZy4gT3RoZXJ3aXNlIHRoZW4gd2Uga25vdyB0aGVyZSBoYXNcbiAgICAgICAgLy8gYmVlbiBhIGNoYW5nZSBhbmQgZXZlbiBpZiBpdCdzIGZhbHN5IHRoZW4gaXQncyByZW1vdmluZyBzb21ldGhpbmcgdGhhdFxuICAgICAgICAvLyB3YXMgdHJ1dGh5IGJlZm9yZS5cbiAgICAgICAgY29uc3QgZG9BcHBseVZhbHVlID0gaXNGaXJzdFJlbmRlciA/IHZhbHVlVG9BcHBseSA6IHRydWU7XG4gICAgICAgIGlmIChkb0FwcGx5VmFsdWUpIHtcbiAgICAgICAgICBpZiAoaXNDbGFzc0Jhc2VkKSB7XG4gICAgICAgICAgICBzZXRDbGFzcyhcbiAgICAgICAgICAgICAgICBuYXRpdmUsIHByb3AsIHZhbHVlVG9BcHBseSA/IHRydWUgOiBmYWxzZSwgcmVuZGVyZXIsIGNsYXNzZXNTdG9yZSwgcGxheWVyQnVpbGRlcik7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNldFN0eWxlKFxuICAgICAgICAgICAgICAgIG5hdGl2ZSwgcHJvcCwgdmFsdWVUb0FwcGx5IGFzIHN0cmluZyB8IG51bGwsIHJlbmRlcmVyLCBzdHlsZVNhbml0aXplciwgc3R5bGVzU3RvcmUsXG4gICAgICAgICAgICAgICAgcGxheWVyQnVpbGRlcik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgc2V0RGlydHkoY29udGV4dCwgaSwgZmFsc2UpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChmbHVzaFBsYXllckJ1aWxkZXJzKSB7XG4gICAgICBjb25zdCByb290Q29udGV4dCA9XG4gICAgICAgICAgQXJyYXkuaXNBcnJheShyb290T3JWaWV3KSA/IGdldFJvb3RDb250ZXh0KHJvb3RPclZpZXcpIDogcm9vdE9yVmlldyBhcyBSb290Q29udGV4dDtcbiAgICAgIGNvbnN0IHBsYXllckNvbnRleHQgPSBnZXRQbGF5ZXJDb250ZXh0KGNvbnRleHQpICE7XG4gICAgICBjb25zdCBwbGF5ZXJzU3RhcnRJbmRleCA9IHBsYXllckNvbnRleHRbUGxheWVySW5kZXguTm9uQnVpbGRlclBsYXllcnNTdGFydF07XG4gICAgICBmb3IgKGxldCBpID0gUGxheWVySW5kZXguUGxheWVyQnVpbGRlcnNTdGFydFBvc2l0aW9uOyBpIDwgcGxheWVyc1N0YXJ0SW5kZXg7XG4gICAgICAgICAgIGkgKz0gUGxheWVySW5kZXguUGxheWVyQW5kUGxheWVyQnVpbGRlcnNUdXBsZVNpemUpIHtcbiAgICAgICAgY29uc3QgYnVpbGRlciA9IHBsYXllckNvbnRleHRbaV0gYXMgQ2xhc3NBbmRTdHlsZVBsYXllckJ1aWxkZXI8YW55PnwgbnVsbDtcbiAgICAgICAgY29uc3QgcGxheWVySW5zZXJ0aW9uSW5kZXggPSBpICsgUGxheWVySW5kZXguUGxheWVyT2Zmc2V0UG9zaXRpb247XG4gICAgICAgIGNvbnN0IG9sZFBsYXllciA9IHBsYXllckNvbnRleHRbcGxheWVySW5zZXJ0aW9uSW5kZXhdIGFzIFBsYXllciB8IG51bGw7XG4gICAgICAgIGlmIChidWlsZGVyKSB7XG4gICAgICAgICAgY29uc3QgcGxheWVyID0gYnVpbGRlci5idWlsZFBsYXllcihvbGRQbGF5ZXIsIGlzRmlyc3RSZW5kZXIpO1xuICAgICAgICAgIGlmIChwbGF5ZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgaWYgKHBsYXllciAhPSBudWxsKSB7XG4gICAgICAgICAgICAgIGNvbnN0IHdhc1F1ZXVlZCA9IGFkZFBsYXllckludGVybmFsKFxuICAgICAgICAgICAgICAgICAgcGxheWVyQ29udGV4dCwgcm9vdENvbnRleHQsIG5hdGl2ZSBhcyBIVE1MRWxlbWVudCwgcGxheWVyLCBwbGF5ZXJJbnNlcnRpb25JbmRleCk7XG4gICAgICAgICAgICAgIHdhc1F1ZXVlZCAmJiB0b3RhbFBsYXllcnNRdWV1ZWQrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvbGRQbGF5ZXIpIHtcbiAgICAgICAgICAgICAgb2xkUGxheWVyLmRlc3Ryb3koKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAob2xkUGxheWVyKSB7XG4gICAgICAgICAgLy8gdGhlIHBsYXllciBidWlsZGVyIGhhcyBiZWVuIHJlbW92ZWQgLi4uIHRoZXJlZm9yZSB3ZSBzaG91bGQgZGVsZXRlIHRoZSBhc3NvY2lhdGVkXG4gICAgICAgICAgLy8gcGxheWVyXG4gICAgICAgICAgb2xkUGxheWVyLmRlc3Ryb3koKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgc2V0Q29udGV4dFBsYXllcnNEaXJ0eShjb250ZXh0LCBmYWxzZSk7XG4gICAgfVxuXG4gICAgc2V0RGlyZWN0aXZlRGlydHkoY29udGV4dCwgdGFyZ2V0RGlyZWN0aXZlSW5kZXgsIGZhbHNlKTtcbiAgICBzZXRDb250ZXh0RGlydHkoY29udGV4dCwgc3RpbGxEaXJ0eSk7XG4gIH1cblxuICByZXR1cm4gdG90YWxQbGF5ZXJzUXVldWVkO1xufVxuXG4vKipcbiAqIFRoaXMgZnVuY3Rpb24gcmVuZGVycyBhIGdpdmVuIENTUyBwcm9wL3ZhbHVlIGVudHJ5IHVzaW5nIHRoZVxuICogcHJvdmlkZWQgcmVuZGVyZXIuIElmIGEgYHN0b3JlYCB2YWx1ZSBpcyBwcm92aWRlZCB0aGVuXG4gKiB0aGF0IHdpbGwgYmUgdXNlZCBhIHJlbmRlciBjb250ZXh0IGluc3RlYWQgb2YgdGhlIHByb3ZpZGVkXG4gKiByZW5kZXJlci5cbiAqXG4gKiBAcGFyYW0gbmF0aXZlIHRoZSBET00gRWxlbWVudFxuICogQHBhcmFtIHByb3AgdGhlIENTUyBzdHlsZSBwcm9wZXJ0eSB0aGF0IHdpbGwgYmUgcmVuZGVyZWRcbiAqIEBwYXJhbSB2YWx1ZSB0aGUgQ1NTIHN0eWxlIHZhbHVlIHRoYXQgd2lsbCBiZSByZW5kZXJlZFxuICogQHBhcmFtIHJlbmRlcmVyXG4gKiBAcGFyYW0gc3RvcmUgYW4gb3B0aW9uYWwga2V5L3ZhbHVlIG1hcCB0aGF0IHdpbGwgYmUgdXNlZCBhcyBhIGNvbnRleHQgdG8gcmVuZGVyIHN0eWxlcyBvblxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0U3R5bGUoXG4gICAgbmF0aXZlOiBhbnksIHByb3A6IHN0cmluZywgdmFsdWU6IHN0cmluZyB8IG51bGwsIHJlbmRlcmVyOiBSZW5kZXJlcjMsXG4gICAgc2FuaXRpemVyOiBTdHlsZVNhbml0aXplRm4gfCBudWxsLCBzdG9yZT86IEJpbmRpbmdTdG9yZSB8IG51bGwsXG4gICAgcGxheWVyQnVpbGRlcj86IENsYXNzQW5kU3R5bGVQbGF5ZXJCdWlsZGVyPGFueT58IG51bGwpIHtcbiAgdmFsdWUgPSBzYW5pdGl6ZXIgJiYgdmFsdWUgPyBzYW5pdGl6ZXIocHJvcCwgdmFsdWUpIDogdmFsdWU7XG4gIGlmIChzdG9yZSB8fCBwbGF5ZXJCdWlsZGVyKSB7XG4gICAgaWYgKHN0b3JlKSB7XG4gICAgICBzdG9yZS5zZXRWYWx1ZShwcm9wLCB2YWx1ZSk7XG4gICAgfVxuICAgIGlmIChwbGF5ZXJCdWlsZGVyKSB7XG4gICAgICBwbGF5ZXJCdWlsZGVyLnNldFZhbHVlKHByb3AsIHZhbHVlKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAodmFsdWUpIHtcbiAgICB2YWx1ZSA9IHZhbHVlLnRvU3RyaW5nKCk7ICAvLyBvcGFjaXR5LCB6LWluZGV4IGFuZCBmbGV4Ym94IGFsbCBoYXZlIG51bWJlciB2YWx1ZXMgd2hpY2ggbWF5IG5vdFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFzc2lnbiBhcyBudW1iZXJzXG4gICAgbmdEZXZNb2RlICYmIG5nRGV2TW9kZS5yZW5kZXJlclNldFN0eWxlKys7XG4gICAgaXNQcm9jZWR1cmFsUmVuZGVyZXIocmVuZGVyZXIpID9cbiAgICAgICAgcmVuZGVyZXIuc2V0U3R5bGUobmF0aXZlLCBwcm9wLCB2YWx1ZSwgUmVuZGVyZXJTdHlsZUZsYWdzMy5EYXNoQ2FzZSkgOlxuICAgICAgICBuYXRpdmVbJ3N0eWxlJ10uc2V0UHJvcGVydHkocHJvcCwgdmFsdWUpO1xuICB9IGVsc2Uge1xuICAgIG5nRGV2TW9kZSAmJiBuZ0Rldk1vZGUucmVuZGVyZXJSZW1vdmVTdHlsZSsrO1xuICAgIGlzUHJvY2VkdXJhbFJlbmRlcmVyKHJlbmRlcmVyKSA/XG4gICAgICAgIHJlbmRlcmVyLnJlbW92ZVN0eWxlKG5hdGl2ZSwgcHJvcCwgUmVuZGVyZXJTdHlsZUZsYWdzMy5EYXNoQ2FzZSkgOlxuICAgICAgICBuYXRpdmVbJ3N0eWxlJ10ucmVtb3ZlUHJvcGVydHkocHJvcCk7XG4gIH1cbn1cblxuLyoqXG4gKiBUaGlzIGZ1bmN0aW9uIHJlbmRlcnMgYSBnaXZlbiBDU1MgY2xhc3MgdmFsdWUgdXNpbmcgdGhlIHByb3ZpZGVkXG4gKiByZW5kZXJlciAoYnkgYWRkaW5nIG9yIHJlbW92aW5nIGl0IGZyb20gdGhlIHByb3ZpZGVkIGVsZW1lbnQpLlxuICogSWYgYSBgc3RvcmVgIHZhbHVlIGlzIHByb3ZpZGVkIHRoZW4gdGhhdCB3aWxsIGJlIHVzZWQgYSByZW5kZXJcbiAqIGNvbnRleHQgaW5zdGVhZCBvZiB0aGUgcHJvdmlkZWQgcmVuZGVyZXIuXG4gKlxuICogQHBhcmFtIG5hdGl2ZSB0aGUgRE9NIEVsZW1lbnRcbiAqIEBwYXJhbSBwcm9wIHRoZSBDU1Mgc3R5bGUgcHJvcGVydHkgdGhhdCB3aWxsIGJlIHJlbmRlcmVkXG4gKiBAcGFyYW0gdmFsdWUgdGhlIENTUyBzdHlsZSB2YWx1ZSB0aGF0IHdpbGwgYmUgcmVuZGVyZWRcbiAqIEBwYXJhbSByZW5kZXJlclxuICogQHBhcmFtIHN0b3JlIGFuIG9wdGlvbmFsIGtleS92YWx1ZSBtYXAgdGhhdCB3aWxsIGJlIHVzZWQgYXMgYSBjb250ZXh0IHRvIHJlbmRlciBzdHlsZXMgb25cbiAqL1xuZnVuY3Rpb24gc2V0Q2xhc3MoXG4gICAgbmF0aXZlOiBhbnksIGNsYXNzTmFtZTogc3RyaW5nLCBhZGQ6IGJvb2xlYW4sIHJlbmRlcmVyOiBSZW5kZXJlcjMsIHN0b3JlPzogQmluZGluZ1N0b3JlIHwgbnVsbCxcbiAgICBwbGF5ZXJCdWlsZGVyPzogQ2xhc3NBbmRTdHlsZVBsYXllckJ1aWxkZXI8YW55PnwgbnVsbCkge1xuICBpZiAoc3RvcmUgfHwgcGxheWVyQnVpbGRlcikge1xuICAgIGlmIChzdG9yZSkge1xuICAgICAgc3RvcmUuc2V0VmFsdWUoY2xhc3NOYW1lLCBhZGQpO1xuICAgIH1cbiAgICBpZiAocGxheWVyQnVpbGRlcikge1xuICAgICAgcGxheWVyQnVpbGRlci5zZXRWYWx1ZShjbGFzc05hbWUsIGFkZCk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGFkZCkge1xuICAgIG5nRGV2TW9kZSAmJiBuZ0Rldk1vZGUucmVuZGVyZXJBZGRDbGFzcysrO1xuICAgIGlzUHJvY2VkdXJhbFJlbmRlcmVyKHJlbmRlcmVyKSA/IHJlbmRlcmVyLmFkZENsYXNzKG5hdGl2ZSwgY2xhc3NOYW1lKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmF0aXZlWydjbGFzc0xpc3QnXS5hZGQoY2xhc3NOYW1lKTtcbiAgfSBlbHNlIHtcbiAgICBuZ0Rldk1vZGUgJiYgbmdEZXZNb2RlLnJlbmRlcmVyUmVtb3ZlQ2xhc3MrKztcbiAgICBpc1Byb2NlZHVyYWxSZW5kZXJlcihyZW5kZXJlcikgPyByZW5kZXJlci5yZW1vdmVDbGFzcyhuYXRpdmUsIGNsYXNzTmFtZSkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hdGl2ZVsnY2xhc3NMaXN0J10ucmVtb3ZlKGNsYXNzTmFtZSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gc2V0U2FuaXRpemVGbGFnKGNvbnRleHQ6IFN0eWxpbmdDb250ZXh0LCBpbmRleDogbnVtYmVyLCBzYW5pdGl6ZVllczogYm9vbGVhbikge1xuICBpZiAoc2FuaXRpemVZZXMpIHtcbiAgICAoY29udGV4dFtpbmRleF0gYXMgbnVtYmVyKSB8PSBTdHlsaW5nRmxhZ3MuU2FuaXRpemU7XG4gIH0gZWxzZSB7XG4gICAgKGNvbnRleHRbaW5kZXhdIGFzIG51bWJlcikgJj0gflN0eWxpbmdGbGFncy5TYW5pdGl6ZTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzZXREaXJ0eShjb250ZXh0OiBTdHlsaW5nQ29udGV4dCwgaW5kZXg6IG51bWJlciwgaXNEaXJ0eVllczogYm9vbGVhbikge1xuICBjb25zdCBhZGp1c3RlZEluZGV4ID1cbiAgICAgIGluZGV4ID49IFN0eWxpbmdJbmRleC5TaW5nbGVTdHlsZXNTdGFydFBvc2l0aW9uID8gKGluZGV4ICsgU3R5bGluZ0luZGV4LkZsYWdzT2Zmc2V0KSA6IGluZGV4O1xuICBpZiAoaXNEaXJ0eVllcykge1xuICAgIChjb250ZXh0W2FkanVzdGVkSW5kZXhdIGFzIG51bWJlcikgfD0gU3R5bGluZ0ZsYWdzLkRpcnR5O1xuICB9IGVsc2Uge1xuICAgIChjb250ZXh0W2FkanVzdGVkSW5kZXhdIGFzIG51bWJlcikgJj0gflN0eWxpbmdGbGFncy5EaXJ0eTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc0RpcnR5KGNvbnRleHQ6IFN0eWxpbmdDb250ZXh0LCBpbmRleDogbnVtYmVyKTogYm9vbGVhbiB7XG4gIGNvbnN0IGFkanVzdGVkSW5kZXggPVxuICAgICAgaW5kZXggPj0gU3R5bGluZ0luZGV4LlNpbmdsZVN0eWxlc1N0YXJ0UG9zaXRpb24gPyAoaW5kZXggKyBTdHlsaW5nSW5kZXguRmxhZ3NPZmZzZXQpIDogaW5kZXg7XG4gIHJldHVybiAoKGNvbnRleHRbYWRqdXN0ZWRJbmRleF0gYXMgbnVtYmVyKSAmIFN0eWxpbmdGbGFncy5EaXJ0eSkgPT0gU3R5bGluZ0ZsYWdzLkRpcnR5O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNDbGFzc0Jhc2VkVmFsdWUoY29udGV4dDogU3R5bGluZ0NvbnRleHQsIGluZGV4OiBudW1iZXIpOiBib29sZWFuIHtcbiAgY29uc3QgYWRqdXN0ZWRJbmRleCA9XG4gICAgICBpbmRleCA+PSBTdHlsaW5nSW5kZXguU2luZ2xlU3R5bGVzU3RhcnRQb3NpdGlvbiA/IChpbmRleCArIFN0eWxpbmdJbmRleC5GbGFnc09mZnNldCkgOiBpbmRleDtcbiAgcmV0dXJuICgoY29udGV4dFthZGp1c3RlZEluZGV4XSBhcyBudW1iZXIpICYgU3R5bGluZ0ZsYWdzLkNsYXNzKSA9PSBTdHlsaW5nRmxhZ3MuQ2xhc3M7XG59XG5cbmZ1bmN0aW9uIGlzU2FuaXRpemFibGUoY29udGV4dDogU3R5bGluZ0NvbnRleHQsIGluZGV4OiBudW1iZXIpOiBib29sZWFuIHtcbiAgY29uc3QgYWRqdXN0ZWRJbmRleCA9XG4gICAgICBpbmRleCA+PSBTdHlsaW5nSW5kZXguU2luZ2xlU3R5bGVzU3RhcnRQb3NpdGlvbiA/IChpbmRleCArIFN0eWxpbmdJbmRleC5GbGFnc09mZnNldCkgOiBpbmRleDtcbiAgcmV0dXJuICgoY29udGV4dFthZGp1c3RlZEluZGV4XSBhcyBudW1iZXIpICYgU3R5bGluZ0ZsYWdzLlNhbml0aXplKSA9PSBTdHlsaW5nRmxhZ3MuU2FuaXRpemU7XG59XG5cbmZ1bmN0aW9uIHBvaW50ZXJzKGNvbmZpZ0ZsYWc6IG51bWJlciwgc3RhdGljSW5kZXg6IG51bWJlciwgZHluYW1pY0luZGV4OiBudW1iZXIpIHtcbiAgcmV0dXJuIChjb25maWdGbGFnICYgU3R5bGluZ0ZsYWdzLkJpdE1hc2spIHwgKHN0YXRpY0luZGV4IDw8IFN0eWxpbmdGbGFncy5CaXRDb3VudFNpemUpIHxcbiAgICAgIChkeW5hbWljSW5kZXggPDwgKFN0eWxpbmdJbmRleC5CaXRDb3VudFNpemUgKyBTdHlsaW5nRmxhZ3MuQml0Q291bnRTaXplKSk7XG59XG5cbmZ1bmN0aW9uIGdldEluaXRpYWxWYWx1ZShjb250ZXh0OiBTdHlsaW5nQ29udGV4dCwgZmxhZzogbnVtYmVyKTogc3RyaW5nfGJvb2xlYW58bnVsbCB7XG4gIGNvbnN0IGluZGV4ID0gZ2V0SW5pdGlhbEluZGV4KGZsYWcpO1xuICBjb25zdCBlbnRyeUlzQ2xhc3NCYXNlZCA9IGZsYWcgJiBTdHlsaW5nRmxhZ3MuQ2xhc3M7XG4gIGNvbnN0IGluaXRpYWxWYWx1ZXMgPSBlbnRyeUlzQ2xhc3NCYXNlZCA/IGNvbnRleHRbU3R5bGluZ0luZGV4LkluaXRpYWxDbGFzc1ZhbHVlc1Bvc2l0aW9uXSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHRbU3R5bGluZ0luZGV4LkluaXRpYWxTdHlsZVZhbHVlc1Bvc2l0aW9uXTtcbiAgcmV0dXJuIGluaXRpYWxWYWx1ZXNbaW5kZXhdO1xufVxuXG5mdW5jdGlvbiBnZXRJbml0aWFsSW5kZXgoZmxhZzogbnVtYmVyKTogbnVtYmVyIHtcbiAgcmV0dXJuIChmbGFnID4+IFN0eWxpbmdGbGFncy5CaXRDb3VudFNpemUpICYgU3R5bGluZ0luZGV4LkJpdE1hc2s7XG59XG5cbmZ1bmN0aW9uIGdldE11bHRpT3JTaW5nbGVJbmRleChmbGFnOiBudW1iZXIpOiBudW1iZXIge1xuICBjb25zdCBpbmRleCA9XG4gICAgICAoZmxhZyA+PiAoU3R5bGluZ0luZGV4LkJpdENvdW50U2l6ZSArIFN0eWxpbmdGbGFncy5CaXRDb3VudFNpemUpKSAmIFN0eWxpbmdJbmRleC5CaXRNYXNrO1xuICByZXR1cm4gaW5kZXggPj0gU3R5bGluZ0luZGV4LlNpbmdsZVN0eWxlc1N0YXJ0UG9zaXRpb24gPyBpbmRleCA6IC0xO1xufVxuXG5mdW5jdGlvbiBnZXRNdWx0aVN0YXJ0SW5kZXgoY29udGV4dDogU3R5bGluZ0NvbnRleHQpOiBudW1iZXIge1xuICByZXR1cm4gZ2V0TXVsdGlPclNpbmdsZUluZGV4KGNvbnRleHRbU3R5bGluZ0luZGV4Lk1hc3RlckZsYWdQb3NpdGlvbl0pIGFzIG51bWJlcjtcbn1cblxuZnVuY3Rpb24gc2V0UHJvcChjb250ZXh0OiBTdHlsaW5nQ29udGV4dCwgaW5kZXg6IG51bWJlciwgcHJvcDogc3RyaW5nKSB7XG4gIGNvbnRleHRbaW5kZXggKyBTdHlsaW5nSW5kZXguUHJvcGVydHlPZmZzZXRdID0gcHJvcDtcbn1cblxuZnVuY3Rpb24gc2V0VmFsdWUoY29udGV4dDogU3R5bGluZ0NvbnRleHQsIGluZGV4OiBudW1iZXIsIHZhbHVlOiBzdHJpbmcgfCBudWxsIHwgYm9vbGVhbikge1xuICBjb250ZXh0W2luZGV4ICsgU3R5bGluZ0luZGV4LlZhbHVlT2Zmc2V0XSA9IHZhbHVlO1xufVxuXG5mdW5jdGlvbiBoYXNQbGF5ZXJCdWlsZGVyQ2hhbmdlZChcbiAgICBjb250ZXh0OiBTdHlsaW5nQ29udGV4dCwgYnVpbGRlcjogQ2xhc3NBbmRTdHlsZVBsYXllckJ1aWxkZXI8YW55PnwgbnVsbCwgaW5kZXg6IG51bWJlcikge1xuICBjb25zdCBwbGF5ZXJDb250ZXh0ID0gY29udGV4dFtTdHlsaW5nSW5kZXguUGxheWVyQ29udGV4dF0gITtcbiAgaWYgKGJ1aWxkZXIpIHtcbiAgICBpZiAoIXBsYXllckNvbnRleHQgfHwgaW5kZXggPT09IDApIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfSBlbHNlIGlmICghcGxheWVyQ29udGV4dCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gcGxheWVyQ29udGV4dFtpbmRleF0gIT09IGJ1aWxkZXI7XG59XG5cbmZ1bmN0aW9uIHNldFBsYXllckJ1aWxkZXIoXG4gICAgY29udGV4dDogU3R5bGluZ0NvbnRleHQsIGJ1aWxkZXI6IENsYXNzQW5kU3R5bGVQbGF5ZXJCdWlsZGVyPGFueT58IG51bGwsXG4gICAgaW5zZXJ0aW9uSW5kZXg6IG51bWJlcik6IG51bWJlciB7XG4gIGxldCBwbGF5ZXJDb250ZXh0ID0gY29udGV4dFtTdHlsaW5nSW5kZXguUGxheWVyQ29udGV4dF0gfHwgYWxsb2NQbGF5ZXJDb250ZXh0KGNvbnRleHQpO1xuICBpZiAoaW5zZXJ0aW9uSW5kZXggPiAwKSB7XG4gICAgcGxheWVyQ29udGV4dFtpbnNlcnRpb25JbmRleF0gPSBidWlsZGVyO1xuICB9IGVsc2Uge1xuICAgIGluc2VydGlvbkluZGV4ID0gcGxheWVyQ29udGV4dFtQbGF5ZXJJbmRleC5Ob25CdWlsZGVyUGxheWVyc1N0YXJ0XTtcbiAgICBwbGF5ZXJDb250ZXh0LnNwbGljZShpbnNlcnRpb25JbmRleCwgMCwgYnVpbGRlciwgbnVsbCk7XG4gICAgcGxheWVyQ29udGV4dFtQbGF5ZXJJbmRleC5Ob25CdWlsZGVyUGxheWVyc1N0YXJ0XSArPVxuICAgICAgICBQbGF5ZXJJbmRleC5QbGF5ZXJBbmRQbGF5ZXJCdWlsZGVyc1R1cGxlU2l6ZTtcbiAgfVxuICByZXR1cm4gaW5zZXJ0aW9uSW5kZXg7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkaXJlY3RpdmVPd25lclBvaW50ZXJzKGRpcmVjdGl2ZUluZGV4OiBudW1iZXIsIHBsYXllckluZGV4OiBudW1iZXIpIHtcbiAgcmV0dXJuIChwbGF5ZXJJbmRleCA8PCBEaXJlY3RpdmVPd25lckFuZFBsYXllckJ1aWxkZXJJbmRleC5CaXRDb3VudFNpemUpIHwgZGlyZWN0aXZlSW5kZXg7XG59XG5cbmZ1bmN0aW9uIHNldFBsYXllckJ1aWxkZXJJbmRleChcbiAgICBjb250ZXh0OiBTdHlsaW5nQ29udGV4dCwgaW5kZXg6IG51bWJlciwgcGxheWVyQnVpbGRlckluZGV4OiBudW1iZXIsIGRpcmVjdGl2ZUluZGV4OiBudW1iZXIpIHtcbiAgY29uc3QgdmFsdWUgPSBkaXJlY3RpdmVPd25lclBvaW50ZXJzKGRpcmVjdGl2ZUluZGV4LCBwbGF5ZXJCdWlsZGVySW5kZXgpO1xuICBjb250ZXh0W2luZGV4ICsgU3R5bGluZ0luZGV4LlBsYXllckJ1aWxkZXJJbmRleE9mZnNldF0gPSB2YWx1ZTtcbn1cblxuZnVuY3Rpb24gZ2V0UGxheWVyQnVpbGRlckluZGV4KGNvbnRleHQ6IFN0eWxpbmdDb250ZXh0LCBpbmRleDogbnVtYmVyKTogbnVtYmVyIHtcbiAgY29uc3QgZmxhZyA9IGNvbnRleHRbaW5kZXggKyBTdHlsaW5nSW5kZXguUGxheWVyQnVpbGRlckluZGV4T2Zmc2V0XSBhcyBudW1iZXI7XG4gIGNvbnN0IHBsYXllckJ1aWxkZXJJbmRleCA9IChmbGFnID4+IERpcmVjdGl2ZU93bmVyQW5kUGxheWVyQnVpbGRlckluZGV4LkJpdENvdW50U2l6ZSkgJlxuICAgICAgRGlyZWN0aXZlT3duZXJBbmRQbGF5ZXJCdWlsZGVySW5kZXguQml0TWFzaztcbiAgcmV0dXJuIHBsYXllckJ1aWxkZXJJbmRleDtcbn1cblxuZnVuY3Rpb24gZ2V0UGxheWVyQnVpbGRlcihjb250ZXh0OiBTdHlsaW5nQ29udGV4dCwgaW5kZXg6IG51bWJlcik6IENsYXNzQW5kU3R5bGVQbGF5ZXJCdWlsZGVyPGFueT58XG4gICAgbnVsbCB7XG4gIGNvbnN0IHBsYXllckJ1aWxkZXJJbmRleCA9IGdldFBsYXllckJ1aWxkZXJJbmRleChjb250ZXh0LCBpbmRleCk7XG4gIGlmIChwbGF5ZXJCdWlsZGVySW5kZXgpIHtcbiAgICBjb25zdCBwbGF5ZXJDb250ZXh0ID0gY29udGV4dFtTdHlsaW5nSW5kZXguUGxheWVyQ29udGV4dF07XG4gICAgaWYgKHBsYXllckNvbnRleHQpIHtcbiAgICAgIHJldHVybiBwbGF5ZXJDb250ZXh0W3BsYXllckJ1aWxkZXJJbmRleF0gYXMgQ2xhc3NBbmRTdHlsZVBsYXllckJ1aWxkZXI8YW55PnwgbnVsbDtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIHNldEZsYWcoY29udGV4dDogU3R5bGluZ0NvbnRleHQsIGluZGV4OiBudW1iZXIsIGZsYWc6IG51bWJlcikge1xuICBjb25zdCBhZGp1c3RlZEluZGV4ID1cbiAgICAgIGluZGV4ID09PSBTdHlsaW5nSW5kZXguTWFzdGVyRmxhZ1Bvc2l0aW9uID8gaW5kZXggOiAoaW5kZXggKyBTdHlsaW5nSW5kZXguRmxhZ3NPZmZzZXQpO1xuICBjb250ZXh0W2FkanVzdGVkSW5kZXhdID0gZmxhZztcbn1cblxuZnVuY3Rpb24gZ2V0UG9pbnRlcnMoY29udGV4dDogU3R5bGluZ0NvbnRleHQsIGluZGV4OiBudW1iZXIpOiBudW1iZXIge1xuICBjb25zdCBhZGp1c3RlZEluZGV4ID1cbiAgICAgIGluZGV4ID09PSBTdHlsaW5nSW5kZXguTWFzdGVyRmxhZ1Bvc2l0aW9uID8gaW5kZXggOiAoaW5kZXggKyBTdHlsaW5nSW5kZXguRmxhZ3NPZmZzZXQpO1xuICByZXR1cm4gY29udGV4dFthZGp1c3RlZEluZGV4XSBhcyBudW1iZXI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRWYWx1ZShjb250ZXh0OiBTdHlsaW5nQ29udGV4dCwgaW5kZXg6IG51bWJlcik6IHN0cmluZ3xib29sZWFufG51bGwge1xuICByZXR1cm4gY29udGV4dFtpbmRleCArIFN0eWxpbmdJbmRleC5WYWx1ZU9mZnNldF0gYXMgc3RyaW5nIHwgYm9vbGVhbiB8IG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRQcm9wKGNvbnRleHQ6IFN0eWxpbmdDb250ZXh0LCBpbmRleDogbnVtYmVyKTogc3RyaW5nIHtcbiAgcmV0dXJuIGNvbnRleHRbaW5kZXggKyBTdHlsaW5nSW5kZXguUHJvcGVydHlPZmZzZXRdIGFzIHN0cmluZztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzQ29udGV4dERpcnR5KGNvbnRleHQ6IFN0eWxpbmdDb250ZXh0KTogYm9vbGVhbiB7XG4gIHJldHVybiBpc0RpcnR5KGNvbnRleHQsIFN0eWxpbmdJbmRleC5NYXN0ZXJGbGFnUG9zaXRpb24pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbGltaXRUb1NpbmdsZUNsYXNzZXMoY29udGV4dDogU3R5bGluZ0NvbnRleHQpIHtcbiAgcmV0dXJuIGNvbnRleHRbU3R5bGluZ0luZGV4Lk1hc3RlckZsYWdQb3NpdGlvbl0gJiBTdHlsaW5nRmxhZ3MuT25seVByb2Nlc3NTaW5nbGVDbGFzc2VzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2V0Q29udGV4dERpcnR5KGNvbnRleHQ6IFN0eWxpbmdDb250ZXh0LCBpc0RpcnR5WWVzOiBib29sZWFuKTogdm9pZCB7XG4gIHNldERpcnR5KGNvbnRleHQsIFN0eWxpbmdJbmRleC5NYXN0ZXJGbGFnUG9zaXRpb24sIGlzRGlydHlZZXMpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2V0Q29udGV4dFBsYXllcnNEaXJ0eShjb250ZXh0OiBTdHlsaW5nQ29udGV4dCwgaXNEaXJ0eVllczogYm9vbGVhbik6IHZvaWQge1xuICBpZiAoaXNEaXJ0eVllcykge1xuICAgIChjb250ZXh0W1N0eWxpbmdJbmRleC5NYXN0ZXJGbGFnUG9zaXRpb25dIGFzIG51bWJlcikgfD0gU3R5bGluZ0ZsYWdzLlBsYXllckJ1aWxkZXJzRGlydHk7XG4gIH0gZWxzZSB7XG4gICAgKGNvbnRleHRbU3R5bGluZ0luZGV4Lk1hc3RlckZsYWdQb3NpdGlvbl0gYXMgbnVtYmVyKSAmPSB+U3R5bGluZ0ZsYWdzLlBsYXllckJ1aWxkZXJzRGlydHk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZmluZEVudHJ5UG9zaXRpb25CeVByb3AoXG4gICAgY29udGV4dDogU3R5bGluZ0NvbnRleHQsIHByb3A6IHN0cmluZywgc3RhcnRJbmRleD86IG51bWJlcik6IG51bWJlciB7XG4gIGZvciAobGV0IGkgPSAoc3RhcnRJbmRleCB8fCAwKSArIFN0eWxpbmdJbmRleC5Qcm9wZXJ0eU9mZnNldDsgaSA8IGNvbnRleHQubGVuZ3RoO1xuICAgICAgIGkgKz0gU3R5bGluZ0luZGV4LlNpemUpIHtcbiAgICBjb25zdCB0aGlzUHJvcCA9IGNvbnRleHRbaV07XG4gICAgaWYgKHRoaXNQcm9wID09IHByb3ApIHtcbiAgICAgIHJldHVybiBpIC0gU3R5bGluZ0luZGV4LlByb3BlcnR5T2Zmc2V0O1xuICAgIH1cbiAgfVxuICByZXR1cm4gLTE7XG59XG5cbmZ1bmN0aW9uIHN3YXBNdWx0aUNvbnRleHRFbnRyaWVzKGNvbnRleHQ6IFN0eWxpbmdDb250ZXh0LCBpbmRleEE6IG51bWJlciwgaW5kZXhCOiBudW1iZXIpIHtcbiAgY29uc3QgdG1wVmFsdWUgPSBnZXRWYWx1ZShjb250ZXh0LCBpbmRleEEpO1xuICBjb25zdCB0bXBQcm9wID0gZ2V0UHJvcChjb250ZXh0LCBpbmRleEEpO1xuICBjb25zdCB0bXBGbGFnID0gZ2V0UG9pbnRlcnMoY29udGV4dCwgaW5kZXhBKTtcbiAgY29uc3QgdG1wUGxheWVyQnVpbGRlckluZGV4ID0gZ2V0UGxheWVyQnVpbGRlckluZGV4KGNvbnRleHQsIGluZGV4QSk7XG5cbiAgbGV0IGZsYWdBID0gdG1wRmxhZztcbiAgbGV0IGZsYWdCID0gZ2V0UG9pbnRlcnMoY29udGV4dCwgaW5kZXhCKTtcblxuICBjb25zdCBzaW5nbGVJbmRleEEgPSBnZXRNdWx0aU9yU2luZ2xlSW5kZXgoZmxhZ0EpO1xuICBpZiAoc2luZ2xlSW5kZXhBID49IDApIHtcbiAgICBjb25zdCBfZmxhZyA9IGdldFBvaW50ZXJzKGNvbnRleHQsIHNpbmdsZUluZGV4QSk7XG4gICAgY29uc3QgX2luaXRpYWwgPSBnZXRJbml0aWFsSW5kZXgoX2ZsYWcpO1xuICAgIHNldEZsYWcoY29udGV4dCwgc2luZ2xlSW5kZXhBLCBwb2ludGVycyhfZmxhZywgX2luaXRpYWwsIGluZGV4QikpO1xuICB9XG5cbiAgY29uc3Qgc2luZ2xlSW5kZXhCID0gZ2V0TXVsdGlPclNpbmdsZUluZGV4KGZsYWdCKTtcbiAgaWYgKHNpbmdsZUluZGV4QiA+PSAwKSB7XG4gICAgY29uc3QgX2ZsYWcgPSBnZXRQb2ludGVycyhjb250ZXh0LCBzaW5nbGVJbmRleEIpO1xuICAgIGNvbnN0IF9pbml0aWFsID0gZ2V0SW5pdGlhbEluZGV4KF9mbGFnKTtcbiAgICBzZXRGbGFnKGNvbnRleHQsIHNpbmdsZUluZGV4QiwgcG9pbnRlcnMoX2ZsYWcsIF9pbml0aWFsLCBpbmRleEEpKTtcbiAgfVxuXG4gIHNldFZhbHVlKGNvbnRleHQsIGluZGV4QSwgZ2V0VmFsdWUoY29udGV4dCwgaW5kZXhCKSk7XG4gIHNldFByb3AoY29udGV4dCwgaW5kZXhBLCBnZXRQcm9wKGNvbnRleHQsIGluZGV4QikpO1xuICBzZXRGbGFnKGNvbnRleHQsIGluZGV4QSwgZ2V0UG9pbnRlcnMoY29udGV4dCwgaW5kZXhCKSk7XG4gIGNvbnN0IHBsYXllckluZGV4QSA9IGdldFBsYXllckJ1aWxkZXJJbmRleChjb250ZXh0LCBpbmRleEIpO1xuICBjb25zdCBkaXJlY3RpdmVJbmRleEEgPSAwO1xuICBzZXRQbGF5ZXJCdWlsZGVySW5kZXgoY29udGV4dCwgaW5kZXhBLCBwbGF5ZXJJbmRleEEsIGRpcmVjdGl2ZUluZGV4QSk7XG5cbiAgc2V0VmFsdWUoY29udGV4dCwgaW5kZXhCLCB0bXBWYWx1ZSk7XG4gIHNldFByb3AoY29udGV4dCwgaW5kZXhCLCB0bXBQcm9wKTtcbiAgc2V0RmxhZyhjb250ZXh0LCBpbmRleEIsIHRtcEZsYWcpO1xuICBzZXRQbGF5ZXJCdWlsZGVySW5kZXgoY29udGV4dCwgaW5kZXhCLCB0bXBQbGF5ZXJCdWlsZGVySW5kZXgsIGRpcmVjdGl2ZUluZGV4QSk7XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVNpbmdsZVBvaW50ZXJWYWx1ZXMoY29udGV4dDogU3R5bGluZ0NvbnRleHQsIGluZGV4U3RhcnRQb3NpdGlvbjogbnVtYmVyKSB7XG4gIGZvciAobGV0IGkgPSBpbmRleFN0YXJ0UG9zaXRpb247IGkgPCBjb250ZXh0Lmxlbmd0aDsgaSArPSBTdHlsaW5nSW5kZXguU2l6ZSkge1xuICAgIGNvbnN0IG11bHRpRmxhZyA9IGdldFBvaW50ZXJzKGNvbnRleHQsIGkpO1xuICAgIGNvbnN0IHNpbmdsZUluZGV4ID0gZ2V0TXVsdGlPclNpbmdsZUluZGV4KG11bHRpRmxhZyk7XG4gICAgaWYgKHNpbmdsZUluZGV4ID4gMCkge1xuICAgICAgY29uc3Qgc2luZ2xlRmxhZyA9IGdldFBvaW50ZXJzKGNvbnRleHQsIHNpbmdsZUluZGV4KTtcbiAgICAgIGNvbnN0IGluaXRpYWxJbmRleEZvclNpbmdsZSA9IGdldEluaXRpYWxJbmRleChzaW5nbGVGbGFnKTtcbiAgICAgIGNvbnN0IGZsYWdWYWx1ZSA9IChpc0RpcnR5KGNvbnRleHQsIHNpbmdsZUluZGV4KSA/IFN0eWxpbmdGbGFncy5EaXJ0eSA6IFN0eWxpbmdGbGFncy5Ob25lKSB8XG4gICAgICAgICAgKGlzQ2xhc3NCYXNlZFZhbHVlKGNvbnRleHQsIHNpbmdsZUluZGV4KSA/IFN0eWxpbmdGbGFncy5DbGFzcyA6IFN0eWxpbmdGbGFncy5Ob25lKSB8XG4gICAgICAgICAgKGlzU2FuaXRpemFibGUoY29udGV4dCwgc2luZ2xlSW5kZXgpID8gU3R5bGluZ0ZsYWdzLlNhbml0aXplIDogU3R5bGluZ0ZsYWdzLk5vbmUpO1xuICAgICAgY29uc3QgdXBkYXRlZEZsYWcgPSBwb2ludGVycyhmbGFnVmFsdWUsIGluaXRpYWxJbmRleEZvclNpbmdsZSwgaSk7XG4gICAgICBzZXRGbGFnKGNvbnRleHQsIHNpbmdsZUluZGV4LCB1cGRhdGVkRmxhZyk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGluc2VydE5ld011bHRpUHJvcGVydHkoXG4gICAgY29udGV4dDogU3R5bGluZ0NvbnRleHQsIGluZGV4OiBudW1iZXIsIGNsYXNzQmFzZWQ6IGJvb2xlYW4sIG5hbWU6IHN0cmluZywgZmxhZzogbnVtYmVyLFxuICAgIHZhbHVlOiBzdHJpbmcgfCBib29sZWFuLCBkaXJlY3RpdmVJbmRleDogbnVtYmVyLCBwbGF5ZXJJbmRleDogbnVtYmVyKTogdm9pZCB7XG4gIGNvbnN0IGRvU2hpZnQgPSBpbmRleCA8IGNvbnRleHQubGVuZ3RoO1xuXG4gIC8vIHByb3AgZG9lcyBub3QgZXhpc3QgaW4gdGhlIGxpc3QsIGFkZCBpdCBpblxuICBjb250ZXh0LnNwbGljZShcbiAgICAgIGluZGV4LCAwLCBmbGFnIHwgU3R5bGluZ0ZsYWdzLkRpcnR5IHwgKGNsYXNzQmFzZWQgPyBTdHlsaW5nRmxhZ3MuQ2xhc3MgOiBTdHlsaW5nRmxhZ3MuTm9uZSksXG4gICAgICBuYW1lLCB2YWx1ZSwgMCk7XG4gIHNldFBsYXllckJ1aWxkZXJJbmRleChjb250ZXh0LCBpbmRleCwgcGxheWVySW5kZXgsIGRpcmVjdGl2ZUluZGV4KTtcblxuICBpZiAoZG9TaGlmdCkge1xuICAgIC8vIGJlY2F1c2UgdGhlIHZhbHVlIHdhcyBpbnNlcnRlZCBtaWR3YXkgaW50byB0aGUgYXJyYXkgdGhlbiB3ZVxuICAgIC8vIG5lZWQgdG8gdXBkYXRlIGFsbCB0aGUgc2hpZnRlZCBtdWx0aSB2YWx1ZXMnIHNpbmdsZSB2YWx1ZVxuICAgIC8vIHBvaW50ZXJzIHRvIHBvaW50IHRvIHRoZSBuZXdseSBzaGlmdGVkIGxvY2F0aW9uXG4gICAgdXBkYXRlU2luZ2xlUG9pbnRlclZhbHVlcyhjb250ZXh0LCBpbmRleCArIFN0eWxpbmdJbmRleC5TaXplKTtcbiAgfVxufVxuXG5mdW5jdGlvbiB2YWx1ZUV4aXN0cyh2YWx1ZTogc3RyaW5nIHwgbnVsbCB8IGJvb2xlYW4sIGlzQ2xhc3NCYXNlZD86IGJvb2xlYW4pIHtcbiAgaWYgKGlzQ2xhc3NCYXNlZCkge1xuICAgIHJldHVybiB2YWx1ZSA/IHRydWUgOiBmYWxzZTtcbiAgfVxuICByZXR1cm4gdmFsdWUgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIHByZXBhcmVJbml0aWFsRmxhZyhcbiAgICBjb250ZXh0OiBTdHlsaW5nQ29udGV4dCwgcHJvcDogc3RyaW5nLCBlbnRyeUlzQ2xhc3NCYXNlZDogYm9vbGVhbixcbiAgICBzYW5pdGl6ZXI/OiBTdHlsZVNhbml0aXplRm4gfCBudWxsKSB7XG4gIGxldCBmbGFnID0gKHNhbml0aXplciAmJiBzYW5pdGl6ZXIocHJvcCkpID8gU3R5bGluZ0ZsYWdzLlNhbml0aXplIDogU3R5bGluZ0ZsYWdzLk5vbmU7XG5cbiAgbGV0IGluaXRpYWxJbmRleDogbnVtYmVyO1xuICBpZiAoZW50cnlJc0NsYXNzQmFzZWQpIHtcbiAgICBmbGFnIHw9IFN0eWxpbmdGbGFncy5DbGFzcztcbiAgICBpbml0aWFsSW5kZXggPVxuICAgICAgICBnZXRJbml0aWFsU3R5bGluZ1ZhbHVlc0luZGV4T2YoY29udGV4dFtTdHlsaW5nSW5kZXguSW5pdGlhbENsYXNzVmFsdWVzUG9zaXRpb25dLCBwcm9wKTtcbiAgfSBlbHNlIHtcbiAgICBpbml0aWFsSW5kZXggPVxuICAgICAgICBnZXRJbml0aWFsU3R5bGluZ1ZhbHVlc0luZGV4T2YoY29udGV4dFtTdHlsaW5nSW5kZXguSW5pdGlhbFN0eWxlVmFsdWVzUG9zaXRpb25dLCBwcm9wKTtcbiAgfVxuXG4gIGluaXRpYWxJbmRleCA9IGluaXRpYWxJbmRleCA+IDAgPyAoaW5pdGlhbEluZGV4ICsgSW5pdGlhbFN0eWxpbmdWYWx1ZXNJbmRleC5WYWx1ZU9mZnNldCkgOiAwO1xuICByZXR1cm4gcG9pbnRlcnMoZmxhZywgaW5pdGlhbEluZGV4LCAwKTtcbn1cblxuZnVuY3Rpb24gaGFzVmFsdWVDaGFuZ2VkKFxuICAgIGZsYWc6IG51bWJlciwgYTogc3RyaW5nIHwgYm9vbGVhbiB8IG51bGwsIGI6IHN0cmluZyB8IGJvb2xlYW4gfCBudWxsKTogYm9vbGVhbiB7XG4gIGNvbnN0IGlzQ2xhc3NCYXNlZCA9IGZsYWcgJiBTdHlsaW5nRmxhZ3MuQ2xhc3M7XG4gIGNvbnN0IGhhc1ZhbHVlcyA9IGEgJiYgYjtcbiAgY29uc3QgdXNlc1Nhbml0aXplciA9IGZsYWcgJiBTdHlsaW5nRmxhZ3MuU2FuaXRpemU7XG4gIC8vIHRoZSB0b1N0cmluZygpIGNvbXBhcmlzb24gZW5zdXJlcyB0aGF0IGEgdmFsdWUgaXMgY2hlY2tlZFxuICAvLyAuLi4gb3RoZXJ3aXNlIChkdXJpbmcgc2FuaXRpemF0aW9uIGJ5cGFzc2luZykgdGhlID09PSBjb21wYXJzaW9uXG4gIC8vIHdvdWxkIGZhaWwgc2luY2UgYSBuZXcgU3RyaW5nKCkgaW5zdGFuY2UgaXMgY3JlYXRlZFxuICBpZiAoIWlzQ2xhc3NCYXNlZCAmJiBoYXNWYWx1ZXMgJiYgdXNlc1Nhbml0aXplcikge1xuICAgIC8vIHdlIGtub3cgZm9yIHN1cmUgd2UncmUgZGVhbGluZyB3aXRoIHN0cmluZ3MgYXQgdGhpcyBwb2ludFxuICAgIHJldHVybiAoYSBhcyBzdHJpbmcpLnRvU3RyaW5nKCkgIT09IChiIGFzIHN0cmluZykudG9TdHJpbmcoKTtcbiAgfVxuXG4gIC8vIGV2ZXJ5dGhpbmcgZWxzZSBpcyBzYWZlIHRvIGNoZWNrIHdpdGggYSBub3JtYWwgZXF1YWxpdHkgY2hlY2tcbiAgcmV0dXJuIGEgIT09IGI7XG59XG5cbmV4cG9ydCBjbGFzcyBDbGFzc0FuZFN0eWxlUGxheWVyQnVpbGRlcjxUPiBpbXBsZW1lbnRzIFBsYXllckJ1aWxkZXIge1xuICBwcml2YXRlIF92YWx1ZXM6IHtba2V5OiBzdHJpbmddOiBzdHJpbmcgfCBudWxsfSA9IHt9O1xuICBwcml2YXRlIF9kaXJ0eSA9IGZhbHNlO1xuICBwcml2YXRlIF9mYWN0b3J5OiBCb3VuZFBsYXllckZhY3Rvcnk8VD47XG5cbiAgY29uc3RydWN0b3IoZmFjdG9yeTogUGxheWVyRmFjdG9yeSwgcHJpdmF0ZSBfZWxlbWVudDogSFRNTEVsZW1lbnQsIHByaXZhdGUgX3R5cGU6IEJpbmRpbmdUeXBlKSB7XG4gICAgdGhpcy5fZmFjdG9yeSA9IGZhY3RvcnkgYXMgYW55O1xuICB9XG5cbiAgc2V0VmFsdWUocHJvcDogc3RyaW5nLCB2YWx1ZTogYW55KSB7XG4gICAgaWYgKHRoaXMuX3ZhbHVlc1twcm9wXSAhPT0gdmFsdWUpIHtcbiAgICAgIHRoaXMuX3ZhbHVlc1twcm9wXSA9IHZhbHVlO1xuICAgICAgdGhpcy5fZGlydHkgPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIGJ1aWxkUGxheWVyKGN1cnJlbnRQbGF5ZXI6IFBsYXllcnxudWxsLCBpc0ZpcnN0UmVuZGVyOiBib29sZWFuKTogUGxheWVyfHVuZGVmaW5lZHxudWxsIHtcbiAgICAvLyBpZiBubyB2YWx1ZXMgaGF2ZSBiZWVuIHNldCBoZXJlIHRoZW4gdGhpcyBtZWFucyB0aGUgYmluZGluZyBkaWRuJ3RcbiAgICAvLyBjaGFuZ2UgYW5kIHRoZXJlZm9yZSB0aGUgYmluZGluZyB2YWx1ZXMgd2VyZSBub3QgdXBkYXRlZCB0aHJvdWdoXG4gICAgLy8gYHNldFZhbHVlYCB3aGljaCBtZWFucyBubyBuZXcgcGxheWVyIHdpbGwgYmUgcHJvdmlkZWQuXG4gICAgaWYgKHRoaXMuX2RpcnR5KSB7XG4gICAgICBjb25zdCBwbGF5ZXIgPSB0aGlzLl9mYWN0b3J5LmZuKFxuICAgICAgICAgIHRoaXMuX2VsZW1lbnQsIHRoaXMuX3R5cGUsIHRoaXMuX3ZhbHVlcyAhLCBpc0ZpcnN0UmVuZGVyLCBjdXJyZW50UGxheWVyIHx8IG51bGwpO1xuICAgICAgdGhpcy5fdmFsdWVzID0ge307XG4gICAgICB0aGlzLl9kaXJ0eSA9IGZhbHNlO1xuICAgICAgcmV0dXJuIHBsYXllcjtcbiAgICB9XG5cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG59XG5cbi8qKlxuICogVXNlZCB0byBwcm92aWRlIGEgc3VtbWFyeSBvZiB0aGUgc3RhdGUgb2YgdGhlIHN0eWxpbmcgY29udGV4dC5cbiAqXG4gKiBUaGlzIGlzIGFuIGludGVybmFsIGludGVyZmFjZSB0aGF0IGlzIG9ubHkgdXNlZCBpbnNpZGUgb2YgdGVzdCB0b29saW5nIHRvXG4gKiBoZWxwIHN1bW1hcml6ZSB3aGF0J3MgZ29pbmcgb24gd2l0aGluIHRoZSBzdHlsaW5nIGNvbnRleHQuIE5vbmUgb2YgdGhpcyBjb2RlXG4gKiBpcyBkZXNpZ25lZCB0byBiZSBleHBvcnRlZCBwdWJsaWNseSBhbmQgd2lsbCwgdGhlcmVmb3JlLCBiZSB0cmVlLXNoYWtlbiBhd2F5XG4gKiBkdXJpbmcgcnVudGltZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBMb2dTdW1tYXJ5IHtcbiAgbmFtZTogc3RyaW5nOyAgICAgICAgICAvL1xuICBzdGF0aWNJbmRleDogbnVtYmVyOyAgIC8vXG4gIGR5bmFtaWNJbmRleDogbnVtYmVyOyAgLy9cbiAgdmFsdWU6IG51bWJlcjsgICAgICAgICAvL1xuICBmbGFnczoge1xuICAgIGRpcnR5OiBib29sZWFuOyAgICAgICAgICAgICAgICAgICAgIC8vXG4gICAgY2xhc3M6IGJvb2xlYW47ICAgICAgICAgICAgICAgICAgICAgLy9cbiAgICBzYW5pdGl6ZTogYm9vbGVhbjsgICAgICAgICAgICAgICAgICAvL1xuICAgIHBsYXllckJ1aWxkZXJzRGlydHk6IGJvb2xlYW47ICAgICAgIC8vXG4gICAgb25seVByb2Nlc3NTaW5nbGVDbGFzc2VzOiBib29sZWFuOyAgLy9cbiAgICBiaW5kaW5nQWxsb2NhdGlvbkxvY2tlZDogYm9vbGVhbjsgICAvL1xuICB9O1xufVxuXG4vKipcbiAqIFRoaXMgZnVuY3Rpb24gaXMgbm90IGRlc2lnbmVkIHRvIGJlIHVzZWQgaW4gcHJvZHVjdGlvbi5cbiAqIEl0IGlzIGEgdXRpbGl0eSB0b29sIGZvciBkZWJ1Z2dpbmcgYW5kIHRlc3RpbmcgYW5kIGl0XG4gKiB3aWxsIGF1dG9tYXRpY2FsbHkgYmUgdHJlZS1zaGFrZW4gYXdheSBkdXJpbmcgcHJvZHVjdGlvbi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlQ29uZmlnU3VtbWFyeShzb3VyY2U6IG51bWJlcik6IExvZ1N1bW1hcnk7XG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVDb25maWdTdW1tYXJ5KHNvdXJjZTogU3R5bGluZ0NvbnRleHQpOiBMb2dTdW1tYXJ5O1xuZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlQ29uZmlnU3VtbWFyeShzb3VyY2U6IFN0eWxpbmdDb250ZXh0LCBpbmRleDogbnVtYmVyKTogTG9nU3VtbWFyeTtcbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZUNvbmZpZ1N1bW1hcnkoc291cmNlOiBudW1iZXIgfCBTdHlsaW5nQ29udGV4dCwgaW5kZXg/OiBudW1iZXIpOiBMb2dTdW1tYXJ5IHtcbiAgbGV0IGZsYWcsIG5hbWUgPSAnY29uZmlnIHZhbHVlIGZvciAnO1xuICBpZiAoQXJyYXkuaXNBcnJheShzb3VyY2UpKSB7XG4gICAgaWYgKGluZGV4KSB7XG4gICAgICBuYW1lICs9ICdpbmRleDogJyArIGluZGV4O1xuICAgIH0gZWxzZSB7XG4gICAgICBuYW1lICs9ICdtYXN0ZXIgY29uZmlnJztcbiAgICB9XG4gICAgaW5kZXggPSBpbmRleCB8fCBTdHlsaW5nSW5kZXguTWFzdGVyRmxhZ1Bvc2l0aW9uO1xuICAgIGZsYWcgPSBzb3VyY2VbaW5kZXhdIGFzIG51bWJlcjtcbiAgfSBlbHNlIHtcbiAgICBmbGFnID0gc291cmNlO1xuICAgIG5hbWUgKz0gJ2luZGV4OiAnICsgZmxhZztcbiAgfVxuICBjb25zdCBkeW5hbWljSW5kZXggPSBnZXRNdWx0aU9yU2luZ2xlSW5kZXgoZmxhZyk7XG4gIGNvbnN0IHN0YXRpY0luZGV4ID0gZ2V0SW5pdGlhbEluZGV4KGZsYWcpO1xuICByZXR1cm4ge1xuICAgIG5hbWUsXG4gICAgc3RhdGljSW5kZXgsXG4gICAgZHluYW1pY0luZGV4LFxuICAgIHZhbHVlOiBmbGFnLFxuICAgIGZsYWdzOiB7XG4gICAgICBkaXJ0eTogZmxhZyAmIFN0eWxpbmdGbGFncy5EaXJ0eSA/IHRydWUgOiBmYWxzZSxcbiAgICAgIGNsYXNzOiBmbGFnICYgU3R5bGluZ0ZsYWdzLkNsYXNzID8gdHJ1ZSA6IGZhbHNlLFxuICAgICAgc2FuaXRpemU6IGZsYWcgJiBTdHlsaW5nRmxhZ3MuU2FuaXRpemUgPyB0cnVlIDogZmFsc2UsXG4gICAgICBwbGF5ZXJCdWlsZGVyc0RpcnR5OiBmbGFnICYgU3R5bGluZ0ZsYWdzLlBsYXllckJ1aWxkZXJzRGlydHkgPyB0cnVlIDogZmFsc2UsXG4gICAgICBvbmx5UHJvY2Vzc1NpbmdsZUNsYXNzZXM6IGZsYWcgJiBTdHlsaW5nRmxhZ3MuT25seVByb2Nlc3NTaW5nbGVDbGFzc2VzID8gdHJ1ZSA6IGZhbHNlLFxuICAgICAgYmluZGluZ0FsbG9jYXRpb25Mb2NrZWQ6IGZsYWcgJiBTdHlsaW5nRmxhZ3MuQmluZGluZ0FsbG9jYXRpb25Mb2NrZWQgPyB0cnVlIDogZmFsc2UsXG4gICAgfVxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0RGlyZWN0aXZlSW5kZXhGcm9tRW50cnkoY29udGV4dDogU3R5bGluZ0NvbnRleHQsIGluZGV4OiBudW1iZXIpIHtcbiAgY29uc3QgdmFsdWUgPSBjb250ZXh0W2luZGV4ICsgU3R5bGluZ0luZGV4LlBsYXllckJ1aWxkZXJJbmRleE9mZnNldF0gYXMgbnVtYmVyO1xuICByZXR1cm4gdmFsdWUgJiBEaXJlY3RpdmVPd25lckFuZFBsYXllckJ1aWxkZXJJbmRleC5CaXRNYXNrO1xufVxuXG5mdW5jdGlvbiBnZXREaXJlY3RpdmVJbmRleEZyb21SZWdpc3RyeShjb250ZXh0OiBTdHlsaW5nQ29udGV4dCwgZGlyZWN0aXZlOiBhbnkpIHtcbiAgY29uc3QgaW5kZXggPVxuICAgICAgZ2V0RGlyZWN0aXZlUmVnaXN0cnlWYWx1ZXNJbmRleE9mKGNvbnRleHRbU3R5bGluZ0luZGV4LkRpcmVjdGl2ZVJlZ2lzdHJ5UG9zaXRpb25dLCBkaXJlY3RpdmUpO1xuICBuZ0Rldk1vZGUgJiZcbiAgICAgIGFzc2VydE5vdEVxdWFsKFxuICAgICAgICAgIGluZGV4LCAtMSxcbiAgICAgICAgICBgVGhlIHByb3ZpZGVkIGRpcmVjdGl2ZSAke2RpcmVjdGl2ZX0gaGFzIG5vdCBiZWVuIGFsbG9jYXRlZCB0byB0aGUgZWxlbWVudFxcJ3Mgc3R5bGUvY2xhc3MgYmluZGluZ3NgKTtcbiAgcmV0dXJuIGluZGV4ID4gMCA/IGluZGV4IC8gRGlyZWN0aXZlUmVnaXN0cnlWYWx1ZXNJbmRleC5TaXplIDogMDtcbiAgLy8gcmV0dXJuIGluZGV4IC8gRGlyZWN0aXZlUmVnaXN0cnlWYWx1ZXNJbmRleC5TaXplO1xufVxuXG5mdW5jdGlvbiBnZXREaXJlY3RpdmVSZWdpc3RyeVZhbHVlc0luZGV4T2YoXG4gICAgZGlyZWN0aXZlczogRGlyZWN0aXZlUmVnaXN0cnlWYWx1ZXMsIGRpcmVjdGl2ZToge30pOiBudW1iZXIge1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGRpcmVjdGl2ZXMubGVuZ3RoOyBpICs9IERpcmVjdGl2ZVJlZ2lzdHJ5VmFsdWVzSW5kZXguU2l6ZSkge1xuICAgIGlmIChkaXJlY3RpdmVzW2ldID09PSBkaXJlY3RpdmUpIHtcbiAgICAgIHJldHVybiBpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gLTE7XG59XG5cbmZ1bmN0aW9uIGdldEluaXRpYWxTdHlsaW5nVmFsdWVzSW5kZXhPZihrZXlWYWx1ZXM6IEluaXRpYWxTdHlsaW5nVmFsdWVzLCBrZXk6IHN0cmluZyk6IG51bWJlciB7XG4gIGZvciAobGV0IGkgPSBJbml0aWFsU3R5bGluZ1ZhbHVlc0luZGV4LktleVZhbHVlU3RhcnRQb3NpdGlvbjsgaSA8IGtleVZhbHVlcy5sZW5ndGg7XG4gICAgICAgaSArPSBJbml0aWFsU3R5bGluZ1ZhbHVlc0luZGV4LlNpemUpIHtcbiAgICBpZiAoa2V5VmFsdWVzW2ldID09PSBrZXkpIHJldHVybiBpO1xuICB9XG4gIHJldHVybiAtMTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvbXBhcmVMb2dTdW1tYXJpZXMoYTogTG9nU3VtbWFyeSwgYjogTG9nU3VtbWFyeSkge1xuICBjb25zdCBsb2c6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IGRpZmZzOiBbc3RyaW5nLCBhbnksIGFueV1bXSA9IFtdO1xuICBkaWZmU3VtbWFyeVZhbHVlcyhkaWZmcywgJ3N0YXRpY0luZGV4JywgJ3N0YXRpY0luZGV4JywgYSwgYik7XG4gIGRpZmZTdW1tYXJ5VmFsdWVzKGRpZmZzLCAnZHluYW1pY0luZGV4JywgJ2R5bmFtaWNJbmRleCcsIGEsIGIpO1xuICBPYmplY3Qua2V5cyhhLmZsYWdzKS5mb3JFYWNoKFxuICAgICAgbmFtZSA9PiB7IGRpZmZTdW1tYXJ5VmFsdWVzKGRpZmZzLCAnZmxhZ3MuJyArIG5hbWUsIG5hbWUsIGEuZmxhZ3MsIGIuZmxhZ3MpOyB9KTtcblxuICBpZiAoZGlmZnMubGVuZ3RoKSB7XG4gICAgbG9nLnB1c2goJ0xvZyBTdW1tYXJpZXMgZm9yOicpO1xuICAgIGxvZy5wdXNoKCcgIEE6ICcgKyBhLm5hbWUpO1xuICAgIGxvZy5wdXNoKCcgIEI6ICcgKyBiLm5hbWUpO1xuICAgIGxvZy5wdXNoKCdcXG4gIERpZmZlciBpbiB0aGUgZm9sbG93aW5nIHdheSAoQSAhPT0gQik6Jyk7XG4gICAgZGlmZnMuZm9yRWFjaChyZXN1bHQgPT4ge1xuICAgICAgY29uc3QgW25hbWUsIGFWYWwsIGJWYWxdID0gcmVzdWx0O1xuICAgICAgbG9nLnB1c2goJyAgICA9PiAnICsgbmFtZSk7XG4gICAgICBsb2cucHVzaCgnICAgID0+ICcgKyBhVmFsICsgJyAhPT0gJyArIGJWYWwgKyAnXFxuJyk7XG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4gbG9nO1xufVxuXG5mdW5jdGlvbiBkaWZmU3VtbWFyeVZhbHVlcyhyZXN1bHQ6IGFueVtdLCBuYW1lOiBzdHJpbmcsIHByb3A6IHN0cmluZywgYTogYW55LCBiOiBhbnkpIHtcbiAgY29uc3QgYVZhbCA9IGFbcHJvcF07XG4gIGNvbnN0IGJWYWwgPSBiW3Byb3BdO1xuICBpZiAoYVZhbCAhPT0gYlZhbCkge1xuICAgIHJlc3VsdC5wdXNoKFtuYW1lLCBhVmFsLCBiVmFsXSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0U2luZ2xlUHJvcEluZGV4VmFsdWUoXG4gICAgY29udGV4dDogU3R5bGluZ0NvbnRleHQsIGRpcmVjdGl2ZUluZGV4OiBudW1iZXIsIG9mZnNldDogbnVtYmVyLCBpc0NsYXNzQmFzZWQ6IGJvb2xlYW4pIHtcbiAgY29uc3Qgc2luZ2xlUHJvcE9mZnNldFJlZ2lzdHJ5SW5kZXggPVxuICAgICAgY29udGV4dFtTdHlsaW5nSW5kZXguRGlyZWN0aXZlUmVnaXN0cnlQb3NpdGlvbl1cbiAgICAgICAgICAgICBbKGRpcmVjdGl2ZUluZGV4ICogRGlyZWN0aXZlUmVnaXN0cnlWYWx1ZXNJbmRleC5TaXplKSArXG4gICAgICAgICAgICAgIERpcmVjdGl2ZVJlZ2lzdHJ5VmFsdWVzSW5kZXguU2luZ2xlUHJvcFZhbHVlc0luZGV4T2Zmc2V0XSBhcyBudW1iZXI7XG4gIGNvbnN0IG9mZnNldHMgPSBjb250ZXh0W1N0eWxpbmdJbmRleC5TaW5nbGVQcm9wT2Zmc2V0UG9zaXRpb25zXTtcbiAgY29uc3QgaW5kZXhGb3JPZmZzZXQgPSBzaW5nbGVQcm9wT2Zmc2V0UmVnaXN0cnlJbmRleCArXG4gICAgICBTaW5nbGVQcm9wT2Zmc2V0VmFsdWVzSW5kZXguVmFsdWVTdGFydFBvc2l0aW9uICtcbiAgICAgIChpc0NsYXNzQmFzZWQgP1xuICAgICAgICAgICBvZmZzZXRzXG4gICAgICAgICAgICAgICBbc2luZ2xlUHJvcE9mZnNldFJlZ2lzdHJ5SW5kZXggKyBTaW5nbGVQcm9wT2Zmc2V0VmFsdWVzSW5kZXguU3R5bGVzQ291bnRQb3NpdGlvbl0gOlxuICAgICAgICAgICAwKSArXG4gICAgICBvZmZzZXQ7XG4gIHJldHVybiBvZmZzZXRzW2luZGV4Rm9yT2Zmc2V0XTtcbn1cblxuZnVuY3Rpb24gZ2V0U3R5bGVTYW5pdGl6ZXIoY29udGV4dDogU3R5bGluZ0NvbnRleHQsIGRpcmVjdGl2ZUluZGV4OiBudW1iZXIpOiBTdHlsZVNhbml0aXplRm58bnVsbCB7XG4gIGNvbnN0IGRpcnMgPSBjb250ZXh0W1N0eWxpbmdJbmRleC5EaXJlY3RpdmVSZWdpc3RyeVBvc2l0aW9uXTtcbiAgY29uc3QgdmFsdWUgPSBkaXJzXG4gICAgICAgICAgICAgICAgICAgIFtkaXJlY3RpdmVJbmRleCAqIERpcmVjdGl2ZVJlZ2lzdHJ5VmFsdWVzSW5kZXguU2l6ZSArXG4gICAgICAgICAgICAgICAgICAgICBEaXJlY3RpdmVSZWdpc3RyeVZhbHVlc0luZGV4LlN0eWxlU2FuaXRpemVyT2Zmc2V0XSB8fFxuICAgICAgZGlyc1tEaXJlY3RpdmVSZWdpc3RyeVZhbHVlc0luZGV4LlN0eWxlU2FuaXRpemVyT2Zmc2V0XSB8fCBudWxsO1xuICByZXR1cm4gdmFsdWUgYXMgU3R5bGVTYW5pdGl6ZUZuIHwgbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNEaXJlY3RpdmVEaXJ0eShjb250ZXh0OiBTdHlsaW5nQ29udGV4dCwgZGlyZWN0aXZlSW5kZXg6IG51bWJlcik6IGJvb2xlYW4ge1xuICBjb25zdCBkaXJzID0gY29udGV4dFtTdHlsaW5nSW5kZXguRGlyZWN0aXZlUmVnaXN0cnlQb3NpdGlvbl07XG4gIHJldHVybiBkaXJzXG4gICAgICBbZGlyZWN0aXZlSW5kZXggKiBEaXJlY3RpdmVSZWdpc3RyeVZhbHVlc0luZGV4LlNpemUgK1xuICAgICAgIERpcmVjdGl2ZVJlZ2lzdHJ5VmFsdWVzSW5kZXguRGlydHlGbGFnT2Zmc2V0XSBhcyBib29sZWFuO1xufVxuXG5mdW5jdGlvbiBzZXREaXJlY3RpdmVEaXJ0eShcbiAgICBjb250ZXh0OiBTdHlsaW5nQ29udGV4dCwgZGlyZWN0aXZlSW5kZXg6IG51bWJlciwgZGlydHlZZXM6IGJvb2xlYW4pOiB2b2lkIHtcbiAgY29uc3QgZGlycyA9IGNvbnRleHRbU3R5bGluZ0luZGV4LkRpcmVjdGl2ZVJlZ2lzdHJ5UG9zaXRpb25dO1xuICBkaXJzXG4gICAgICBbZGlyZWN0aXZlSW5kZXggKiBEaXJlY3RpdmVSZWdpc3RyeVZhbHVlc0luZGV4LlNpemUgK1xuICAgICAgIERpcmVjdGl2ZVJlZ2lzdHJ5VmFsdWVzSW5kZXguRGlydHlGbGFnT2Zmc2V0XSA9IGRpcnR5WWVzO1xufVxuXG5mdW5jdGlvbiBhbGxvd1ZhbHVlQ2hhbmdlKFxuICAgIGN1cnJlbnRWYWx1ZTogc3RyaW5nIHwgYm9vbGVhbiB8IG51bGwsIG5ld1ZhbHVlOiBzdHJpbmcgfCBib29sZWFuIHwgbnVsbCxcbiAgICBjdXJyZW50RGlyZWN0aXZlT3duZXI6IG51bWJlciwgbmV3RGlyZWN0aXZlT3duZXI6IG51bWJlcikge1xuICAvLyB0aGUgY29kZSBiZWxvdyByZWxpZXMgdGhlIGltcG9ydGFuY2Ugb2YgZGlyZWN0aXZlJ3MgYmVpbmcgdGllZCB0byB0aGVpclxuICAvLyBpbmRleCB2YWx1ZS4gVGhlIGluZGV4IHZhbHVlcyBmb3IgZWFjaCBkaXJlY3RpdmUgYXJlIGRlcml2ZWQgZnJvbSBiZWluZ1xuICAvLyByZWdpc3RlcmVkIGludG8gdGhlIHN0eWxpbmcgY29udGV4dCBkaXJlY3RpdmUgcmVnaXN0cnkuIFRoZSBtb3N0IGltcG9ydGFudFxuICAvLyBkaXJlY3RpdmUgaXMgdGhlIHBhcmVudCBjb21wb25lbnQgZGlyZWN0aXZlICh0aGUgdGVtcGxhdGUpIGFuZCBlYWNoIGRpcmVjdGl2ZVxuICAvLyB0aGF0IGlzIGFkZGVkIGFmdGVyIGlzIGNvbnNpZGVyZWQgbGVzcyBpbXBvcnRhbnQgdGhhbiB0aGUgcHJldmlvdXMgZW50cnkuIFRoaXNcbiAgLy8gcHJpb3JpdGl6YXRpb24gb2YgZGlyZWN0aXZlcyBlbmFibGVzIHRoZSBzdHlsaW5nIGFsZ29yaXRobSB0byBkZWNpZGUgaWYgYSBzdHlsZVxuICAvLyBvciBjbGFzcyBzaG91bGQgYmUgYWxsb3dlZCB0byBiZSB1cGRhdGVkL3JlcGxhY2VkIGluY2FzZSBhbiBlYXJsaWVyIGRpcmVjdGl2ZVxuICAvLyBhbHJlYWR5IHdyb3RlIHRvIHRoZSBleGFjdCBzYW1lIHN0eWxlLXByb3BlcnR5IG9yIGNsYXNzTmFtZSB2YWx1ZS4gSW4gb3RoZXIgd29yZHNcbiAgLy8gLi4uIHRoaXMgZGVjaWRlcyB3aGF0IHRvIGRvIGlmIGFuZCB3aGVuIHRoZXJlIGlzIGEgY29sbGlzaW9uLlxuICBpZiAoY3VycmVudFZhbHVlKSB7XG4gICAgaWYgKG5ld1ZhbHVlKSB7XG4gICAgICAvLyBpZiBhIGRpcmVjdGl2ZSBpbmRleCBpcyBsb3dlciB0aGFuIGl0IGFsd2F5cyBoYXMgcHJpb3JpdHkgb3ZlciB0aGVcbiAgICAgIC8vIHByZXZpb3VzIGRpcmVjdGl2ZSdzIHZhbHVlLi4uXG4gICAgICByZXR1cm4gbmV3RGlyZWN0aXZlT3duZXIgPD0gY3VycmVudERpcmVjdGl2ZU93bmVyO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBvbmx5IHdyaXRlIGEgbnVsbCB2YWx1ZSBpbmNhc2UgaXQncyB0aGUgc2FtZSBvd25lciB3cml0aW5nIGl0LlxuICAgICAgLy8gdGhpcyBhdm9pZHMgaGF2aW5nIGEgaGlnaGVyLXByaW9yaXR5IGRpcmVjdGl2ZSB3cml0ZSB0byBudWxsXG4gICAgICAvLyBvbmx5IHRvIGhhdmUgYSBsZXNzZXItcHJpb3JpdHkgZGlyZWN0aXZlIGNoYW5nZSByaWdodCB0byBhXG4gICAgICAvLyBub24tbnVsbCB2YWx1ZSBpbW1lZGlhdGVseSBhZnRlcndhcmRzLlxuICAgICAgcmV0dXJuIGN1cnJlbnREaXJlY3RpdmVPd25lciA9PT0gbmV3RGlyZWN0aXZlT3duZXI7XG4gICAgfVxuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG4vKipcbiAqIFRoaXMgZnVuY3Rpb24gaXMgb25seSBkZXNpZ25lZCB0byBiZSBjYWxsZWQgZm9yIGBbY2xhc3NdYCBiaW5kaW5ncyB3aGVuXG4gKiBgW25nQ2xhc3NdYCAob3Igc29tZXRoaW5nIHRoYXQgdXNlcyBgY2xhc3NgIGFzIGFuIGlucHV0KSBpcyBwcmVzZW50LiBPbmNlXG4gKiBkaXJlY3RpdmUgaG9zdCBiaW5kaW5ncyBmdWxseSB3b3JrIGZvciBgW2NsYXNzXWAgYW5kIGBbc3R5bGVdYCBpbnB1dHNcbiAqIHRoZW4gdGhpcyBjYW4gYmUgZGVsZXRlZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEluaXRpYWxDbGFzc05hbWVWYWx1ZShjb250ZXh0OiBTdHlsaW5nQ29udGV4dCk6IHN0cmluZyB7XG4gIGxldCBjbGFzc05hbWUgPSBjb250ZXh0W1N0eWxpbmdJbmRleC5DYWNoZWRDbGFzc1ZhbHVlT3JJbml0aWFsQ2xhc3NTdHJpbmddIGFzIHN0cmluZztcbiAgaWYgKGNsYXNzTmFtZSA9PSBudWxsKSB7XG4gICAgY2xhc3NOYW1lID0gJyc7XG4gICAgY29uc3QgaW5pdGlhbENsYXNzVmFsdWVzID0gY29udGV4dFtTdHlsaW5nSW5kZXguSW5pdGlhbENsYXNzVmFsdWVzUG9zaXRpb25dO1xuICAgIGZvciAobGV0IGkgPSBJbml0aWFsU3R5bGluZ1ZhbHVlc0luZGV4LktleVZhbHVlU3RhcnRQb3NpdGlvbjsgaSA8IGluaXRpYWxDbGFzc1ZhbHVlcy5sZW5ndGg7XG4gICAgICAgICBpICs9IEluaXRpYWxTdHlsaW5nVmFsdWVzSW5kZXguU2l6ZSkge1xuICAgICAgY29uc3QgaXNQcmVzZW50ID0gaW5pdGlhbENsYXNzVmFsdWVzW2kgKyAxXTtcbiAgICAgIGlmIChpc1ByZXNlbnQpIHtcbiAgICAgICAgY2xhc3NOYW1lICs9IChjbGFzc05hbWUubGVuZ3RoID8gJyAnIDogJycpICsgaW5pdGlhbENsYXNzVmFsdWVzW2ldO1xuICAgICAgfVxuICAgIH1cbiAgICBjb250ZXh0W1N0eWxpbmdJbmRleC5DYWNoZWRDbGFzc1ZhbHVlT3JJbml0aWFsQ2xhc3NTdHJpbmddID0gY2xhc3NOYW1lO1xuICB9XG4gIHJldHVybiBjbGFzc05hbWU7XG59XG4iXX0=