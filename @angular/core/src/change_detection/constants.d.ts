/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * The strategy that the default change detector uses to detect changes.
 * When set, takes effect the next time change detection is triggered.
 *
 * @publicApi
 */
export declare enum ChangeDetectionStrategy {
    /**
     * Use the `CheckOnce` strategy, meaning that automatic change detection is deactivated
     * until reactivated by setting the strategy to `Default` (`CheckAlways`).
     * Change detection can still be explicitly invoked.
     */
    OnPush = 0,
    /**
     * Use the default `CheckAlways` strategy, in which change detection is automatic until
     * explicitly deactivated.
     */
    Default = 1
}
/**
 * Defines the possible states of the default change detector.
 * @see `ChangeDetectorRef`
 */
export declare enum ChangeDetectorStatus {
    /**
     * A state in which, after calling `detectChanges()`, the change detector
     * state becomes `Checked`, and must be explicitly invoked or reactivated.
     */
    CheckOnce = 0,
    /**
     * A state in which change detection is skipped until the change detector mode
     * becomes `CheckOnce`.
     */
    Checked = 1,
    /**
     * A state in which change detection continues automatically until explicitly
     * deactivated.
     */
    CheckAlways = 2,
    /**
     * A state in which a change detector sub tree is not a part of the main tree and
     * should be skipped.
     */
    Detached = 3,
    /**
     * Indicates that the change detector encountered an error checking a binding
     * or calling a directive lifecycle method and is now in an inconsistent state. Change
     * detectors in this state do not detect changes.
     */
    Errored = 4,
    /**
     * Indicates that the change detector has been destroyed.
     */
    Destroyed = 5
}
/**
 * Reports whether a given strategy is currently the default for change detection.
 * @param changeDetectionStrategy The strategy to check.
 * @returns True if the given strategy is the current default, false otherwise.
 * @see `ChangeDetectorStatus`
 * @see `ChangeDetectorRef`
 */
export declare function isDefaultChangeDetectionStrategy(changeDetectionStrategy: ChangeDetectionStrategy): boolean;
